"use client";

import { useId, useState } from "react";

export interface ValorFiltros {
  busqueda: string;
  marca: string;
  genero: string;
  color: string;
  categoria: string; // rubro: CALZADO / ACCESORIOS
  linea: string;
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
  categoria: "",
  linea: "",
  precioDesde: "",
  precioHasta: "",
  tallas: [],
  soloDisponibles: false,
};

// Los filtros se reflejan en la URL (query string) para que: 1) el botón
// "atrás" del navegador y el link "Volver al catálogo" restauren exactamente
// lo que se estaba viendo, y 2) el link se pueda compartir ya filtrado.
export function filtrosDesdeParams(sp: URLSearchParams): ValorFiltros {
  const talla = sp.get("talla");
  return {
    busqueda: sp.get("q") ?? "",
    marca: sp.get("marca") ?? "",
    genero: sp.get("genero") ?? "",
    color: sp.get("color") ?? "",
    categoria: sp.get("cat") ?? "",
    linea: sp.get("linea") ?? "",
    precioDesde: sp.get("desde") ?? "",
    precioHasta: sp.get("hasta") ?? "",
    tallas: talla ? talla.split(",").filter(Boolean) : [],
    soloDisponibles: sp.get("disp") === "1",
  };
}

export function paramsDesdeFiltros(filtros: ValorFiltros, pagina: number): URLSearchParams {
  const sp = new URLSearchParams();
  if (filtros.busqueda.trim()) sp.set("q", filtros.busqueda.trim());
  if (filtros.marca) sp.set("marca", filtros.marca);
  if (filtros.genero) sp.set("genero", filtros.genero);
  if (filtros.color) sp.set("color", filtros.color);
  if (filtros.categoria) sp.set("cat", filtros.categoria);
  if (filtros.linea) sp.set("linea", filtros.linea);
  if (filtros.precioDesde) sp.set("desde", filtros.precioDesde);
  if (filtros.precioHasta) sp.set("hasta", filtros.precioHasta);
  if (filtros.tallas.length > 0) sp.set("talla", filtros.tallas.join(","));
  if (filtros.soloDisponibles) sp.set("disp", "1");
  if (pagina > 1) sp.set("pagina", String(pagina));
  return sp;
}

interface Props {
  marcas: string[];
  generos: string[];
  colores: string[];
  categorias: string[];
  lineas: string[];
  tallas: string[];
  valor: ValorFiltros;
  onChange: (valor: ValorFiltros) => void;
}

function contarActivos(v: ValorFiltros): number {
  return (
    [v.marca, v.genero, v.color, v.categoria, v.linea, v.precioDesde, v.precioHasta].filter(Boolean).length +
    (v.tallas.length > 0 ? 1 : 0) +
    (v.soloDisponibles ? 1 : 0)
  );
}

