"use client";

import { useEffect, useSyncExternalStore } from "react";
import { logError } from "@/lib/logger";

// navigator.onLine es estado externo al de React (vive en el navegador) —
// useSyncExternalStore es la forma recomendada de leerlo sin el
// setState-dentro-de-efecto que dispara un render extra en cada montaje.
function suscribirseAConexion(avisar: () => void) {
  window.addEventListener("online", avisar);
  window.addEventListener("offline", avisar);
  return () => {
    window.removeEventListener("online", avisar);
    window.removeEventListener("offline", avisar);
  };
}
const leerSinConexion = () => !navigator.onLine;
const leerSinConexionEnServidor = () => false; // SSR no tiene navigator — se asume online, se corrige apenas hidrata

// Registra el service worker (public/sw.js) — lo que hace que las páginas y
// fotos que el vendedor ya visitó con señal sigan disponibles sin señal — y
// muestra un aviso fijo cuando el navegador detecta que no hay conexión, para
// que quede claro que lo que se ve es la última versión guardada y no la
// más actual.
export function ModoOffline() {
  const sinConexion = useSyncExternalStore(suscribirseAConexion, leerSinConexion, leerSinConexionEnServidor);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        logError(
          "ModoOffline.registrarServiceWorker",
          err,
          "El catálogo sigue funcionando normalmente con señal — solo no va a quedar guardado para verlo sin conexión.",
        );
      });
    }
  }, []);

  if (!sinConexion) return null;

  // No "sticky": el Header ya es sticky top-0 — si este aviso también lo
  // fuera, ambos competirían por la misma posición al hacer scroll. Como
  // banner normal, queda arriba de todo en el flujo del documento (antes
  // del Header) sin pisarlo.
  return (
    <div role="status" className="bg-ink-900 px-4 py-1.5 text-center text-xs font-medium text-white">
      Sin conexión — mostrando lo último guardado en este dispositivo
    </div>
  );
}
