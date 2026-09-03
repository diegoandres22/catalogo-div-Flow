"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import type { ResumenImportacion } from "@/lib/types";
import { ResumenPrevio } from "./ResumenPrevio";

type Origen = "csv" | "xlsx" | "sheet";
type Estado = "inicial" | "procesando" | "previsualizando" | "confirmando" | "confirmado" | "rechazado";

export function CargadorCatalogo() {
  const [origen, setOrigen] = useState<Origen>("xlsx");
  const [url, setUrl] = useState("");
  const [estado, setEstado] = useState<Estado>("inicial");
  const [resumen, setResumen] = useState<ResumenImportacion | null>(null);
  const [nombreArchivo, setNombreArchivo] = useState<string | null>(null);
  const inputArchivoRef = useRef<HTMLInputElement>(null);

  async function subir(archivo: File | null) {
    setEstado("procesando");

    const formData = new FormData();
    formData.set("tipo", origen);
    if (origen === "sheet") {
      formData.set("url", url.trim());
    } else if (archivo) {
      formData.set("archivo", archivo);
      setNombreArchivo(archivo.name);
    } else {
      toast.error("Seleccioná un archivo primero.");
      setEstado("inicial");
      return;
    }

    const idCarga = toast.loading("Analizando archivo…");

    try {
      const resp = await fetch("/api/admin/upload", { method: "POST", body: formData });
      const data = await resp.json();

      if (!resp.ok) {
        if (data.resumen) {
          setResumen(data.resumen as ResumenImportacion);
          setEstado("rechazado");
          toast.error("Archivo rechazado — revisá el detalle.", { id: idCarga });
        } else {
          toast.error(data.mensaje ?? "No se pudo procesar el archivo.", { id: idCarga });
          setEstado("inicial");
        }
        return;
      }

      setResumen(data.resumen as ResumenImportacion);
      setEstado("previsualizando");
      toast.success("Archivo analizado. Revisá el resumen antes de confirmar.", { id: idCarga });
    } catch {
      toast.error("No se pudo conectar con el servidor.", { id: idCarga });
      setEstado("inicial");
    }
  }

  async function confirmar() {
    setEstado("confirmando");
    const idCarga = toast.loading("Reemplazando catálogo…");
    try {
      const resp = await fetch("/api/admin/confirm", { method: "POST" });
      const data = await resp.json();
      if (!resp.ok || !data.ok) {
        toast.error(data.mensaje ?? "No se pudo confirmar el reemplazo.", { id: idCarga });
        setEstado("previsualizando");
        return;
      }
      toast.success("Catálogo reemplazado y publicado.", { id: idCarga });
      setEstado("confirmado");
    } catch {
      toast.error("No se pudo conectar con el servidor.", { id: idCarga });
      setEstado("previsualizando");
    }
  }

  function cancelar() {
    setResumen(null);
    setEstado("inicial");
    setNombreArchivo(null);
    if (inputArchivoRef.current) inputArchivoRef.current.value = "";
  }

  function nuevaCarga() {
    setResumen(null);
    setEstado("inicial");
    setNombreArchivo(null);
    setUrl("");
    if (inputArchivoRef.current) inputArchivoRef.current.value = "";
  }

  if (estado === "confirmado" && resumen) {
    return (
      <div className="rounded-2xl border border-success-600/30 bg-success-100 p-6 text-center">
        <h2 className="text-base font-semibold text-ink-900">Catálogo reemplazado</h2>
        <p className="mt-1 text-sm text-ink-700">
          {resumen.totalProductos} productos y {resumen.totalVariantes} variantes ya están publicados.
        </p>
        <button
          type="button"
          onClick={nuevaCarga}
          className="mt-4 rounded-full bg-ink-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-ink-700"
        >
          Cargar otro archivo
        </button>
      </div>
    );
  }

  if ((estado === "previsualizando" || estado === "confirmando") && resumen) {
    return (
      <ResumenPrevio resumen={resumen} onConfirmar={confirmar} onCancelar={cancelar} confirmando={estado === "confirmando"} />
    );
  }

  if (estado === "rechazado" && resumen) {
    return (
      <div className="rounded-2xl border border-danger-600/30 bg-paper-raised p-5 sm:p-6">
        <h2 className="text-base font-semibold text-danger-600">Archivo rechazado</h2>
        <p className="mt-1 text-sm text-ink-700">{resumen.mensaje}</p>

        {resumen.columnasFaltantes && resumen.columnasFaltantes.length > 0 && (
          <ul className="mt-3 list-disc pl-5 text-sm text-ink-700">
            {resumen.columnasFaltantes.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        )}

        {resumen.errores.length > 0 && (
          <div className="mt-4 max-h-56 overflow-y-auto rounded-lg border border-ink-200">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-ink-100 text-ink-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Fila</th>
                  <th className="px-3 py-2 font-medium">Modelo / Color</th>
                  <th className="px-3 py-2 font-medium">Motivo</th>
                </tr>
              </thead>
              <tbody>
                {resumen.errores.map((e, i) => (
                  <tr key={i} className="border-t border-ink-200">
                    <td className="px-3 py-2 text-ink-500">{e.fila ?? "—"}</td>
                    <td className="px-3 py-2 text-ink-900">{[e.modelo, e.color].filter(Boolean).join(" / ") || "—"}</td>
                    <td className="px-3 py-2 text-ink-700">{e.motivo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="mt-4 text-xs text-ink-500">El catálogo publicado no fue modificado.</p>

        <button
          type="button"
          onClick={nuevaCarga}
          className="mt-5 rounded-full bg-ink-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-ink-700"
        >
          Intentar con otro archivo
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-ink-200 bg-paper-raised p-5 sm:p-6">
      <h2 className="text-base font-semibold text-ink-900">Cargar catálogo</h2>
      <p className="mt-1 text-sm text-ink-500">
        Subí el archivo exportado de SAP (CSV o XLSX) o pegá el link de un Google Sheets publicado como CSV.
      </p>

      <div className="mt-5 flex gap-2">
        {(
          [
            ["xlsx", "Archivo Excel"],
            ["csv", "Archivo CSV"],
            ["sheet", "Link de Google Sheets"],
          ] as [Origen, string][]
        ).map(([valor, etiqueta]) => (
          <button
            key={valor}
            type="button"
            onClick={() => setOrigen(valor)}
            className={`rounded-full border px-3.5 py-2 text-sm font-medium transition-colors ${
              origen === valor ? "border-ink-900 bg-ink-900 text-white" : "border-ink-200 text-ink-700"
            }`}
          >
            {etiqueta}
          </button>
        ))}
      </div>

      <div className="mt-5">
        {origen === "sheet" ? (
          <>
            <label htmlFor="url-sheet" className="mb-1.5 block text-sm font-medium text-ink-900">
              Link publicado como CSV
            </label>
            <input
              id="url-sheet"
              type="url"
              placeholder="https://docs.google.com/spreadsheets/.../pub?output=csv"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full rounded-lg border border-ink-200 px-3 py-2.5 text-sm focus:border-accent-600"
            />
          </>
        ) : (
          <>
            <label htmlFor="archivo" className="mb-1.5 block text-sm font-medium text-ink-900">
              Archivo {origen === "xlsx" ? "XLSX" : "CSV"}
            </label>
            <input
              id="archivo"
              ref={inputArchivoRef}
              type="file"
              accept={origen === "xlsx" ? ".xlsx" : ".csv"}
              onChange={(e) => setNombreArchivo(e.target.files?.[0]?.name ?? null)}
              className="block w-full text-sm text-ink-700 file:mr-3 file:rounded-full file:border-0 file:bg-ink-100 file:px-3.5 file:py-2 file:text-sm file:font-medium file:text-ink-900 hover:file:bg-ink-200"
            />
            {nombreArchivo && <p className="mt-1.5 text-xs text-ink-500">Seleccionado: {nombreArchivo}</p>}
          </>
        )}
      </div>

      <button
        type="button"
        disabled={estado === "procesando"}
        onClick={() => subir(inputArchivoRef.current?.files?.[0] ?? null)}
        className="mt-5 w-full rounded-full bg-ink-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-ink-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
      >
        {estado === "procesando" ? "Procesando…" : "Analizar archivo"}
      </button>
    </div>
  );
}
