"use client";

import { useEffect, useId, useState } from "react";
import { toast } from "sonner";
import { logError } from "@/lib/logger";
import type { GuiaTallas } from "@/lib/types";

// La guía de tallas es fija para todo el calzado del catálogo — no cambia
// con cada carga de Excel, así que se administra acá, aparte, en vez de
// depender de una columna del archivo (ver la nota en lib/transform.ts de
// versiones anteriores / lib/blob.ts). Se sube una sola vez y se actualiza
// solo si hace falta cambiar la imagen.
interface CampoEstado {
  urlActual: string | null;
  link: string;
  archivo: File | null;
}

const VACIO: CampoEstado = { urlActual: null, link: "", archivo: null };

export function GuiaTallasConfig() {
  const [instrucciones, setInstrucciones] = useState<CampoEstado>(VACIO);
  const [tabla, setTabla] = useState<CampoEstado>(VACIO);
  const [cargandoInicial, setCargandoInicial] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const idInstrucciones = useId();
  const idTabla = useId();

  useEffect(() => {
    let cancelado = false;
    (async () => {
      try {
        const resp = await fetch("/api/admin/guia-tallas");
        const data = (await resp.json()) as { ok: boolean; guia?: GuiaTallas; mensaje?: string };
        if (!resp.ok || !data.ok || !data.guia) {
          throw new Error(data.mensaje ?? "No se pudo cargar la guía de tallas actual.");
        }
        if (!cancelado) {
          setInstrucciones({ urlActual: data.guia.instrucciones, link: "", archivo: null });
          setTabla({ urlActual: data.guia.tabla, link: "", archivo: null });
        }
      } catch (err) {
        logError("GuiaTallasConfig.cargar", err, "No se pudo leer la configuración actual de la guía de tallas desde Vercel Blob.");
        if (!cancelado) toast.error("No se pudo cargar la guía de tallas actual.");
      } finally {
        if (!cancelado) setCargandoInicial(false);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, []);

  async function guardar() {
    setGuardando(true);
    try {
      const formData = new FormData();
      if (instrucciones.archivo) formData.set("instruccionesArchivo", instrucciones.archivo);
      else if (instrucciones.link.trim()) formData.set("instruccionesLink", instrucciones.link.trim());
      if (tabla.archivo) formData.set("tablaArchivo", tabla.archivo);
      else if (tabla.link.trim()) formData.set("tablaLink", tabla.link.trim());

      const resp = await fetch("/api/admin/guia-tallas", { method: "POST", body: formData });
      const data = (await resp.json()) as { ok: boolean; guia?: GuiaTallas; mensaje?: string };
      if (!resp.ok || !data.ok || !data.guia) {
        toast.error(data.mensaje ?? "No se pudo guardar la guía de tallas.");
        return;
      }
      setInstrucciones({ urlActual: data.guia.instrucciones, link: "", archivo: null });
      setTabla({ urlActual: data.guia.tabla, link: "", archivo: null });
      toast.success("Guía de tallas actualizada.");
    } catch (err) {
      logError("GuiaTallasConfig.guardar", err, "No se pudo conectar con el servidor — revisá tu conexión a internet y probá de nuevo.");
      toast.error("No se pudo conectar con el servidor.");
    } finally {
      setGuardando(false);
    }
  }

  const hayCambiosSinGuardar = Boolean(instrucciones.archivo || instrucciones.link.trim() || tabla.archivo || tabla.link.trim());

  return (
    <div className="mt-6 rounded-2xl border border-ink-200 p-4">
      <h2 className="text-sm font-semibold text-ink-900">Guía de tallas</h2>
      <p className="mt-1 text-xs text-ink-500">
        Se muestra en todo producto de calzado, en el link &quot;Ver guía de tallas&quot;. Subí una imagen o pegá un
        link — no hace falta volver a cargar esto con cada catálogo nuevo.
      </p>

      {cargandoInicial ? (
        <div className="mt-4 space-y-3" aria-label="Cargando guía de tallas actual" role="status">
          <div className="skeleton h-16 rounded-lg" />
          <div className="skeleton h-16 rounded-lg" />
        </div>
      ) : (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <CampoGuia
            id={idInstrucciones}
            etiqueta="Instrucciones (cómo medir)"
            estado={instrucciones}
            onCambiar={setInstrucciones}
          />
          <CampoGuia id={idTabla} etiqueta="Tabla de equivalencias" estado={tabla} onCambiar={setTabla} />
        </div>
      )}

      <button
        type="button"
        onClick={guardar}
        disabled={guardando || cargandoInicial || !hayCambiosSinGuardar}
        className="mt-4 rounded-full bg-ink-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-ink-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {guardando ? "Guardando…" : "Guardar guía de tallas"}
      </button>
    </div>
  );
}

function CampoGuia({
  id,
  etiqueta,
  estado,
  onCambiar,
}: {
  id: string;
  etiqueta: string;
  estado: CampoEstado;
  onCambiar: (v: CampoEstado) => void;
}) {
  return (
    <div className="rounded-xl border border-ink-200 p-3">
      <label htmlFor={id} className="mb-1 block text-xs font-medium text-ink-900">
        {etiqueta}
      </label>

      {estado.urlActual && !estado.archivo && !estado.link.trim() && (
        <a
          href={estado.urlActual}
          target="_blank"
          rel="noopener noreferrer"
          className="mb-2 block truncate text-xs text-accent-700 underline-offset-2 hover:underline"
        >
          Ver imagen actual
        </a>
      )}
      {!estado.urlActual && !estado.archivo && !estado.link.trim() && (
        <p className="mb-2 text-xs text-ink-500">Sin configurar todavía.</p>
      )}
      {estado.archivo && <p className="mb-2 truncate text-xs text-ink-700">Nueva imagen: {estado.archivo.name}</p>}

      <input
        id={id}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={(e) => onCambiar({ ...estado, archivo: e.target.files?.[0] ?? null, link: "" })}
        className="block w-full text-xs text-ink-700 file:mr-2 file:rounded-full file:border-0 file:bg-ink-100 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-ink-900 hover:file:bg-ink-200"
      />

      <div className="my-2 flex items-center gap-2 text-[11px] text-ink-500">
        <div className="h-px flex-1 bg-ink-200" />o pegá un link
        <div className="h-px flex-1 bg-ink-200" />
      </div>

      <input
        type="url"
        inputMode="url"
        placeholder="https://…"
        value={estado.link}
        onChange={(e) => onCambiar({ ...estado, link: e.target.value, archivo: null })}
        className="w-full rounded-lg border border-ink-200 px-3 py-1.5 text-xs text-ink-900 placeholder:text-ink-500 focus:border-accent-600"
      />
    </div>
  );
}
