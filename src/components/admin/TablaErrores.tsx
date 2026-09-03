"use client";

import { useState } from "react";
import type { ErrorImportacion } from "@/lib/types";

const MAX_FILAS_VISIBLES = 50;

export function TablaErrores({ errores }: { errores: ErrorImportacion[] }) {
  const grupos = agruparPorMotivo(errores);

  return (
    <div className="flex flex-col gap-2.5">
      {grupos.map((g) => (
        <GrupoError key={g.motivo} motivo={g.motivo} items={g.items} />
      ))}
    </div>
  );
}

function agruparPorMotivo(errores: ErrorImportacion[]) {
  const mapa = new Map<string, ErrorImportacion[]>();
  for (const e of errores) {
    const arr = mapa.get(e.motivo);
    if (arr) arr.push(e);
    else mapa.set(e.motivo, [e]);
  }
  return Array.from(mapa.entries())
    .map(([motivo, items]) => ({ motivo, items }))
    .sort((a, b) => b.items.length - a.items.length);
}

function GrupoError({ motivo, items }: { motivo: string; items: ErrorImportacion[] }) {
  const [abierto, setAbierto] = useState(items.length <= 5);
  const visibles = items.slice(0, MAX_FILAS_VISIBLES);
  const restantes = items.length - visibles.length;

  return (
    <div className="rounded-lg border border-ink-200">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left"
      >
        <span className="flex items-center gap-2 text-sm">
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-danger-100 px-1.5 text-xs font-semibold text-danger-600">
            {items.length}
          </span>
          <span className="text-ink-900">{motivo}</span>
        </span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`shrink-0 text-ink-500 transition-transform ${abierto ? "rotate-180" : ""}`}
          aria-hidden="true"
        >
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {abierto && (
        <div className="max-h-56 overflow-y-auto border-t border-ink-200">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-ink-100 text-ink-500">
              <tr>
                <th className="px-3 py-1.5 font-medium">Fila</th>
                <th className="px-3 py-1.5 font-medium">Modelo / Color</th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((e, i) => (
                <tr key={i} className="border-t border-ink-200">
                  <td className="px-3 py-1.5 text-ink-500">{e.fila ?? "—"}</td>
                  <td className="px-3 py-1.5 text-ink-900">
                    {[e.modelo, e.color].filter(Boolean).join(" / ") || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {restantes > 0 && (
            <p className="border-t border-ink-200 px-3 py-1.5 text-xs text-ink-500">y {restantes} fila(s) más.</p>
          )}
        </div>
      )}
    </div>
  );
}
