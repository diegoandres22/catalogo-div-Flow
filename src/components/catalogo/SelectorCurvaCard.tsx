"use client";

import { tieneStockCurva } from "@/lib/producto";
import type { Curva } from "@/lib/types";

interface Props {
  curvas: Curva[];
  seleccionada: string;
  onSeleccionar: (curvaId: string) => void;
}

// Chips de curva DENTRO de la tarjeta del catálogo — antes el comprador
// agregaba al pedido sin saber qué curva estaba llevando (siempre la
// primera con stock, silenciosa). Solo se renderiza cuando el color por
// defecto tiene MÁS DE UNA curva (ver ProductCard): si hay una sola, no
// tiene sentido un selector para una única opción — ProductCard muestra esa
// curva como texto simple en su lugar.
//
// Mismo lenguaje visual que el selector de talla de Filtros.tsx (chip
// oscuro = activo) pero a escala de tarjeta — vive por ENCIMA del <Link>
// que cubre toda la card (z-20, ver ProductCard), así que el click acá
// nunca navega al detalle.
export function SelectorCurvaCard({ curvas, seleccionada, onSeleccionar }: Props) {
  return (
    <div className="relative z-20 -mt-0.5 flex flex-wrap gap-1" role="group" aria-label="Elegir curva de tallas">
      {curvas.map((curva) => {
        const conStock = tieneStockCurva(curva);
        const activa = curva.id === seleccionada;
        return (
          <button
            key={curva.id}
            type="button"
            aria-pressed={activa}
            disabled={!conStock}
            title={conStock ? `Curva ${curva.rango}` : `Curva ${curva.rango} — sin stock`}
            onClick={(e) => {
              e.stopPropagation();
              onSeleccionar(curva.id);
            }}
            className={[
              "rounded-md border px-2 py-1 text-[11px] font-semibold leading-none transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-1",
              !conStock
                ? "cursor-not-allowed border-ink-200 text-ink-400 line-through"
                : activa
                  ? "border-ink-900 bg-ink-900 text-white"
                  : "border-ink-200 text-ink-700 hover:border-ink-900",
            ].join(" ")}
          >
            {curva.rango}
          </button>
        );
      })}
    </div>
  );
}
