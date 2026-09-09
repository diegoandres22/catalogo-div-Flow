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

// Registra el service worker (public/sw.js) — lo que hace que lo que el
// vendedor descargó explícitamente (ver DescargaOffline.tsx) siga disponible
// sin señal — y muestra un aviso fijo cuando el navegador detecta que no hay
// conexión, para que quede claro que lo que se ve es la última versión
// guardada y no la más actual.
export function ModoOffline() {
  const sinConexion = useSyncExternalStore(suscribirseAConexion, leerSinConexion, leerSinConexionEnServidor);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        logError(
          "ModoOffline.registrarServiceWorker",
          err,
          "El catálogo sigue funcionando normalmente con señal — solo no va a poder descargarse para verlo sin conexión.",
        );
      });
    }
  }, []);

  // Sin conexión, un <Link> normal de Next navega del lado del cliente
  // pidiendo el payload RSC (no el documento HTML completo) — ese pedido no
  // es una "navegación" para el service worker (peticion.mode !== "navigate"),
  // así que nunca cae en el respaldo de caché de páginas y la app se queda
  // colgada esperando una respuesta que no va a llegar. Se intercepta el
  // click en cualquier <a> interno y se fuerza una navegación dura
  // (window.location.href) para que el pedido SÍ sea de tipo "navigate" y el
  // service worker pueda servirlo desde lo descargado (o desde offline.html).
  // Solo aplica sin conexión: con señal, la navegación normal de Next (más
  // rápida, sin recargar la app) sigue intacta.
  //
  // Captura (no burbujeo): el propio <Link> de Next agrega su onClick al
  // elemento vía delegación de React, que corre en la fase de burbujeo. Si
  // este listener también fuera de burbujeo, el onClick de Link se
  // ejecutaría primero y dispararía igual la navegación RSC del lado del
  // cliente antes de que este código llegue a preventDefault(). En fase de
  // captura, en cambio, corre primero: al llamar preventDefault() acá,
  // Link (que internamente chequea event.defaultPrevented) desiste de su
  // propia navegación, y esta es la única que termina disparándose.
  useEffect(() => {
    if (!sinConexion) return;

    function alHacerClick(evento: MouseEvent) {
      if (evento.defaultPrevented || evento.button !== 0) return;
      if (evento.metaKey || evento.ctrlKey || evento.shiftKey || evento.altKey) return;

      const elemento = evento.target instanceof Element ? evento.target.closest("a[href]") : null;
      if (!(elemento instanceof HTMLAnchorElement)) return;
      if (elemento.target && elemento.target !== "_self") return;
      if (elemento.hasAttribute("download")) return;

      const destino = new URL(elemento.href, window.location.href);
      if (destino.origin !== window.location.origin) return;

      evento.preventDefault();
      window.location.href = destino.href;
    }

    document.addEventListener("click", alHacerClick, { capture: true });
    return () => document.removeEventListener("click", alHacerClick, { capture: true });
  }, [sinConexion]);

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
