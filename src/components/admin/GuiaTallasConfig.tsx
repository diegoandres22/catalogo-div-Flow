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
  // Nunca se muestran los inputs de archivo/link hasta que el admin pide
  // "Cambiar"/"Subir" a propósito — evita la confusión de un campo que
  // parece un formulario en blanco cuando en realidad ya hay una imagen
  // cargada (ver "Ver imagen actual" en la versión anterior de este panel).
  editando: boolean;
  // "Eliminar" queda pendiente hasta guardar (mismo patrón que
  // ColeccionesConfig: confirmarEliminar → toast con acción, no un
  // window.confirm) — se puede deshacer sin haber tocado nada del servidor.
  eliminar: boolean;
  link: string;
  archivo: File | null;
}

const VACIO: CampoEstado = { urlActual: null, editando: false, eliminar: false, link: "", archivo: null };

/** Mismo patrón que ColeccionesConfig.confirmarEliminar: un toast con acción, no un window.confirm. */
function confirmarEliminar(etiqueta: string, alConfirmar: () => void) {
  toast(`¿Eliminar "${etiqueta}"?`, {
    description: "Se quita al guardar — hasta entonces podés deshacerlo.",
    duration: Infinity,
    action: { label: "Eliminar", onClick: () => alConfirmar() },
    cancel: { label: "Cancelar", onClick: () => {} },
  });
}

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
          setInstrucciones({ urlActual: data.guia.instrucciones, editando: false, eliminar: false, link: "", archivo: null });
          setTabla({ urlActual: data.guia.tabla, editando: false, eliminar: false, link: "", archivo: null });
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
      if (instrucciones.eliminar) formData.set("instruccionesEliminar", "1");
      else if (instrucciones.archivo) formData.set("instruccionesArchivo", instrucciones.archivo);
      else if (instrucciones.link.trim()) formData.set("instruccionesLink", instrucciones.link.trim());
      if (tabla.eliminar) formData.set("tablaEliminar", "1");
      else if (tabla.archivo) formData.set("tablaArchivo", tabla.archivo);
      else if (tabla.link.trim()) formData.set("tablaLink", tabla.link.trim());

      const resp = await fetch("/api/admin/guia-tallas", { method: "POST", body: formData });
      const data = (await resp.json()) as { ok: boolean; guia?: GuiaTallas; mensaje?: string };
      if (!resp.ok || !data.ok || !data.guia) {
        toast.error(data.mensaje ?? "No se pudo guardar la guía de tallas.");
        return;
      }
      setInstrucciones({ urlActual: data.guia.instrucciones, editando: false, eliminar: false, link: "", archivo: null });
      setTabla({ urlActual: data.guia.tabla, editando: false, eliminar: false, link: "", archivo: null });
      toast.success("Guía de tallas actualizada.");
    } catch (err) {
      logError("GuiaTallasConfig.guardar", err, "No se pudo conectar con el servidor — revisá tu conexión a internet y probá de nuevo.");
      toast.error("No se pudo conectar con el servidor.");
    } finally {
      setGuardando(false);
    }
  }

  const hayCambiosSinGuardar = Boolean(
    instrucciones.archivo || instrucciones.link.trim() || instrucciones.eliminar || tabla.archivo || tabla.link.trim() || tabla.eliminar,
  );

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

function MiniaturaGuia({ src, etiqueta }: { src: string; etiqueta: string }) {
  const [conError, setConError] = useState(false);
  return (
    // <img> normal (no next/image): un link pegado a mano puede ser
    // cualquier dominio, y next/image tira error en runtime si el host no
    // está en next.config.ts — mismo motivo que ImagenProducto en
    // ajuste="natural".
    // eslint-disable-next-line @next/next/no-img-element -- ver nota arriba: el dominio de un link pegado a mano puede no estar en next.config.ts
    <img
      src={conError ? "/imagen-no-disponible.svg" : src}
      alt={`Vista previa actual — ${etiqueta}`}
      onError={() => setConError(true)}
      className="h-16 w-16 shrink-0 rounded-lg border border-ink-200 bg-ink-100 object-cover"
    />
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
  function empezarEdicion() {
    onCambiar({ ...estado, editando: true, eliminar: false });
  }

  function cancelarEdicion() {
    onCambiar({ ...estado, editando: false, archivo: null, link: "" });
  }

  return (
    <div className="rounded-xl border border-ink-200 p-3">
      <label htmlFor={id} className="mb-2 block text-xs font-medium text-ink-900">
        {etiqueta}
      </label>

      {estado.eliminar ? (
        // Pendiente de eliminar: nada se borró todavía en el servidor, solo
        // al presionar "Guardar guía de tallas" más abajo — se puede
        // deshacer libremente hasta entonces.
        <div className="flex items-center justify-between gap-2 rounded-lg border border-dashed border-danger-600/40 bg-danger-100/60 px-3 py-2.5">
          <span className="text-xs text-danger-600">Se va a eliminar al guardar</span>
          <button
            type="button"
            onClick={() => onCambiar({ ...estado, eliminar: false })}
            className="shrink-0 text-xs font-medium text-ink-900 underline-offset-2 hover:underline"
          >
            Deshacer
          </button>
        </div>
      ) : estado.editando ? (
        <>
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

          <button
            type="button"
            onClick={cancelarEdicion}
            className="mt-2 text-xs font-medium text-ink-500 underline-offset-2 hover:underline"
          >
            Cancelar
          </button>
        </>
      ) : estado.urlActual ? (
        // Vista de lectura: miniatura de la imagen ya cargada, no un link de
        // texto ambiguo — de un vistazo se ve QUÉ hay configurado, no solo
        // que "algo" hay.
        <div className="flex items-center gap-3">
          <MiniaturaGuia src={estado.urlActual} etiqueta={etiqueta} />
          <div className="flex flex-col items-start gap-1.5">
            <button
              type="button"
              onClick={empezarEdicion}
              className="text-xs font-medium text-ink-900 underline-offset-2 hover:underline"
            >
              Cambiar
            </button>
            <button
              type="button"
              onClick={() => confirmarEliminar(etiqueta, () => onCambiar({ ...estado, eliminar: true }))}
              className="text-xs font-medium text-danger-600 underline-offset-2 hover:underline"
            >
              Eliminar
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-ink-500">Sin configurar todavía.</p>
          <button
            type="button"
            onClick={empezarEdicion}
            className="shrink-0 rounded-full border border-ink-200 px-3 py-1.5 text-xs font-medium text-ink-900 transition-colors hover:border-ink-900"
          >
            Subir imagen
          </button>
        </div>
      )}
    </div>
  );
}
