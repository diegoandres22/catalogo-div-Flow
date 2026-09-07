"use client";

import { useCompartir } from "@/hooks/useCompartir";
import type { Producto } from "@/lib/types";

// Botón de compartir directo en la tarjeta del catálogo — evita obligar al
// comprador a entrar al detalle solo para conseguir el link. Mismo hook
// (useCompartir) que BotonCompartir del detalle, presentación distinta:
// estilo "secundario" (contorno, no relleno) a propósito, para no
// confundirse con el botón de agregar al pedido (relleno negro) que vive en
// la esquina opuesta de la misma foto.
export function CompartirCard({ producto }: { producto: Producto }) {
  const { compartir, copiado } = useCompartir(producto);

  function onClick(e: React.MouseEvent<HTMLButtonElement>) {
    // Igual que AgregarCarritoCard: este botón vive por ENCIMA del link
    // fantasma de la tarjeta (z-20 > z-10), así que el stopPropagation es
    // solo un resguardo — el click ya no llega a disparar la navegación.
    e.stopPropagation();
    compartir();
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={copiado ? "Link copiado" : `Compartir ${producto.modelo}`}
      title="Compartir"
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-ink-200 bg-paper-raised/95 text-ink-900 shadow-sm backdrop-blur transition-all duration-200 hover:scale-110 hover:border-ink-900 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2"
    >
      {copiado ? (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" aria-hidden="true">
          <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <path d="M8.59 13.51l6.83 3.98M15.41 6.51L8.59 10.49" strokeLinecap="round" />
        </svg>
      )}
    </button>
  );
}
