"use client";

import { useCarrito } from "./CarritoContext";

export function CarritoBoton() {
  const { items, abrir } = useCarrito();
  const cantidad = items.length;

  return (
    <button
      type="button"
      onClick={abrir}
      aria-label={`Ver pedido${cantidad > 0 ? ` — ${cantidad} producto${cantidad === 1 ? "" : "s"}` : ""}`}
      className="relative ml-auto flex shrink-0 items-center gap-1.5 rounded-full border border-ink-200 px-3.5 py-2 text-sm font-medium text-ink-900 transition-colors hover:border-ink-900"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
        <circle cx="9" cy="21" r="1" />
        <circle cx="20" cy="21" r="1" />
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="hidden sm:inline">Pedido</span>
      {cantidad > 0 && (
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-accent-600 px-1 text-xs font-semibold text-white">
          {cantidad}
        </span>
      )}
    </button>
  );
}
