// Carrito de pedido — vive solo en el navegador del comprador (localStorage
// vía CarritoContext), sin cuentas ni backend. Un ítem = un producto
// (modelo+color): calzado se agrega por bulto completo (con la curva de
// tallas ya fija tal como viene armada en SAP), accesorios por unidad.
// El pedido armado se envía por WhatsApp — ver armarMensajePedido.

import { formatearPrecio } from "./format";

export interface ItemCarrito {
  productoId: string;
  modelo: string;
  marca: string;
  color: string;
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

/** Número de WhatsApp de ventas configurado en Vercel, saneado a solo dígitos (formato que espera wa.me). */
export function numeroWhatsAppVentas(): string | null {
  const crudo = process.env.NEXT_PUBLIC_WHATSAPP_VENTAS ?? "";
  const digitos = crudo.replace(/\D/g, "");
  return digitos.length >= 10 ? digitos : null;
}

export function armarMensajePedido(items: ItemCarrito[], comprador: DatosComprador): string {
  const lineas = items.map((item, i) => {
    const unidades = unidadesDelItem(item);
    const detalleCantidad = item.esCalzado
      ? `${item.cantidad} bulto${item.cantidad === 1 ? "" : "s"} x ${item.cantidadPorBulto} pares = ${unidades} pares`
      : `${item.cantidad} unidad${item.cantidad === 1 ? "" : "es"}`;
    return [
      `${i + 1}. ${item.marca} - ${item.modelo} - ${item.color} (Cod. SAP: ${item.codigoSap})`,
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

export function linkWhatsAppPedido(items: ItemCarrito[], comprador: DatosComprador): string | null {
  const numero = numeroWhatsAppVentas();
  if (!numero) return null;
  const mensaje = armarMensajePedido(items, comprador);
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
}
