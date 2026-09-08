"use client";

import { useState } from "react";
import type { DiffCatalogo } from "@/lib/types";
import { formatearPrecio } from "@/lib/format";

interface Props {
  diff: DiffCatalogo;
}

// Qué cambiaría realmente si se confirma esta carga, comparado contra el
// catálogo YA publicado — antes "Reemplazar catálogo" era una caja negra
// (se sabía el total del archivo nuevo, pero no si eso significa 5 altas o
// 300, ni si algún precio cambió por un error de tipeo en el Excel). Cada
// sección se colapsa sola si no tiene nada que mostrar.
export function ComparadorCambios({ diff }: Props) {
  const sinCambios = diff.nuevos.length === 0 && diff.bajas.length === 0 && diff.cambiosPrecio.length === 0;

  if (sinCambios) {
    return (
      <div className="mt-5 rounded-xl border border-ink-200 bg-ink-100 px-3.5 py-2.5 text-xs text-ink-500">
        Sin cambios respecto al catálogo publicado: mismos modelos, mismos precios.
      </div>
    );
  }

  return (
    <div className="mt-5 flex flex-col gap-2">
      <h3 className="text-sm font-medium text-ink-900">Qué cambia respecto al catálogo publicado</h3>
      <Seccion titulo="Nuevos" cantidad={diff.nuevos.length} colorAcento="text-success-600">
        <ListaModelos items={diff.nuevos} />
      </Seccion>
      <Seccion titulo="Se dan de baja" cantidad={diff.bajas.length} colorAcento="text-danger-600">
        <ListaModelos items={diff.bajas} />
      </Seccion>
      <Seccion titulo="Cambio de precio" cantidad={diff.cambiosPrecio.length} colorAcento="text-accent-700">
        <ul className="flex flex-col divide-y divide-ink-200">
          {diff.cambiosPrecio.map((c) => (
            <li key={c.modelo} className="flex items-center justify-between gap-3 py-1.5 text-sm">
              <span className="text-ink-900">
                <span className="text-xs font-medium uppercase tracking-wide text-ink-500">{c.marca}</span> {c.modelo}
              </span>
              <span className="whitespace-nowrap text-xs text-ink-700">
                {formatearPrecio(c.precioAntes)} <span className="text-ink-500">→</span> {formatearPrecio(c.precioDespues)}
              </span>
            </li>
          ))}
        </ul>
      </Seccion>
    </div>
  );
}

function ListaModelos({ items }: { items: { modelo: string; marca: string }[] }) {
  return (
    <ul className="flex flex-col divide-y divide-ink-200">
      {items.map((p) => (
        <li key={p.modelo} className="py-1.5 text-sm text-ink-900">
          <span className="text-xs font-medium uppercase tracking-wide text-ink-500">{p.marca}</span> {p.modelo}
        </li>
      ))}
    </ul>
  );
}

function Seccion({
  titulo,
  cantidad,
  colorAcento,
  children,
}: {
  titulo: string;
  cantidad: number;
  colorAcento: string;
  children: React.ReactNode;
}) {
  const [abierto, setAbierto] = useState(false);
  if (cantidad === 0) return null;

  return (
    <div className="rounded-xl border border-ink-200">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        className="flex w-full items-center justify-between px-3.5 py-2.5 text-left"
      >
        <span className="text-sm font-medium text-ink-900">
          {titulo} <span className={`font-semibold ${colorAcento}`}>({cantidad})</span>
        </span>
        <svg
          width="16"
          height="16"
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
      {abierto && <div className="max-h-56 overflow-y-auto border-t border-ink-200 px-3.5 py-1">{children}</div>}
    </div>
  );
}
