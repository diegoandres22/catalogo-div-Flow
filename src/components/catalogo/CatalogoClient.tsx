"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { Producto } from "@/lib/types";
import { Filtros, FILTROS_VACIOS, filtrosDesdeParams, paramsDesdeFiltros, type ValorFiltros } from "./Filtros";
import { ProductGrid } from "./ProductGrid";
import { EstadoVacio } from "./EstadoVacio";
import { tieneStock } from "@/lib/format";

const POR_PAGINA = 100;

function unicosOrdenados(valores: (string | undefined)[]): string[] {
  return Array.from(new Set(valores.filter((v): v is string => Boolean(v)))).sort((a, b) =>
    a.localeCompare(b, "es"),
  );
}

function tallasOrdenadas(valores: string[]): string[] {
  return Array.from(new Set(valores)).sort((a, b) => a.localeCompare(b, "es", { numeric: true }));
}

export function CatalogoClient({ productos }: { productos: Producto[] }) {
  // Se leen una sola vez, al montar, para inicializar el estado — así el
  // catálogo arranca mostrando exactamente lo que decía la URL (por ejemplo,
  // al volver desde un producto o al abrir un link compartido ya filtrado).
  const searchParamsIniciales = useSearchParams();
  const [filtros, setFiltros] = useState<ValorFiltros>(() => filtrosDesdeParams(searchParamsIniciales));
  const [pagina, setPagina] = useState(() => {
    const p = Number(searchParamsIniciales.get("pagina"));
    return Number.isFinite(p) && p > 0 ? p : 1;
  });

  const marcas = useMemo(() => unicosOrdenados(productos.map((p) => p.marca)), [productos]);
  const generos = useMemo(() => unicosOrdenados(productos.map((p) => p.genero)), [productos]);
  const colores = useMemo(() => unicosOrdenados(productos.map((p) => p.color)), [productos]);
  const categorias = useMemo(() => unicosOrdenados(productos.map((p) => p.rubro)), [productos]);
  const lineas = useMemo(() => unicosOrdenados(productos.map((p) => p.linea)), [productos]);
  const tallas = useMemo(
    () => tallasOrdenadas(productos.flatMap((p) => p.tallas.map((t) => t.talla))),
    [productos],
  );

  const filtrados = useMemo(() => {
    const busqueda = filtros.busqueda.trim().toLowerCase();
    const desde = filtros.precioDesde ? Number(filtros.precioDesde) : null;
    const hasta = filtros.precioHasta ? Number(filtros.precioHasta) : null;

    return productos.filter((p) => {
      if (busqueda && !p.modelo.toLowerCase().includes(busqueda)) return false;
      if (filtros.marca && p.marca !== filtros.marca) return false;
      if (filtros.genero && p.genero !== filtros.genero) return false;
      if (filtros.color && p.color !== filtros.color) return false;
      if (filtros.categoria && p.rubro !== filtros.categoria) return false;
      if (filtros.linea && p.linea !== filtros.linea) return false;
      if (desde !== null && Number.isFinite(desde) && p.precio < desde) return false;
      if (hasta !== null && Number.isFinite(hasta) && p.precio > hasta) return false;
      if (filtros.tallas.length > 0 && !p.tallas.some((t) => filtros.tallas.includes(t.talla))) return false;
      if (filtros.soloDisponibles && !tieneStock(p.tallas)) return false;
      return true;
    });
  }, [productos, filtros]);

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA));
  const paginaActual = Math.min(pagina, totalPaginas);
  const paginados = useMemo(
    () => filtrados.slice((paginaActual - 1) * POR_PAGINA, paginaActual * POR_PAGINA),
    [filtrados, paginaActual],
  );

  // Mantiene la URL sincronizada con los filtros y la página activos, sin
  // pasar por el router de Next (evita recargar datos del servidor en cada
  // tecla). replaceState para no llenar el historial con una entrada por
  // cada cambio de filtro.
  useEffect(() => {
    const qs = paramsDesdeFiltros(filtros, paginaActual).toString();
    const url = qs ? `/?${qs}` : "/";
    window.history.replaceState(null, "", url);
  }, [filtros, paginaActual]);

  // Href al que vuelve cada tarjeta de producto — el catálogo completo con
  // los filtros y la página actuales, para que "Volver al catálogo" no
  // arranque de cero.
  const volver = useMemo(() => {
    const qs = paramsDesdeFiltros(filtros, paginaActual).toString();
    return qs ? `/?${qs}` : "/";
  }, [filtros, paginaActual]);

  function cambiarFiltros(v: ValorFiltros) {
    setFiltros(v);
    setPagina(1);
  }

  function irAPagina(p: number) {
    setPagina(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="flex flex-col gap-5">
      <Filtros
        marcas={marcas}
        generos={generos}
        colores={colores}
        categorias={categorias}
        lineas={lineas}
        tallas={tallas}
        valor={filtros}
        onChange={cambiarFiltros}
      />

      <p className="text-xs text-ink-500" role="status">
        {filtrados.length} {filtrados.length === 1 ? "producto" : "productos"}
        {totalPaginas > 1 && ` · página ${paginaActual} de ${totalPaginas}`}
      </p>

      {filtrados.length === 0 ? (
        <EstadoVacio
          titulo="Sin resultados"
          descripcion="No encontramos productos con esos filtros. Probá ajustar la búsqueda o limpiar los filtros."
          accion={
            <button
              type="button"
              onClick={() => cambiarFiltros(FILTROS_VACIOS)}
              className="rounded-full bg-ink-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-ink-700"
            >
              Limpiar filtros
            </button>
          }
        />
      ) : (
        <>
          <ProductGrid productos={paginados} volver={volver} />

          {totalPaginas > 1 && (
            <nav className="mt-4 flex items-center justify-center gap-3" aria-label="Paginado del catálogo">
              <button
                type="button"
                disabled={paginaActual <= 1}
                onClick={() => irAPagina(paginaActual - 1)}
                className="rounded-full border border-ink-200 px-4 py-2 text-sm font-medium text-ink-900 transition-colors hover:border-ink-900 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Anterior
              </button>
              <span className="text-sm text-ink-500">
                {paginaActual} / {totalPaginas}
              </span>
              <button
                type="button"
                disabled={paginaActual >= totalPaginas}
                onClick={() => irAPagina(paginaActual + 1)}
                className="rounded-full border border-ink-200 px-4 py-2 text-sm font-medium text-ink-900 transition-colors hover:border-ink-900 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Siguiente
              </button>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
