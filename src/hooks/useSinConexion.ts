"use client";

import { useSyncExternalStore } from "react";

// navigator.onLine es estado externo al de React (vive en el navegador) —
// useSyncExternalStore es la forma recomendada de leerlo sin el
// setState-dentro-de-efecto que dispara un render extra en cada montaje.
// Compartido entre ModoOffline (banner), error.tsx (mensaje offline-aware
// cuando igual se llega a una vista rota) y ProductCard (deshabilitar el
// click al detalle) — antes cada uno tenía su propia copia de esta misma
// suscripción.
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

export function useSinConexion(): boolean {
  return useSyncExternalStore(suscribirseAConexion, leerSinConexion, leerSinConexionEnServidor);
}
