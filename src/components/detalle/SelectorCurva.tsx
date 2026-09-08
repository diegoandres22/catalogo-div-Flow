"use client";

import type { Curva } from "@/lib/types";
import { tieneStockCurva } from "@/lib/producto";

interface Props {
  curvas: Curva[];
  seleccionada: Curva;
  onChange: (curva: Curva) => void;
}

// Un mismo modelo+color puede traer más de una curva (ej. "33-38" y
// "39-44"): son dos bultos distintos y comprables por separado, no una sola
// mezcla — antes se fusionaban en una sola lista de tallas, ocultando que en
// realidad eran dos curvas. El selector de curva (solo si hay más de una)
// deja elegir cuál, y siempre muestra debajo la "Distribución por bulto" de
// la curva actualmente elegida.
export function SelectorCurva({ curvas, seleccionada, onChange }: Props) {
  const tieneDistribucion = seleccionada.tallas.some((t) => t.porBulto);

  return (
    <div className="flex flex-col gap-2.5">
      {curvas.length > 1 && (
        <div>
          <span className="mb-1.5 block text-xs font-medium text-ink-500">Curva de tallas</span>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Elegir curva de tallas">
            {curvas.map((curva) => {
              const activa = curva.id === seleccionada.id;
              const disponible = tieneStockCurva(curva);
              return (
                <button
                  key={curva.id}
                  type="button"
                  onClick={() => onChange(curva)}
                  aria-pressed={activa}
                  className={[
                    "rounded-lg border px-3 py-2 text-left text-xs transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2",
                    activa ? "border-ink-900 bg-ink-900 text-white" : "border-ink-200 text-ink-900 hover:border-ink-900",
                    !disponible && !activa ? "opacity-60" : "",
                  ].join(" ")}
                >
                  <span className="block font-medium">Tallas {curva.rango}</span>
                  <span className={activa ? "text-white/80" : "text-ink-500"}>
                    {curva.cantidadPorBulto} pares/bulto{!disponible ? " · Agotada" : ""}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {tieneDistribucion && (
        <div className="rounded-xl border border-ink-200 p-3">
          {/* Antes era una grilla de números sueltos (talla y pares
              alternados en columnas) sin separación visual entre cada par de
              datos — se leía como una secuencia continua en vez de "esta
              talla trae esta cantidad". Cada talla es su propia tarjeta con
              borde, y el número de pares se explica en palabras ("2 pares")
              en vez de un número aislado que obligaba a leer el encabezado
              para saber qué significaba. */}
          <h2 className="mb-2.5 text-xs font-medium uppercase tracking-wide text-ink-500">Distribución por bulto</h2>
          <ul className="flex flex-wrap gap-2">
            {seleccionada.tallas.map((t) => {
              const pares = t.porBulto ?? 0;
              const etiquetaPares = pares === 1 ? "par" : "pares";
              return (
                <li
                  key={t.talla}
                  className="flex min-w-14 flex-col items-center gap-0.5 rounded-lg border border-ink-200 bg-paper px-2.5 py-1.5"
                >
                  <span className="text-sm font-semibold text-ink-900" aria-hidden="true">
                    {t.talla}
                  </span>
                  <span className="text-[11px] text-ink-500" aria-hidden="true">
                    {pares} {etiquetaPares}
                  </span>
                  <span className="sr-only">
                    Talla {t.talla}: {pares} {etiquetaPares} por bulto
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
