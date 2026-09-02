"use client";

import { useMemo, useState } from "react";
import type { Producto } from "@/lib/types";
import { Filtros, FILTROS_VACIOS, type ValorFiltros } from "./Filtros";
import { ProductGrid } from "./ProductGrid";
import { EstadoVacio } from "./EstadoVacio";

function unicosOrdenados(valores: (string | undefined)[]): string[] {
  return Array.from(new Set(valores.filter((v): v is string => Boolean(v)))).sort((a, b) =>
    a.localeCompare(b, "es"),
  );
}

export function CatalogoClient({ productos }: { productos: Producto[] }) {
  const [filtros, setFiltros] = useState<ValorFiltros>(FILTROS_VACIOS);

  const marcas = useMemo(() => unicosOrdenados(productos.map((p) => p.marca)), [productos]);
  const generos = useMemo(() => unicosOrdenados(productos.map((p) => p.genero)), [productos]);
  const colores = useMemo(() => unicosOrdenados(productos.map((p) => p.color)), [productos]);

  const filtrados = useMemo(() => {
    const busqueda = filtros.busqueda.trim().toLowerCase();
    const desde = filtros.precioDesde ? Number(filtros.precioDesde) : null;
    const hasta = filtros.precioHasta ? Number(filtros.precioHasta) : null;

    return productos.filter((p) => {
      if (busqueda && !p.modelo.toLowerCase().includes(busqueda)) return false;
      if (filtros.marca && p.marca !== filtros.marca) return false;
      if (filtros.genero && p.genero !== filtros.genero) return false;
      if (filtros.color && p.color !== filtros.color) return false;
      if (desde !== null && Number.isFinite(desde) && p.precio < desde) return false;
      if (hasta !== null && Number.isFinite(hasta) && p.precio > hasta) return false;
      return true;
    });
  }, [productos, filtros]);

  return (
    <div className="flex flex-col gap-5">
      <Filtros marcas={marcas} generos={generos} colores={colores} valor={filtros} onChange={setFiltros} />

      <p className="text-xs text-ink-500" role="status">
        {filtrados.length} {filtrados.length === 1 ? "producto" : "productos"}
      </p>

      {filtrados.length === 0 ? (
        <EstadoVacio
          titulo="Sin resultados"
          descripcion="No encontramos productos con esos filtros. Probá ajustar la búsqueda o limpiar los filtros."
          accion={
            <button
              type="button"
              onClick={() => setFiltros(FILTROS_VACIOS)}
              className="rounded-full bg-ink-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-ink-700"
            >
              Limpiar filtros
            </button>
          }
        />
      ) : (
        <ProductGrid productos={filtrados} />
      )}
    </div>
  );
}
