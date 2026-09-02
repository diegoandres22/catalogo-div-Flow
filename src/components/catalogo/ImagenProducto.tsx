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
}

/**
 * Imagen con skeleton mientras carga y fallback explícito si la URL falla o
 * no existe. Usa next/image (optimización + lazy loading automático).
 */
export function ImagenProducto({ src, alt, sizes, className, priority }: Props) {
  const [conError, setConError] = useState(false);
  const [cargada, setCargada] = useState(false);
  const urlFinal = !src || conError ? FALLBACK : src;

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
