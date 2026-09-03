"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { logError } from "@/lib/logger";

export function AdminHeader() {
  const router = useRouter();
  const [saliendo, setSaliendo] = useState(false);

  async function salir() {
    setSaliendo(true);
    try {
      await fetch("/api/admin/logout", { method: "POST" });
      router.push("/admin/login");
      router.refresh();
    } catch (err) {
      logError("AdminHeader.salir", err, "No se pudo llegar al servidor para cerrar sesión — revisá tu conexión a internet y probá de nuevo.");
      toast.error("No se pudo cerrar sesión. Probá de nuevo.");
      setSaliendo(false);
    }
  }

  return (
    <header className="border-b border-ink-200 bg-paper-raised">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3.5 sm:px-6">
        <span className="text-base font-semibold tracking-tight text-ink-900">Panel de administración</span>
        <button
          type="button"
          onClick={salir}
          disabled={saliendo}
          className="text-sm font-medium text-ink-500 hover:text-ink-900 disabled:opacity-50"
        >
          Cerrar sesión
        </button>
      </div>
    </header>
  );
}
