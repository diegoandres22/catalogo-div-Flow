"use client";

import { useRef, useState } from "react";
import { ImagenProducto } from "@/components/catalogo/ImagenProducto";

export function Carrusel({ fotos, alt }: { fotos: string[]; alt: string }) {
  const contenedorRef = useRef<HTMLDivElement>(null);
  const [indice, setIndice] = useState(0);

  function irA(i: number) {
    const el = contenedorRef.current;
    const hijo = el?.children[i] as HTMLElement | undefined;
    hijo?.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
  }

  function onScroll() {
    const el = contenedorRef.current;
    if (!el) return;
    const ancho = el.clientWidth || 1;
    setIndice(Math.round(el.scrollLeft / ancho));
  }

  const fotosAMostrar = fotos.length > 0 ? fotos : [""];

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <div
          ref={contenedorRef}
          onScroll={onScroll}
          className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto rounded-2xl border border-ink-200"
        >
          {fotosAMostrar.map((foto, i) => (
            <div key={`${foto}-${i}`} className="relative aspect-square w-full flex-none snap-start">
              <ImagenProducto
                src={foto}
                alt={`${alt} — foto ${i + 1} de ${fotosAMostrar.length}`}
                priority={i === 0}
                sizes="(min-width: 1024px) 40vw, 100vw"
                className="h-full w-full"
              />
            </div>
          ))}
        </div>

        {fotosAMostrar.length > 1 && (
          <>
            <button
              type="button"
              aria-label="Foto anterior"
              onClick={() => irA(Math.max(indice - 1, 0))}
              className="absolute left-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-ink-900 shadow-md transition-transform hover:scale-105"
            >
              <IconoChevron direccion="izquierda" />
            </button>
            <button
              type="button"
              aria-label="Foto siguiente"
              onClick={() => irA(Math.min(indice + 1, fotosAMostrar.length - 1))}
              className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-ink-900 shadow-md transition-transform hover:scale-105"
            >
              <IconoChevron direccion="derecha" />
            </button>
          </>
        )}
      </div>

      {fotosAMostrar.length > 1 && (
        <div className="flex justify-center gap-1.5" role="tablist" aria-label="Fotos del producto">
          {fotosAMostrar.map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === indice}
              aria-label={`Ir a la foto ${i + 1}`}
              onClick={() => irA(i)}
              className={`h-1.5 rounded-full transition-all ${i === indice ? "w-5 bg-ink-900" : "w-1.5 bg-ink-300"}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function IconoChevron({ direccion }: { direccion: "izquierda" | "derecha" }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path
        d={direccion === "izquierda" ? "M15 18l-6-6 6-6" : "M9 6l6 6-6 6"}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
