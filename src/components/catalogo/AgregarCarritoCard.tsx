"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useCarrito } from "@/components/carrito/CarritoContext";
import { esCalzado } from "@/lib/transform";
import type { Producto } from "@/lib/types";

interface Props {
  producto: Producto;
  disponible: boolean;
}

// Botón de "agregar rápido" sobre la tarjeta del catálogo: suma 1 bulto (o 1
// unidad si es accesorio) directo al pedido, sin pasar por el detalle ni
// pedir talla — el carrito no distingue tallas (ver ItemCarrito/AgregarCarrito
// del detalle, que ya funciona igual con cantidad fija por bulto). Clics
// repetidos simplemente suman cantidad (agregarItem ya mergea por
// productoId).
//
// A diferencia del detalle, acá NO se abre el panel del carrito en cada
// click (abrirDrawer: false): el comprador suele agregar varios productos
// seguidos mientras recorre la grilla, y abrir el panel de golpe cortaría
// ese scroll — el toast + el contador del botón "Pedido" ya avisan que se
// agregó, sin interrumpir.
export function AgregarCarritoCard({ producto, disponible }: Props) {
  const { agregarItem, abrir } = useCarrito();
  const calzado = esCalzado(producto.rubro);
  const [agregado, setAgregado] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  function onClick(e: React.MouseEvent<HTMLButtonElement>) {
    // El botón vive por ENCIMA del link de la tarjeta (ver ProductCard: capas
    // por z-index, no anidado dentro de un <a>) — el stopPropagation es solo
    // un resguardo extra, no hace falta preventDefault de una navegación que
    // este click ni siquiera alcanza a disparar.
    e.stopPropagation();
    if (!disponible) return;

    agregarItem(
      {
        productoId: producto.id,
        modelo: producto.modelo,
        marca: producto.marca,
        color: producto.color,
        codigoSap: producto.codigoSap,
        foto: producto.fotos[0],
        precio: producto.precio,
        cantidadPorBulto: producto.cantidadPorBulto,
        esCalzado: calzado,
      },
      1,
      { abrirDrawer: false },
    );

    toast.success(`${producto.modelo} agregado al pedido (1 ${calzado ? "bulto" : "unidad"}).`, {
      action: { label: "Ver pedido", onClick: abrir },
    });

    setAgregado(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setAgregado(false), 1200);
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!disponible}
      aria-label={disponible ? `Agregar ${producto.modelo} al pedido` : `${producto.modelo} agotado`}
      title={disponible ? "Agregar al pedido" : "Agotado"}
      className={[
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full shadow-md transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2",
        !disponible
          ? "cursor-not-allowed bg-ink-200 text-ink-400"
          : agregado
            ? "bg-accent-600 text-white"
            : "bg-ink-900 text-white hover:scale-110 hover:bg-ink-700 active:scale-95",
      ].join(" ")}
    >
      {agregado ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
          <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" aria-hidden="true">
          <path d="M12 5v14M5 12h14" strokeLinecap="round" />
        </svg>
      )}
    </button>
  );
}
