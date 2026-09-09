"use client";

import { useState } from "react";
import Image from "next/image";

const FALLBACK = "/imagen-no-disponible.svg";

interface Props {
  src: string | undefined;
  alt: string;
  sizes?: string;
  className?: string;
  priority?: boolean;
  /**
   * "cubrir" (por defecto, object-cover + fill): recorta para llenar un
   * marco de tamaño fijo — lo que necesita una grilla de fotos de producto
   * para verse pareja.
   * "natural": nunca recorta — se muestra a todo el ancho del contenedor y
   * la ALTURA se ajusta sola a la proporción real de la imagen, así se ve
   * siempre completa sin importar qué tan alta o ancha sea. Pensado para
   * fotos ya diseñadas (colecciones tipo revista, con texto compuesto en
   * la imagen) donde cualquier recorte arruina el diseño.
   */
  ajuste?: "cubrir" | "natural";
}

/**
 * Imagen con skeleton mientras carga y fallback explícito si la URL falla o
 * no existe. Usa next/image (optimización + lazy loading automático) salvo
 * en ajuste="natural" — ver más abajo.
 */
export function ImagenProducto({ src, alt, sizes, className, priority, ajuste = "cubrir" }: Props) {
  const [conError, setConError] = useState(false);
  const [cargada, setCargada] = useState(false);
  const urlFinal = !src || conError ? FALLBACK : src;

  if (ajuste === "natural") {
    // Sin marco de tamaño fijo no hay nada de qué recortar, así que acá no
    // aplica next/image (pide "fill" o un width/height que no conocemos de
    // antemano) — una <img> normal, consistente con el "unoptimized: true"
    // de next.config.ts (ya no hay optimización server-side de por medio).
    return (
      // eslint-disable-next-line @next/next/no-img-element -- intencional: alto automático según la proporción real de la imagen, next/image no lo soporta sin conocer sus dimensiones de antemano.
      <img
        src={urlFinal}
        alt={alt}
        className={`block h-auto w-full bg-ink-100 ${className ?? ""}`}
        onError={() => setConError(true)}
        loading={priority ? undefined : "lazy"}
      />
    );
  }

  return (
    <div className={`relative overflow-hidden bg-ink-100 ${className ?? ""}`}>
      {!cargada && <div className="skeleton absolute inset-0" aria-hidden="true" />}
      <Image
        src={urlFinal}
        alt={alt}
        fill
        sizes={sizes ?? "(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"}
        className={`object-cover transition-opacity duration-300 ${cargada ? "opacity-100" : "opacity-0"}`}
        onLoad={() => setCargada(true)}
        onError={() => {
          setConError(true);
          setCargada(true);
        }}
        priority={priority}
        loading={priority ? undefined : "lazy"}
      />
    </div>
  );
}
