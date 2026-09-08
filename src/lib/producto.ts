// Funciones derivadas sobre el modelo de Producto consolidado (un producto =
// un MODELO, con colores[] -> curvas[] -> tallas[] anidados). Centralizan
// acá la lógica de "¿qué mostrar por defecto?", "¿hay stock?" y "¿qué precio
// mostrar?" para que cada componente no reimplemente su propia versión
// ligeramente distinta de lo mismo.

import { formatearPrecio, tieneStock } from "./format";
import type { Curva, Producto, VarianteColor } from "./types";

export function tieneStockCurva(curva: Curva): boolean {
  return tieneStock(curva.tallas);
}

export function tieneStockColor(color: VarianteColor): boolean {
  return color.curvas.some(tieneStockCurva);
}

export function tieneStockProducto(producto: Producto): boolean {
  return producto.colores.some(tieneStockColor);
}

export function promocionActiva(producto: Producto): boolean {
  return producto.colores.some((c) => c.promocion);
}

/** El primer color con stock; si ninguno tiene, el primero de la lista (siempre hay al menos uno). */
export function colorPorDefecto(producto: Producto): VarianteColor {
  return producto.colores.find(tieneStockColor) ?? producto.colores[0];
}

/** La primera curva con stock dentro de un color; si ninguna tiene, la primera. */
export function curvaPorDefecto(color: VarianteColor): Curva {
  return color.curvas.find(tieneStockCurva) ?? color.curvas[0];
}

export function buscarColor(producto: Producto, nombreColor: string | null | undefined): VarianteColor | undefined {
  if (!nombreColor) return undefined;
  return producto.colores.find((c) => c.color === nombreColor);
}

export function buscarCurva(color: VarianteColor, curvaId: string | null | undefined): Curva | undefined {
  if (!curvaId) return undefined;
  return color.curvas.find((c) => c.id === curvaId);
}

/**
 * Todas las tallas distintas que existen en el producto, en cualquier
 * color/curva — para el filtro de talla del catálogo, que ahora filtra a
 * nivel de producto (modelo) y no de una sola variante color+curva.
 */
export function tallasDelProducto(producto: Producto): string[] {
  const set = new Set<string>();
  for (const color of producto.colores) {
    for (const curva of color.curvas) {
      for (const t of curva.tallas) set.add(t.talla);
    }
  }
  return Array.from(set);
}

/** Precio mínimo y máximo entre los colores del producto (el precio vive por color, no por curva). */
export function rangoPrecioProducto(producto: Producto): { min: number; max: number } {
  const precios = producto.colores.map((c) => c.precio);
  return { min: Math.min(...precios), max: Math.max(...precios) };
}

/**
 * "$12.99" cuando todos los colores del producto tienen el mismo precio, o
 * "Desde $X" cuando varía — así la tarjeta del catálogo (que ya no muestra
 * un color puntual) no muestra el precio de un solo color como si fuera el
 * único que existe.
 */
export function precioTextoProducto(producto: Producto): string {
  const { min, max } = rangoPrecioProducto(producto);
  return min === max ? formatearPrecio(min) : `Desde ${formatearPrecio(min)}`;
}
