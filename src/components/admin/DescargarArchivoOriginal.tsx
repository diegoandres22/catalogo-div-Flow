"use client";

import { useState } from "react";
import { toast } from "sonner";
import { logError } from "@/lib/logger";

// Descarga el archivo (.csv/.xlsx) que se usó para cargar el catálogo
// actualmente publicado — así el admin no depende de conservar su propia
// copia local del último archivo subido.
export function DescargarArchivoOriginal() {
  const [descargando, setDescargando] = useState(false);

  async function descargar() {
    setDescargando(true);
    try {
      const resp = await fetch("/api/admin/original");
      if (!resp.ok) {
        const data = await resp.json().catch(() => null);
        toast.error(data?.mensaje ?? "No se pudo descargar el archivo.");
        return;
      }

      const disposicion = resp.headers.get("Content-Disposition") ?? "";
      const nombre = /filename="([^"]+)"/.exec(disposicion)?.[1] ?? "catalogo";

      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const enlace = document.createElement("a");
      enlace.href = url;
      enlace.download = nombre;
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      logError("DescargarArchivoOriginal.descargar", err, "No se pudo conectar con el servidor — revisá tu conexión a internet y probá de nuevo.");
      toast.error("No se pudo conectar con el servidor.");
    } finally {
      setDescargando(false);
    }
  }

  return (
    <div className="mt-6 rounded-2xl border border-dashed border-ink-300 p-4 text-center">
      <p className="text-xs text-ink-500">Descargá el archivo que se usó para cargar el catálogo actual.</p>
      <button
        type="button"
        onClick={descargar}
        disabled={descargando}
        className="mt-2 text-sm font-medium text-accent-700 underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
      >
        {descargando ? "Descargando…" : "Descargar archivo actual (.xlsx/.csv)"}
      </button>
    </div>
  );
}
