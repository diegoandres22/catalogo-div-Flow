"use client";

import { useState } from "react";

export function RevertirRespaldo() {
  const [estado, setEstado] = useState<"inicial" | "cargando" | "hecho">("inicial");
  const [mensaje, setMensaje] = useState<string | null>(null);

  async function revertir() {
    const confirmado = window.confirm(
      "Esto reemplaza el catálogo publicado por la versión anterior guardada como respaldo. ¿Continuar?",
    );
    if (!confirmado) return;

    setEstado("cargando");
    setMensaje(null);
    try {
      const resp = await fetch("/api/admin/revert", { method: "POST" });
      const data = await resp.json();
      if (!resp.ok || !data.ok) {
        setMensaje(data.mensaje ?? "No se pudo revertir al respaldo.");
        setEstado("inicial");
        return;
      }
      setMensaje(`Revertido: ${data.totalProductos} productos publicados de nuevo.`);
      setEstado("hecho");
    } catch {
      setMensaje("No se pudo conectar con el servidor.");
      setEstado("inicial");
    }
  }

  return (
    <div className="mt-6 rounded-2xl border border-dashed border-ink-300 p-4 text-center">
      <p className="text-xs text-ink-500">
        ¿El último reemplazo tuvo un error? Podés volver a la versión anterior del catálogo.
      </p>
      <button
        type="button"
        onClick={revertir}
        disabled={estado === "cargando"}
        className="mt-2 text-sm font-medium text-accent-700 underline-offset-2 hover:underline disabled:opacity-50"
      >
        {estado === "cargando" ? "Revirtiendo…" : "Revertir al respaldo anterior"}
      </button>
      {mensaje && <p className="mt-2 text-xs text-ink-700">{mensaje}</p>}
    </div>
  );
}
