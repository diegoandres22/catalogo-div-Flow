"use client";

import { useEffect, useSyncExternalStore } from "react";
import Link from "next/link";
import { Header } from "@/components/ui/Header";
import { Footer } from "@/components/ui/Footer";
import { logError } from "@/lib/logger";

// Mismo patrón que ModoOffline.tsx para leer navigator.onLine sin el
// setState-dentro-de-efecto que dispara un render extra al montar.
function suscribirseAConexion(avisar: () => void) {
  window.addEventListener("online", avisar);
  window.addEventListener("offline", avisar);
  return () => {
    window.removeEventListener("online", avisar);
    window.removeEventListener("offline", avisar);
  };
}
const leerSinConexion = () => !navigator.onLine;
const leerSinConexionEnServidor = () => false;

// Límite de error de página. Si esto se dispara ESTANDO SIN CONEXIÓN (ej. un
// producto que sí se descargó, pero cuyo detalle no pudo terminar de armarse
// offline porque falta algún recurso puntual — ver la nota grande en
// DescargaOffline.tsx sobre extraerAssetsDelHtml), el mensaje genérico
// "Intentar de nuevo" es engañoso: reintentar sin señal va a volver a fallar
// exactamente igual. En ese caso se muestra un mensaje específico, sin botón
// de reintentar, y la vista queda deshabilitada de forma transparente en vez
// de repetir el error — cumple el pedido de "si no es viable el offline acá,
// que no rompa".
export default function ErrorGlobal({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const sinConexion = useSyncExternalStore(suscribirseAConexion, leerSinConexion, leerSinConexionEnServidor);

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
              Guardaste esta página para verla offline, pero le falta algo que no quedó descargado. Volvé a intentarlo
              cuando recuperes señal.
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
