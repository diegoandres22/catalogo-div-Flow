"use client";

import { useCompartir } from "@/hooks/useCompartir";
import type { Producto } from "@/lib/types";

// Comparte el link del producto: usa el panel nativo de compartir del
// celular/navegador cuando existe (Web Share API — la app de destino, ej.
// WhatsApp, arma la vista previa a partir de los <meta og:*> de la página,
// que generateMetadata ya llena con la foto real del producto). Donde no
// existe (la mayoría de los navegadores de escritorio), copia el link.
// Lógica compartida con CompartirCard (catálogo) vía useCompartir.
export function BotonCompartir({ producto }: { producto: Producto }) {
  const { compartir, copiado } = useCompartir(producto);

  return (
    <button
      type="button"
      onClick={compartir}
      aria-label="Compartir este producto"
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-ink-200 px-3.5 py-1.5 text-sm font-medium text-ink-900 transition-colors hover:border-ink-900"
    >
      {copiado ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <path d="M8.59 13.51l6.83 3.98M15.41 6.51L8.59 10.49" strokeLinecap="round" />
        </svg>
      )}
      {copiado ? "¡Copiado!" : "Compartir"}
    </button>
  );
}
