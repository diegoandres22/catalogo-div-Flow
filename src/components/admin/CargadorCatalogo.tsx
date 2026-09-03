"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import type { ResumenImportacion } from "@/lib/types";
import { ResumenPrevio } from "./ResumenPrevio";
import { GuiaColumnas } from "./GuiaColumnas";
import { TablaErrores } from "./TablaErrores";

type Origen = "csv" | "xlsx" | "sheet";
type Estado = "inicial" | "procesando" | "previsualizando" | "confirmando" | "confirmado" | "rechazado";

const TAMANO_MAXIMO_BYTES = 4.4 * 1024 * 1024; // margen bajo el límite de ~4.5 MB de Vercel
const EXTENSIONES: Record<"csv" | "xlsx", string[]> = {
  csv: [".csv"],
  xlsx: [".xlsx", ".xls"],
};

function extensionValida(nombre: string, origen: "csv" | "xlsx"): boolean {
  const nombreLower = nombre.toLowerCase();
  return EXTENSIONES[origen].some((ext) => nombreLower.endsWith(ext));
}

export function CargadorCatalogo() {
  const [origen, setOrigen] = useState<Origen>("xlsx");
  const [url, setUrl] = useState("");
  const [estado, setEstado] = useState<Estado>("inicial");
  const [resumen, setResumen] = useState<ResumenImportacion | null>(null);
  const [nombreArchivo, setNombreArchivo] = useState<string | null>(null);
  const inputArchivoRef = useRef<HTMLInputElement>(null);

  async function subir(archivo: File | null) {
    if (origen === "sheet") {
      if (!url.trim()) {
        toast.error("Pegá el link de Google Sheets antes de continuar.");
        return;
      }
      if (!/^https:\/\//.test(url.trim())) {
        toast.error("El link tiene que empezar con https://.");
        return;
      }
    } else {
      if (!archivo) {
        toast.error("Seleccioná un archivo primero.");
        return;
      }
      if (!extensionValida(archivo.name, origen)) {
        toast.error(
          `Elegiste "${origen === "xlsx" ? "Archivo Excel" : "Archivo CSV"}" pero el archivo es "${archivo.name}". Cambiá el origen o el archivo.`,
        );
        return;
      }
      if (archivo.size > TAMANO_MAXIMO_BYTES) {
        toast.error(
          `El archivo pesa ${(archivo.size / (1024 * 1024)).toFixed(1)} MB — el límite es ~4.4 MB. Exportá un archivo más chico o dividilo.`,
        );
        return;
      }
    }

    setEstado("procesando");

    const formData = new FormData();
    formData.set("tipo", origen);
    if (origen === "sheet") {
      formData.set("url", url.trim());
    } else if (archivo) {
      formData.set("archivo", archivo);
      setNombreArchivo(archivo.name);
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
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-danger-100 text-danger-600">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M12 9v4m0 4h.01M10.29 3.86l-8.18 14.18A2 2 0 0 0 3.82 21h16.36a2 2 0 0 0 1.71-3l-8.18-14.14a2 2 0 0 0-3.42 0z" />
            </svg>
          </span>
          <div>
            <h2 className="text-base font-semibold text-danger-600">Archivo rechazado</h2>
            <p className="mt-1 text-sm text-ink-700">{resumen.mensaje}</p>
          </div>
        </div>

        {resumen.columnasFaltantes && resumen.columnasFaltantes.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-500">Columnas que faltan</p>
            <div className="flex flex-wrap gap-1.5">
              {resumen.columnasFaltantes.map((c) => (
                <span
                  key={c}
                  className="rounded-full border border-danger-600/30 bg-danger-100 px-2.5 py-1 font-mono text-xs font-medium text-danger-600"
                >
                  {c}
                </span>
              ))}
            </div>
            <p className="mt-2 text-xs text-ink-500">
              Revisá que el encabezado del archivo tenga exactamente estos nombres de columna (misma escritura,
              sin espacios de más) — ver la guía más abajo.
            </p>
          </div>
        )}

        {resumen.errores.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-500">Filas con error</p>
            <TablaErrores errores={resumen.errores} />
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

        <div className="mt-6 border-t border-ink-200 pt-5">
          <GuiaColumnas />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <GuiaColumnas />

      <div className="rounded-2xl border border-ink-200 bg-paper-raised p-5 sm:p-6">
        <h2 className="text-base font-semibold text-ink-900">Cargar catálogo</h2>

        <div className="mt-5">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-500">1. Origen de los datos</p>
          <div className="flex flex-wrap gap-2">
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
        </div>

        <div className="mt-5">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-500">2. Archivo</p>
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
              <p className="mt-1.5 text-xs text-ink-500">
                En Google Sheets: Archivo → Compartir → Publicar en la web → formato CSV. Pegá ese link, no el de
                edición normal.
              </p>
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
                accept={origen === "xlsx" ? ".xlsx,.xls" : ".csv"}
                onChange={(e) => setNombreArchivo(e.target.files?.[0]?.name ?? null)}
                className="block w-full text-sm text-ink-700 file:mr-3 file:rounded-full file:border-0 file:bg-ink-100 file:px-3.5 file:py-2 file:text-sm file:font-medium file:text-ink-900 hover:file:bg-ink-200"
              />
              {nombreArchivo && <p className="mt-1.5 text-xs text-ink-500">Seleccionado: {nombreArchivo}</p>}
              <p className="mt-1.5 text-xs text-ink-500">Tamaño máximo ~4.4 MB. Una fila por talla+color.</p>
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
    </div>
  );
}
