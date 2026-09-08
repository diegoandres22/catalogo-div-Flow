"use client";

import Image from "next/image";
import type { VarianteColor } from "@/lib/types";

interface Props {
  colores: VarianteColor[];
  seleccionado: string;
  onChange: (color: string) => void;
}

// Selector de color del detalle: una miniatura por color (la primera foto de
// ese color), no un swatch de color adivinado — así el comprador ve
// exactamente qué va a recibir en vez de un cuadradito de color aproximado.
// Se oculta solo si el producto viene en un único color (falsa
// interactividad: no tiene sentido "elegir" entre una sola opción).
export function SelectorColor({ colores, seleccionado, onChange }: Props) {
  if (colores.length <= 1) return null;

  return (
    <div>
      <span className="mb-1.5 block text-xs font-medium text-ink-500">
        Color: <span className="font-medium text-ink-900">{seleccionado}</span>
      </span>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Elegir color">
        {colores.map((c) => {
          const activo = c.color === seleccionado;
          return (
            <button
              key={c.color}
              type="button"
              onClick={() => onChange(c.color)}
              aria-pressed={activo}
              aria-label={c.color}
              title={c.color}
              className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2 ${
                activo ? "border-ink-900" : "border-ink-200 hover:border-ink-500"
              }`}
            >
              {c.fotos[0] && <Image src={c.fotos[0]} alt={c.color} fill sizes="56px" className="object-cover" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