export function Filtros({ marcas, generos, colores, categorias, lineas, tallas, valor, onChange }: Props) {
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

  // "min={0}" en un <input type="number"> no impide tipear un negativo a
  // mano — se recorta acá para que el filtro de precio nunca quede en un
  // estado imposible.
  function setPrecio(campo: "precioDesde" | "precioHasta", texto: string) {
    if (texto === "") {
      set(campo, "");
      return;
    }
    const n = Number(texto);
    set(campo, Number.isFinite(n) && n < 0 ? "0" : texto);
  }

  // Un chip por filtro activo, con su propio botón para quitar solo ese —
  // así el comprador ve de un vistazo por qué el catálogo se achicó, y
  // puede sacar un filtro puntual sin tener que limpiar todo de nuevo.
  const chips: { id: string; etiqueta: string; quitar: () => void }[] = [];
  if (valor.busqueda.trim()) {
    chips.push({ id: "busqueda", etiqueta: `Buscar: "${valor.busqueda.trim()}"`, quitar: () => set("busqueda", "") });
  }
  if (valor.marca) chips.push({ id: "marca", etiqueta: `Marca: ${valor.marca}`, quitar: () => set("marca", "") });
  if (valor.genero) chips.push({ id: "genero", etiqueta: `Género: ${valor.genero}`, quitar: () => set("genero", "") });
  if (valor.color) chips.push({ id: "color", etiqueta: `Color: ${valor.color}`, quitar: () => set("color", "") });
  if (valor.categoria) {
    chips.push({ id: "categoria", etiqueta: `Categoría: ${valor.categoria}`, quitar: () => set("categoria", "") });
  }
  if (valor.linea) chips.push({ id: "linea", etiqueta: `Línea: ${valor.linea}`, quitar: () => set("linea", "") });
  if (valor.precioDesde) {
    chips.push({ id: "precioDesde", etiqueta: `Desde $${valor.precioDesde}`, quitar: () => set("precioDesde", "") });
  }
  if (valor.precioHasta) {
    chips.push({ id: "precioHasta", etiqueta: `Hasta $${valor.precioHasta}`, quitar: () => set("precioHasta", "") });
  }
  if (valor.tallas.length > 0) {
    chips.push({
      id: "tallas",
      etiqueta: `Talla${valor.tallas.length > 1 ? "s" : ""}: ${valor.tallas.join(", ")}`,
      quitar: () => set("tallas", []),
    });
  }
  if (valor.soloDisponibles) {
    chips.push({ id: "soloDisponibles", etiqueta: "Solo con stock", quitar: () => set("soloDisponibles", false) });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <label htmlFor="busqueda-catalogo" className="sr-only">
          Buscar por modelo, marca, color o código SAP
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
            placeholder="Buscar modelo, marca, color o código…"
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

      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {chips.map((chip) => (
            <button
              key={chip.id}
              type="button"
              onClick={chip.quitar}
              className="inline-flex items-center gap-1 rounded-full border border-ink-900 bg-ink-900 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:opacity-80"
            >
              {chip.etiqueta}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          ))}
          {chips.length > 1 && (
            <button
              type="button"
              onClick={() => onChange(FILTROS_VACIOS)}
              className="text-xs font-medium text-ink-500 underline-offset-2 hover:underline"
            >
              Limpiar todo
            </button>
          )}
        </div>
      )}

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
        {categorias.length > 1 && (
          <Select
            etiqueta="Categoría"
            value={valor.categoria}
            onChange={(v) => set("categoria", v)}
            opciones={categorias}
            todas="Calzado y accesorios"
          />
        )}
        {lineas.length > 0 && (
          <Select
            etiqueta="Línea"
            value={valor.linea}
            onChange={(v) => set("linea", v)}
            opciones={lineas}
            todas="Todas las líneas"
          />
        )}
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
              onChange={(e) => setPrecio("precioDesde", e.target.value)}
              className={`w-full rounded-lg border px-3 py-2 text-sm focus:border-accent-600 ${
                valor.precioDesde ? "border-ink-900 bg-ink-900 font-medium text-white" : "border-ink-200 bg-paper-raised"
              }`}
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
              onChange={(e) => setPrecio("precioHasta", e.target.value)}
              className={`w-full rounded-lg border px-3 py-2 text-sm focus:border-accent-600 ${
                valor.precioHasta ? "border-ink-900 bg-ink-900 font-medium text-white" : "border-ink-200 bg-paper-raised"
              }`}
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

        <label
          className={`col-span-2 flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm sm:col-span-4 ${
            valor.soloDisponibles ? "bg-ink-900 font-medium text-white" : "text-ink-900"
          }`}
        >
          <input
            type="checkbox"
            checked={valor.soloDisponibles}
            onChange={(e) => set("soloDisponibles", e.target.checked)}
            className="h-4 w-4 rounded border-ink-300 text-accent-600 focus:ring-accent-600"
          />
          Solo mostrar productos con stock disponible
        </label>
      </div>
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
        className={`w-full rounded-lg border px-3 py-2 text-sm focus:border-accent-600 ${
          value ? "border-ink-900 bg-ink-900 font-medium text-white" : "border-ink-200 bg-paper-raised text-ink-900"
        }`}
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
