"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";

// El buscador vive en el navbar (Header), pero el catálogo que filtra está
// en la página "/" — son componentes hermanos, no padre-hijo, así que el
// texto de búsqueda no puede viajar por props. Este context es el punto
// compartido: BuscadorNavbar escribe, CatalogoClient lee y filtra.
//
// Deliberadamente NO se sincroniza con la URL en cada tecla (a diferencia
// del resto de los filtros): escribir dispararía un router.replace en cada
// letra, y como "/" no lee searchParams del lado del servidor, cada uno
// de esos releería el catálogo completo de Vercel Blob sin necesidad.
// CatalogoClient sigue siendo quien sincroniza "?q=" en la URL (para poder
// compartir el link ya filtrado), igual que antes.
interface BusquedaContextValor {
  busqueda: string;
  setBusqueda: (v: string) => void;
}

const BusquedaContext = createContext<BusquedaContextValor | null>(null);

export function BusquedaProvider({ children }: { children: ReactNode }) {
  // Semilla inicial desde "?q=" — así un link compartido como
  // "/?q=zapatin" o volver de un producto con la búsqueda en la URL
  // arranca con el buscador ya lleno, no vacío.
  const searchParamsIniciales = useSearchParams();
  const [busqueda, setBusqueda] = useState(() => searchParamsIniciales.get("q") ?? "");

  return <BusquedaContext.Provider value={{ busqueda, setBusqueda }}>{children}</BusquedaContext.Provider>;
}

export function useBusqueda(): BusquedaContextValor {
  const ctx = useContext(BusquedaContext);
  if (!ctx) throw new Error("useBusqueda debe usarse dentro de <BusquedaProvider>");
  return ctx;
}
