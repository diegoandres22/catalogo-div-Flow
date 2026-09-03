"use client";

import { useState } from "react";
import { toast } from "sonner";
import { logError } from "@/lib/logger";

interface Props {
  // true mientras otra operación crítica (confirmar reemplazo) está en
  // curso — bloquea "Revertir" para que las dos no escriban catalogo.json
  // al mismo tiempo (ver PanelAdmin.tsx).
  bloqueadoPorOtraOperacion?: boolean;
  onOperacionCriticaChange?: (enCurso: boolean) => void;
}

export function RevertirRespaldo({ bloqueadoPorOtraOperacion, onOperacionCriticaChange }: Props) {
  const [estado, setEstado] = useState<"inicial" | "cargando" | "hecho">("inicial");

  function pedirConfirmacion() {
    toast("¿Revertir al respaldo anterior?", {
      description: "Esto reemplaza el catálogo publicado por la versión anterior guardada como respaldo.",
      duration: 12000,
      action: {
        label: "Revertir",
        onClick: () => revertir(),
      },
      actionButtonStyle: { background: "var(--color-danger-600)", color: "#fff" },
      cancel: {
        label: "Cancelar",
        onClick: () => {},
      },
    });
  }

  async function revertir() {
    setEstado("cargando");
    onOperacionCriticaChange?.(true);
    const idCarga = toast.loading("Revirtiendo al respaldo…");
    try {
      const resp = await fetch("/api/admin/revert", { method: "POST" });
      const data = await resp.json();
      if (!resp.ok || !data.ok) {
        toast.error(data.mensaje ?? "No se pudo revertir al respaldo.", { id: idCarga });
        setEstado("inicial");
        return;
      }
      toast.success(`Revertido: ${data.totalProductos} productos publicados de nuevo.`, { id: idCarga });
      setEstado("hecho");
    } catch (err) {
      logError("RevertirRespaldo.revertir", err, "No se pudo llegar al servidor — revisá tu conexión a internet y probá de nuevo.");
      toast.error("No se pudo conectar con el servidor.", { id: idCarga });
      setEstado("inicial");
    } finally {
      onOperacionCriticaChange?.(false);
    }
  }

  return (
    <div className="mt-6 rounded-2xl border border-dashed border-ink-300 p-4 text-center">
      <p className="text-xs text-ink-500">
        ¿El último reemplazo tuvo un error? Podés volver a la versión anterior del catálogo.
      </p>
      <button
        type="button"
        onClick={pedirConfirmacion}
        disabled={estado === "cargando" || bloqueadoPorOtraOperacion}
        title={bloqueadoPorOtraOperacion ? "Esperá a que termine la otra operación en curso." : undefined}
        className="mt-2 text-sm font-medium text-accent-700 underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
      >
        {estado === "cargando" ? "Revirtiendo…" : "Revertir al respaldo anterior"}
      </button>
    </div>
  );
}
