"use client";

import { useState } from "react";
import { toast } from "sonner";
import { logError } from "@/lib/logger";
import type { Producto } from "@/lib/types";

// Lógica de "compartir producto" extraída de BotonCompartir (detalle) para
// reusarla también desde la tarjeta del catálogo (CompartirCard) — misma
// lógica, dos botones con presentación distinta, sin duplicar el
// try/catch de portapapeles ni el manejo de AbortError.
export function useCompartir(producto: Producto) {
  const [copiado, setCopiado] = useState(false);

  function urlProducto(): string {
    return `${window.location.origin}/producto/${producto.id}`;
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
    const titulo = `${producto.marca} - ${producto.modelo} (${producto.color})`;

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
