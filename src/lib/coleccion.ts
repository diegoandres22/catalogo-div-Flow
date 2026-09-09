// Lógica compartida (server + client) de las colecciones de la home — NO
// vive en CatalogoClient.tsx porque ese archivo es "use client" y esto lo
// necesita también page.tsx / ColeccionesHome.tsx del lado del servidor
// (para contar modelos/referencias sin mandar el catálogo entero al cliente
// solo para eso).
//
// Los nombres de query param (marca/cat/linea/genero/color) son EXACTAMENTE
// los mismos que ya usa Filtros.tsx (filtrosDesdeParams/paramsDesdeFiltros)
// — una tarjeta de colección arma una URL que el catálogo ya sabe leer, sin
// necesidad de una vista ni una lógica de filtrado paralela.
import type { Coleccion, FiltroColeccion, Producto } from "./types";

export function queryParamsColeccion(filtro: FiltroColeccion): string {
  const sp = new URLSearchParams();
  if (filtro.marca) sp.set("marca", filtro.marca);
  if (filtro.categoria) sp.set("cat", filtro.categoria);
  if (filtro.linea) sp.set("linea", filtro.linea);
  if (filtro.genero) sp.set("genero", filtro.genero);
  if (filtro.color) sp.set("color", filtro.color);
  return sp.toString();
}

/** ¿Este producto entra en la colección? Mismo criterio que coincideConFiltros en CatalogoClient, pero solo con los 5 campos que una colección puede fijar (sin búsqueda/precio/tallas/stock, que no aplican acá). */
export function productoCoincideFiltroColeccion(p: Producto, filtro: FiltroColeccion): boolean {
  if (filtro.marca && p.marca !== filtro.marca) return false;
  if (filtro.categoria && p.rubro !== filtro.categoria) return false;
  if (filtro.linea && p.linea !== filtro.linea) return false;
  if (filtro.genero && p.genero !== filtro.genero) return false;
  if (filtro.color && !p.colores.some((c) => c.color === filtro.color)) return false;
  return true;
}

/** "70 modelos · 143 referencias" de la tarjeta — se calcula en vivo a partir del catálogo publicado, no se guarda nada aparte (ver respuesta de Diego: siempre en vivo, nunca desactualizado). */
export function contarColeccion(productos: Producto[], filtro: FiltroColeccion): { modelos: number; referencias: number } {
  const incluidos = productos.filter((p) => productoCoincideFiltroColeccion(p, filtro));
  const referencias = incluidos.reduce((acc, p) => acc + p.colores.length, 0);
  return { modelos: incluidos.length, referencias };
}

/** Colección con al menos un producto — para no mostrar en la home una tarjeta que llevaría a un catálogo filtrado vacío. */
export function coleccionesConProductos(colecciones: Coleccion[], productos: Producto[]): Coleccion[] {
  return colecciones.filter((c) => productos.some((p) => productoCoincideFiltroColeccion(p, c.filtro)));
}
