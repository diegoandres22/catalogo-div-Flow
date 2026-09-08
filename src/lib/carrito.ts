// Carrito de pedido — vive solo en el navegador del comprador (localStorage
// vía CarritoContext), sin cuentas ni backend. Un ítem = una combinación
// exacta de producto + color + curva de tallas (ver "itemId" e ItemCarrito
// más abajo) — antes un ítem era solo "un producto", pero desde que el
// catálogo agrupa varios colores/curvas bajo un mismo producto, dos líneas
// del mismo modelo con distinto color o distinta curva son pedidos
// separados, con su propio precio/stock/código SAP si varían. Calzado se
// agrega por bulto completo (con la curva de tallas ya fija tal como viene
// armada en SAP), accesorios por unidad. El pedido armado se envía por
// WhatsApp — ver armarMensajePedido.

import { formatearPrecio } from "./format";

/**
 * Identidad única de una línea del carrito: mismo producto pero distinto
 * color y/o distinta curva son líneas separadas, no se mergean entre sí.
 * Se usa como key de React y para actualizar/quitar/mergear cantidades.
 */
export function armarItemId(productoId: string, color: string, curvaId: string): string {
  return `${productoId}::${color}::${curvaId}`;
}

export interface ItemCarrito {
  itemId: string; // armarItemId(productoId, color, curvaId)
  productoId: string;
  modelo: string;
  marca: string;
  color: string;
  curvaId: string;
  curvaRango: string; // "35-40" o "Único" — para mostrar en el carrito y en el mensaje de WhatsApp
  codigoSap: string;
  foto?: string;
  precio: number; // precio por par/unidad (PV Fabrica) — no por bulto
  cantidadPorBulto: number; // pares por bulto (1 en accesorios = venta por unidad)
  esCalzado: boolean;
  cantidad: number; // bultos (calzado) o unidades (accesorios)
}

export interface DatosComprador {
  nombre: string;
  empresa: string;
  telefono: string;
  rif: string;
}

export const COMPRADOR_VACIO: DatosComprador = { nombre: "", empresa: "", telefono: "", rif: "" };

export function unidadesDelItem(item: ItemCarrito): number {
  return item.cantidad * item.cantidadPorBulto;
}

export function subtotalDelItem(item: ItemCarrito): number {
  return item.precio * unidadesDelItem(item);
}

export function totalCarrito(items: ItemCarrito[]): number {
  return items.reduce((acc, item) => acc + subtotalDelItem(item), 0);
}

function sanearNumero(crudo: string): string | null {
  const digitos = crudo.replace(/\D/g, "");
  return digitos.length >= 10 ? digitos : null;
}

/** Número de WhatsApp de ventas configurado en Vercel (variable de entorno) — respaldo cuando no hay uno configurado desde el panel (ver ConfigSitio, lib/blob.ts). Saneado a solo dígitos (formato que espera wa.me). */
export function numeroWhatsAppVentas(): string | null {
  return sanearNumero(process.env.NEXT_PUBLIC_WHATSAPP_VENTAS ?? "");
}

/** Mismo saneo que numeroWhatsAppVentas, para el número que venga de ConfigSitio (panel admin). */
export function sanearNumeroWhatsApp(crudo: string | null): string | null {
  return crudo ? sanearNumero(crudo) : null;
}

export function armarMensajePedido(items: ItemCarrito[], comprador: DatosComprador): string {
  const lineas = items.map((item, i) => {
    const unidades = unidadesDelItem(item);
    const detalleCantidad = item.esCalzado
      ? `${item.cantidad} bulto${item.cantidad === 1 ? "" : "s"} x ${item.cantidadPorBulto} pares = ${unidades} pares`
      : `${item.cantidad} unidad${item.cantidad === 1 ? "" : "es"}`;
    const curvaTexto = item.esCalzado && item.curvaRango && item.curvaRango !== "Único" ? ` — Curva ${item.curvaRango}` : "";
    return [
      `${i + 1}. ${item.marca} - ${item.modelo} - ${item.color}${curvaTexto} (Cod. SAP: ${item.codigoSap})`,
      `   ${detalleCantidad} — ${formatearPrecio(item.precio)} c/u — Subtotal: ${formatearPrecio(subtotalDelItem(item))}`,
    ].join("\n");
  });

  const encabezado = [
    "Pedido — Catálogo Mayorista",
    `Comprador: ${comprador.nombre}${comprador.empresa ? " — " + comprador.empresa : ""}`,
    comprador.telefono ? `Tel: ${comprador.telefono}` : null,
    comprador.rif ? `RIF: ${comprador.rif}` : null,
  ].filter((linea): linea is string => Boolean(linea));

  return [...encabezado, "", ...lineas, "", `TOTAL: ${formatearPrecio(totalCarrito(items))}`].join("\n");
}

export function linkWhatsAppPedido(items: ItemCarrito[], comprador: DatosComprador, numero: string | null): string | null {
  if (!numero) return null;
  const mensaje = armarMensajePedido(items, comprador);
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
}
