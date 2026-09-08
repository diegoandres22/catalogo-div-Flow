// Cálculos derivados para el Dashboard del panel (/admin) — KPIs de salud
// del catálogo publicado (Propuesta 5) y su composición por marca/rubro/línea
// (Propuesta 6). Todo se calcula en el servidor, sobre el catálogo YA
// publicado (no sobre una carga pendiente) y el historial de cargas.

import type { Catalogo, EntradaHistorial } from "./types";
import { tieneStockProducto } from "./producto";

export interface SaludCatalogo {
  productosActivos: number;
  productosAgotados: number;
  // % de las unidades ofertadas (entre tallas con stock) que ya están
  // físicamente en el almacén, no dependiendo de mercadería en tránsito —
  // null cuando no hay ninguna talla con stock que evaluar.
  pctStockFisico: number | null;
  productosSinFotoUltimaCarga: number;
  generadoEn: string | null;
  antiguedadDias: number | null;
}

export function calcularSalud(catalogo: Catalogo | null, historial: EntradaHistorial[]): SaludCatalogo {
  const productos = catalogo?.productos ?? [];
  let sumaDisponible = 0;
  let sumaDisponibleFisico = 0;

  for (const p of productos) {
    for (const c of p.colores) {
      for (const curva of c.curvas) {
        for (const t of curva.tallas) {
          if (t.disponible <= 0) continue;
          sumaDisponible += t.disponible;
          sumaDisponibleFisico += Math.min(t.disponible, t.disponibleFisico);
        }
      }
    }
  }

  const generadoEn = catalogo?.generadoEn ?? null;
  const antiguedadDias = generadoEn
    ? Math.max(0, Math.floor((Date.now() - new Date(generadoEn).getTime()) / (1000 * 60 * 60 * 24)))
    : null;

  return {
    productosActivos: productos.length,
    productosAgotados: productos.filter((p) => !tieneStockProducto(p)).length,
    pctStockFisico: sumaDisponible > 0 ? Math.round((sumaDisponibleFisico / sumaDisponible) * 100) : null,
    productosSinFotoUltimaCarga: historial[0]?.totalSinFoto ?? 0,
    generadoEn,
    antiguedadDias,
  };
}

export interface ConteoComposicion {
  etiqueta: string;
  cantidad: number;
}

export interface ComposicionCatalogo {
  porMarca: ConteoComposicion[];
  porRubro: ConteoComposicion[];
  porLinea: ConteoComposicion[]; // top 10
}

function contarPor(productos: Catalogo["productos"], extraer: (p: Catalogo["productos"][number]) => string | undefined): ConteoComposicion[] {
  const conteo = new Map<string, number>();
  for (const p of productos) {
    const valor = extraer(p);
    if (!valor) continue;
    conteo.set(valor, (conteo.get(valor) ?? 0) + 1);
  }
  return Array.from(conteo.entries())
    .map(([etiqueta, cantidad]) => ({ etiqueta, cantidad }))
    .sort((a, b) => b.cantidad - a.cantidad);
}

export function calcularComposicion(catalogo: Catalogo | null): ComposicionCatalogo {
  const productos = catalogo?.productos ?? [];
  return {
    porMarca: contarPor(productos, (p) => p.marca),
    porRubro: contarPor(productos, (p) => p.rubro),
    porLinea: contarPor(productos, (p) => p.linea).slice(0, 10),
  };
}
