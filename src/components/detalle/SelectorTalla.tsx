"use client";

import { useState } from "react";
import type { TallaVariante } from "@/lib/types";

export function SelectorTalla({ tallas }: { tallas: TallaVariante[] }) {
  const [seleccionada, setSeleccionada] = useState<string | null>(null);

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-sm font-medium text-ink-900">Talla</span>
        <span className="text-xs text-ink-500" aria-live="polite">
          {seleccionada ? `Talla ${seleccionada} seleccionada` : "Elegí una talla"}
        </span>
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Selector de talla">
        {tallas.map((t) => {
          const agotada = t.disponible <= 0;
          const activa = seleccionada === t.talla;
          return (
            <button
              key={t.bcdCode}
              type="button"
              disabled={agotada}
              aria-pressed={activa}
              aria-label={agotada ? `Talla ${t.talla}, agotada` : `Talla ${t.talla}`}
              onClick={() => setSeleccionada(t.talla)}
              className={[
                "relative min-w-11 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                agotada
                  ? "cursor-not-allowed border-ink-200 bg-ink-100 text-ink-500"
                  : activa
                    ? "border-ink-900 bg-ink-900 text-white"
                    : "border-ink-200 text-ink-900 hover:border-ink-900",
              ].join(" ")}
            >
              {t.talla}
              {agotada && (
                <span className="pointer-events-none absolute -right-1.5 -top-1.5 rounded-full border border-ink-200 bg-paper-raised px-1 text-[9px] font-semibold uppercase leading-tight tracking-wide text-ink-500">
                  agotada
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
