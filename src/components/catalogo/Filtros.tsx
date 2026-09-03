"use client";

import { useId, useState } from "react";

export interface ValorFiltros {
  busqueda: string;
  marca: string;
  genero: string;
  color: string;
  precioDesde: string;
  precioHasta: string;
  tallas: string[];
  soloDisponibles: boolean;
}

export const FILTROS_VACIOS: ValorFiltros = {
  busqueda: "",
  marca: "",
  genero: "",
  color: "",
  precioDesde: "",
  precioHasta: "",
  tallas: [],
  soloDisponibles: false,
};

interface Props {
  marcas: string[];
  generos: string[];
  colores: string[];
  tallas: string[];
  valor: ValorFiltros;
  onChange: (valor: ValorFiltros) => void;
}

function contarActivos(v: ValorFiltros): number {
  return (
    [v.marca, v.genero, v.color, v.precioDesde, v.precioHasta].filter(Boolean).length +
    (v.tallas.length > 0 ? 1 : 0) +
    (v.soloDisponibles ? 1 : 0)
  );
}

export function Filtros({ marcas, generos, colores, tallas, valor, onChange }: Props) {
  const [abierto, setAbierto] = useState(false);
  const idPanel = useId();
  const activos = contarActivos(valor);

  function set<K extends keyof ValorFiltros>(campo: K, v: ValorFiltros[K]) {
    onChange({ ...valor, [campo]: v });
  }

  function toggleTalla(t: string) {
    const activa = valor.tallas.includes(t);
    set("tallas", activa ? valor.tallas.filter((x) => x !== t) : [...valor.tallas, t]);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <label htmlFor="busqueda-catalogo" className="sr-only">
          Buscar por nombre de modelo
        </label>
        <div className="relative flex-1">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-500"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
          </svg>
          <input
            id="busqueda-catalogo"
            type="search"
            placeholder="Buscar modelo…"
            value={valor.busqueda}
            onChange={(e) => set("busqueda", e.target.value)}
            className="w-full rounded-full border border-ink-200 bg-paper-raised py-2.5 pl-10 pr-4 text-sm text-ink-900 placeholder:text-ink-500 focus:border-accent-600"
          />
        </div>
        <button
          type="button"
          aria-expanded={abierto}
          aria-controls={idPanel}
          onClick={() => setAbierto((v) => !v)}
          className="flex shrink-0 items-center gap-1.5 rounded-full border border-ink-200 bg-paper-raised px-4 py-2.5 text-sm font-medium text-ink-900 lg:hidden"
        >
          Filtros
          {activos > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-accent-600 px-1 text-xs font-semibold text-white">
              {activos}
            </span>
          )}
        </button>
      </div>

      <div id={idPanel} className={`${abierto ? "grid" : "hidden"} grid-cols-2 gap-3 sm:grid-cols-4 lg:grid lg:gap-4`}>
        <Select
          etiqueta="Marca"
          value={valor.marca}
          onChange={(v) => set("marca", v)}
          opciones={marcas}
          todas="Todas las marcas"
        />
        <Select
          etiqueta="Género"
          value={valor.genero}
          onChange={(v) => set("genero", v)}
          opciones={generos}
          todas="Todos los géneros"
        />
        <Select
          etiqueta="Color"
          value={valor.color}
          onChange={(v) => set("color", v)}
          opciones={colores}
          todas="Todos los colores"
        />
        <div className="col-span-2 flex items-end gap-2 sm:col-span-1">
          <div className="flex-1">
            <label htmlFor="precio-desde" className="mb-1 block text-xs font-medium text-ink-500">
              Precio desde
            </label>
            <input
              id="precio-desde"
              type="number"
              inputMode="decimal"
              min={0}
              placeholder="$0"
              value={valor.precioDesde}
              onChange={(e) => set("precioDesde", e.target.value)}
              className="w-full rounded-lg border border-ink-200 bg-paper-raised px-3 py-2 text-sm focus:border-accent-600"
            />
          </div>
          <div className="flex-1">
            <label htmlFor="precio-hasta" className="mb-1 block text-xs font-medium text-ink-500">
              Precio hasta
            </label>
            <input
              id="precio-hasta"
              type="number"
              inputMode="decimal"
              min={0}
              placeholder="$999"
              value={valor.precioHasta}
              onChange={(e) => set("precioHasta", e.target.value)}
              className="w-full rounded-lg border border-ink-200 bg-paper-raised px-3 py-2 text-sm focus:border-accent-600"
            />
          </div>
        </div>

        {tallas.length > 0 && (
          <div className="col-span-2 sm:col-span-4">
            <span className="mb-1.5 block text-xs font-medium text-ink-500">Talla</span>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por talla">
              {tallas.map((t) => {
                const activa = valor.tallas.includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    aria-pressed={activa}
                    onClick={() => toggleTalla(t)}
                    className={[
                      "min-w-9 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors",
                      activa
                        ? "border-ink-900 bg-ink-900 text-white"
                        : "border-ink-200 bg-paper-raised text-ink-900 hover:border-ink-900",
                    ].join(" ")}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <label className="col-span-2 flex items-center gap-2 text-sm text-ink-900 sm:col-span-4">
          <input
            type="checkbox"
            checked={valor.soloDisponibles}
            onChange={(e) => set("soloDisponibles", e.target.checked)}
            className="h-4 w-4 rounded border-ink-300 text-accent-600 focus:ring-accent-600"
          />
          Solo mostrar productos con stock disponible
        </label>
      </div>

      {activos > 0 && (
        <button
          type="button"
          onClick={() => onChange(FILTROS_VACIOS)}
          className="self-start text-sm font-medium text-accent-700 underline-offset-2 hover:underline"
        >
          Limpiar filtros
        </button>
      )}
    </div>
  );
}

function Select({
  etiqueta,
  value,
  onChange,
  opciones,
  todas,
}: {
  etiqueta: string;
  value: string;
  onChange: (v: string) => void;
  opciones: string[];
  todas: string;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs font-medium text-ink-500">
        {etiqueta}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-ink-200 bg-paper-raised px-3 py-2 text-sm text-ink-900 focus:border-accent-600"
      >
        <option value="">{todas}</option>
        {opciones.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}
