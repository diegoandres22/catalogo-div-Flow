"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function PaginaLoginAdmin() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [cargando, setCargando] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setCargando(true);
    try {
      const resp = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await resp.json();
      if (!resp.ok || !data.ok) {
        toast.error(data.mensaje ?? "No se pudo iniciar sesión.");
        setCargando(false);
        return;
      }
      toast.success("Sesión iniciada");
      router.push("/admin");
      router.refresh();
    } catch {
      toast.error("No se pudo conectar con el servidor.");
      setCargando(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-1 items-center justify-center bg-paper px-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm rounded-2xl border border-ink-200 bg-paper-raised p-6 shadow-sm sm:p-8"
      >
        <h1 className="text-lg font-semibold text-ink-900">Panel de administración</h1>
        <p className="mt-1 text-sm text-ink-500">Ingresá la contraseña para cargar el catálogo.</p>

        <label htmlFor="password" className="mt-6 mb-1.5 block text-sm font-medium text-ink-900">
          Contraseña
        </label>
        <input
          id="password"
          type="password"
          autoFocus
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-ink-200 px-3 py-2.5 text-sm text-ink-900 focus:border-accent-600"
        />

        <button
          type="submit"
          disabled={cargando || !password}
          className="mt-5 w-full rounded-full bg-ink-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-ink-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {cargando ? "Ingresando…" : "Ingresar"}
        </button>
      </form>
    </main>
  );
}
