"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useCarrito } from "@/components/carrito/CarritoContext";
import { esCalzado } from "@/lib/transform";
import type { Producto } from "@/lib/types";

export function AgregarCarrito({ producto }: { producto: Producto }) {
  const { agregarItem, abrir } = useCarrito();
  const [cantidad, setCantidad] = useState(1);
  const calzado = esCalzado(producto.rubro);

  function cambiarCantidad(valor: string) {
    const n = Math.floor(Number(valor));
    setCantidad(Number.isFinite(n) && n > 0 ? n : 1);
  }

  function agregar() {
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
      cantidad,
    );
    const unidad = calzado ? (cantidad === 1 ? "bulto" : "bultos") : cantidad === 1 ? "unidad" : "unidades";
    toast.success(`Agregado al pedido: ${cantidad} ${unidad}.`, {
      action: { label: "Ver pedido", onClick: abrir },
    });
  }

  return (
    <div className="flex items-center gap-3 border-t border-ink-200 pt-4">
      <div className="flex items-center rounded-lg border border-ink-200">
        <button
          type="button"
          onClick={() => setCantidad((c) => Math.max(1, c - 1))}
          aria-label="Restar"
          className="px-3 py-2.5 text-ink-700 hover:text-ink-900"
        >
          −
        </button>
        <input
          type="number"
          min={1}
          inputMode="numeric"
          value={cantidad}
          onChange={(e) => cambiarCantidad(e.target.value)}
          aria-label={calzado ? "Cantidad de bultos" : "Cantidad de unidades"}
          className="w-14 border-x border-ink-200 py-2.5 text-center text-sm"
        />
        <button type="button" onClick={() => setCantidad((c) => c + 1)} aria-label="Sumar" className="px-3 py-2.5 text-ink-700 hover:text-ink-900">
          +
        </button>
      </div>
      <button
        type="button"
        onClick={agregar}
        className="flex-1 rounded-full bg-ink-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-ink-700"
      >
        Agregar al pedido{calzado ? ` (${cantidad * producto.cantidadPorBulto} pares)` : ""}
      </button>
    </div>
  );
}
