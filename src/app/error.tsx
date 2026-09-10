"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Header } from "@/components/ui/Header";
import { Footer } from "@/components/ui/Footer";
import { logError } from "@/lib/logger";
import { useSinConexion } from "@/hooks/useSinConexion";

// Límite de error de página. Si esto se dispara ESTANDO SIN CONEXIÓN, el
// mensaje genérico "Intentar de nuevo" es engañoso: reintentar sin señal va
// a volver a fallar igual. Es sobre todo el respaldo para el detalle de
// producto (/producto/[id]), que directamente no se descarga ni se soporta
// offline (ver la nota grande en api/descarga/manifiesto/route.ts) —
// ProductCard ya deshabilita el click que llevaría ahí, así que en el uso
// normal esto nunca debería dispararse; queda como red de seguridad para
// una URL vieja guardada o el botón "atrás" del navegador.
export default function ErrorGlobal({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const sinConexion = useSinConexion();

  useEffect(() => {
    logError("error.tsx (límite de error de la página)", error);
  }, [error]);

  return (
    <>
      <Header />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center px-4 py-16 text-center sm:px-6">
        {sinConexion ? (
          <>
            <h1 className="text-lg font-semibold text-ink-900">Esta vista no está disponible sin conexión</h1>
            <p className="mt-2 max-w-sm text-sm text-ink-500">
              Solo el catálogo (la grilla de productos) queda guardado para verlo offline. Volvé al catálogo, o
              recuperá señal para ver esta página.
            </p>
            <div className="mt-5">
              <Link
                href="/"
                className="rounded-full border border-ink-200 px-4 py-2.5 text-sm font-medium text-ink-900 transition-colors hover:border-ink-900"
              >
                Volver al catálogo
              </Link>
            </div>
          </>
        ) : (
          <>
            <h1 className="text-lg font-semibold text-ink-900">Algo salió mal</h1>
            <p className="mt-2 max-w-sm text-sm text-ink-500">
              Hubo un error inesperado al cargar esta página. Podés intentar de nuevo o volver al catálogo.
            </p>
            <div className="mt-5 flex gap-2.5">
              <button
                type="button"
                onClick={reset}
                className="rounded-full bg-ink-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-ink-700"
              >
                Intentar de nuevo
              </button>
              <Link
                href="/"
                className="rounded-full border border-ink-200 px-4 py-2.5 text-sm font-medium text-ink-900 transition-colors hover:border-ink-900"
              >
                Volver al catálogo
              </Link>
            </div>
          </>
        )}
      </main>
      <Footer />
    </>
  );
}
