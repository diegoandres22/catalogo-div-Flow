// Compara el catálogo publicado contra el resultado de una carga nueva,
// ANTES de confirmar el reemplazo — para que "Reemplazar catálogo" deje de
// ser una caja negra (se sabía el total del archivo nuevo, pero no si eso
// significa 5 altas o 300). Se compara por "modelo" (nombre), no por "id":
// el id es un slug interno que puede variar si el orden de filas cambia
// entre cargas, mientras que el nombre del modelo es lo que el admin
// realmente reconoce como "el mismo producto".

import type { Catalogo, DiffCatalogo } from "./types";
import { rangoPrecioProducto } from "./producto";

const UMBRAL_CAMBIO_PRECIO = 0.01; // evita marcar diferencias de redondeo como "cambio"

export function compararCatalogos(actual: Catalogo | null, nuevo: Catalogo): DiffCatalogo {
  const actualPorModelo = new Map((actual?.productos ?? []).map((p) => [p.modelo, p]));
  const nuevoPorModelo = new Map(nuevo.productos.map((p) => [p.modelo, p]));

  const diff: DiffCatalogo = { nuevos: [], bajas: [], cambiosPrecio: [] };

  for (const [modelo, p] of nuevoPorModelo) {
    const anterior = actualPorModelo.get(modelo);
    if (!anterior) {
      diff.nuevos.push({ modelo: p.modelo, marca: p.marca });
      continue;
    }
    const precioAntes = rangoPrecioProducto(anterior).min;
    const precioDespues = rangoPrecioProducto(p).min;
    if (Math.abs(precioAntes - precioDespues) >= UMBRAL_CAMBIO_PRECIO) {
      diff.cambiosPrecio.push({ modelo: p.modelo, marca: p.marca, precioAntes, precioDespues });
    }
  }

  for (const [modelo, p] of actualPorModelo) {
    if (!nuevoPorModelo.has(modelo)) diff.bajas.push({ modelo: p.modelo, marca: p.marca });
  }

  diff.nuevos.sort((a, b) => a.modelo.localeCompare(b.modelo, "es"));
  diff.bajas.sort((a, b) => a.modelo.localeCompare(b.modelo, "es"));
  diff.cambiosPrecio.sort((a, b) => a.modelo.localeCompare(b.modelo, "es"));

  return diff;
}
