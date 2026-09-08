"use client";

import { useState } from "react";
import { toast } from "sonner";
import { logError } from "@/lib/logger";
import type { Producto } from "@/lib/types";

// Lógica de "compartir producto" extraída de BotonCompartir (detalle) para
// reusarla también desde la tarjeta del catálogo (CompartirCard) — misma
// lógica, dos botones con presentación distinta, sin duplicar el
// try/catch de portapapeles ni el manejo de AbortError.
//
// "color" es el color actualmente mostrado/seleccionado (por defecto en la
// tarjeta, el elegido en el detalle) — se agrega como ?color= en el link
// solo cuando el producto tiene más de un color, para que quien reciba el
// link vea el mismo color que se estaba compartiendo, sin ensuciar la URL
// de productos de un solo color.
export function useCompartir(producto: Producto, color: string) {
  const [copiado, setCopiado] = useState(false);

  function urlProducto(): string {
    const base = `${window.location.origin}/producto/${producto.id}`;
    return producto.colores.length > 1 ? `${base}?color=${encodeURIComponent(color)}` : base;
  }

  async function copiarAlPortapapeles(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      toast.success("Link copiado al portapapeles.");
      setTimeout(() => setCopiado(false), 2000);
    } catch (err) {
      logError(
        "useCompartir.copiarAlPortapapeles",
        err,
        "El navegador bloqueó el acceso al portapapeles — copiá el link manualmente desde la barra de direcciones.",
      );
      toast.error("No se pudo copiar el link. Copialo manualmente desde la barra de direcciones.");
    }
  }

  async function compartir() {
    const url = urlProducto();
    const titulo = producto.colores.length > 1 ? `${producto.marca} - ${producto.modelo} (${color})` : `${producto.marca} - ${producto.modelo}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: titulo, url });
      } catch (err) {
        // AbortError: el usuario cerró el panel de compartir sin elegir
        // nada — no es un error, no hace falta avisar ni caer al respaldo.
        if (err instanceof Error && err.name === "AbortError") return;
        logError("useCompartir.compartir", err, "Falló el panel nativo de compartir del navegador — se copia el link como respaldo.");
        await copiarAlPortapapeles(url);
      }
      return;
    }

    await copiarAlPortapapeles(url);
  }

  return { compartir, copiado };
}
