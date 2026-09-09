"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { logError } from "@/lib/logger";

// Botón de descarga offline — ÚNICA forma de guardar contenido del catálogo
// para verlo sin conexión (ver la nota grande en public/sw.js: el service
// worker ya no cachea nada por su cuenta). Al hacer click:
//  1) pide el manifiesto (/api/descarga/manifiesto): páginas + imágenes que
//     hace falta guardar para navegar el catálogo entero offline;
//  2) además de esas, arranca con los assets de /_next/static/* que YA están
//     cargados en la página actual (cubren los chunks compartidos —
//     framework/main/webpack — y el CSS global);
//  3) descarga todo con concurrencia limitada y timeout por request,
//     escribiendo cada respuesta directo en la Cache API (mismas 3 cachés
//     que lee el service worker: catalogo-paginas/assets/imagenes-v2);
//  4) a medida que llega el HTML de cada página, lo revisa por referencias a
//     OTROS assets de /_next/static/* (el chunk propio de /producto/[id],
//     por ejemplo) y los agrega a la cola — así no hace falta que el
//     manifiesto sepa nada de la estructura de build de Next.
const CACHE_VERSION = "v2";
const CACHE_PAGINAS = `catalogo-paginas-${CACHE_VERSION}`;
const CACHE_ASSETS = `catalogo-assets-${CACHE_VERSION}`;
const CACHE_IMAGENES = `catalogo-imagenes-${CACHE_VERSION}`;
const LLAVE_GENERADO_EN = "descarga-offline-generado-en";
const LLAVE_ULTIMA_DESCARGA = "descarga-offline-ultima-descarga";
const CONCURRENCIA = 6;
const TIMEOUT_MS = 20000;

interface RespuestaManifiesto {
  ok: boolean;
  generadoEn: string;
  paginas: string[];
  imagenes: string[];
  mensaje?: string;
}

interface Item {
  url: string;
  cache: string;
}

type Estado =
  | { fase: "inactivo" }
  | { fase: "descargando"; hechos: number; total: number }
  | { fase: "lista" };

function esAssetDeNext(url: URL): boolean {
  return url.origin === window.location.origin && url.pathname.startsWith("/_next/static/");
}

// Referencias a chunks/CSS con hash dentro del HTML de una página ya
// descargada — cubre lo que ESE build generó para esa ruta puntual (el
// manifiesto del servidor no sabe nada de nombres de archivo de Next).
const RE_ASSET = /(?:src|href)="(\/_next\/static\/[^">]+)"/g;
function extraerAssetsDelHtml(html: string): string[] {
  const encontrados = new Set<string>();
  for (const match of html.matchAll(RE_ASSET)) encontrados.add(match[1]);
  return Array.from(encontrados);
}

function esCrossOrigin(url: string): boolean {
  return new URL(url, window.location.href).origin !== window.location.origin;
}

// Las fotos de producto vienen de cdn.shopify.com (cross-origin) y ese CDN
// no manda cabeceras CORS habilitadas para este sitio — un fetch() de este
// componente en modo "cors" (el default) falla directo con un error de red
// ANTES de llegar a una respuesta, aunque la imagen sea perfectamente
// pública (es la misma razón por la que un <img> normal SÍ la puede
// mostrar: el navegador arma esos pedidos en modo "no-cors" solo). Acá hay
// que pedirlo así a mano — la respuesta llega "opaca" (no se puede leer su
// contenido ni status), pero la Cache API la guarda igual y se sirve tal
// cual offline, que es lo único que hace falta.
async function fetchConTimeout(url: string, ms: number): Promise<Response> {
  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), ms);
  try {
    return await fetch(url, {
      signal: controlador.signal,
      cache: "no-store",
      mode: esCrossOrigin(url) ? "no-cors" : "cors",
    });
  } finally {
    clearTimeout(temporizador);
  }
}

export function DescargaOffline() {
  const [estado, setEstado] = useState<Estado>({ fase: "inactivo" });
  const [desactualizado, setDesactualizado] = useState(false);
  const [soportado, setSoportado] = useState(false);
  const enCurso = useRef(false);

  // Soporte del navegador + estado ya descargado (localStorage) solo se
  // pueden leer del lado del cliente — igual que en CarritoContext, no se
  // evalúan en el primer render para no arriesgar un mismatch de hidratación
  // (SSR no tiene "caches"/"serviceWorker" ni acceso a localStorage).
  useEffect(() => {
    const soportadoAhora = "caches" in window && "serviceWorker" in navigator;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSoportado(soportadoAhora);
    if (soportadoAhora && localStorage.getItem(LLAVE_GENERADO_EN)) {
      setEstado({ fase: "lista" });
    }
  }, []);

  // Compara la fecha del catálogo ya descargado (si hay) contra la del
  // manifiesto actual — solo para avisar que conviene volver a descargar,
  // nunca bloquea ni dispara nada solo.
  useEffect(() => {
    if (!soportado || typeof navigator === "undefined" || !navigator.onLine) return;
    const generadoEnGuardado = localStorage.getItem(LLAVE_GENERADO_EN);
    if (!generadoEnGuardado) return;

    fetch("/api/descarga/manifiesto", { cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<RespuestaManifiesto>) : null))
      .then((data) => {
        if (data?.ok && data.generadoEn !== generadoEnGuardado) setDesactualizado(true);
      })
      .catch(() => {
        // Sin red o el endpoint falló — no hay nada que avisar, se reintenta
        // en la próxima carga de la página.
      });
  }, [soportado]);

  async function descargar() {
    if (enCurso.current) return;
    if (!navigator.onLine) {
      toast.error("Necesitás conexión para descargar el catálogo.");
      return;
    }

    enCurso.current = true;
    setDesactualizado(false);
    setEstado({ fase: "descargando", hechos: 0, total: 1 });
    const idToast = toast.loading("Descargando catálogo…");

    try {
      const respuestaManifiesto = await fetch("/api/descarga/manifiesto", { cache: "no-store" });
      const manifiesto: RespuestaManifiesto = await respuestaManifiesto.json();
      if (!respuestaManifiesto.ok || !manifiesto.ok) {
        throw new Error(manifiesto.mensaje ?? "No se pudo generar el listado de descarga.");
      }

      const vistos = new Set<string>();
      const cola: Item[] = [];
      function encolar(url: string, cache: string) {
        if (vistos.has(url)) return;
        vistos.add(url);
        cola.push({ url, cache });
      }

      for (const pagina of manifiesto.paginas) encolar(pagina, CACHE_PAGINAS);
      for (const imagen of manifiesto.imagenes) encolar(imagen, CACHE_IMAGENES);

      // Assets ya en el documento actual — cubren los chunks compartidos
      // (framework/main/webpack) y el CSS global sin depender de parsear
      // ninguna página primero.
      document.querySelectorAll<HTMLScriptElement>("script[src]").forEach((el) => {
        try {
          const url = new URL(el.src, window.location.href);
          if (esAssetDeNext(url)) encolar(url.href, CACHE_ASSETS);
        } catch {
          // src inválido/relativo raro — se ignora, no es crítico.
        }
      });
      document.querySelectorAll<HTMLLinkElement>("link[rel='stylesheet']").forEach((el) => {
        try {
          const url = new URL(el.href, window.location.href);
          if (esAssetDeNext(url)) encolar(url.href, CACHE_ASSETS);
        } catch {
          // idem
        }
      });

      let hechos = 0;
      const fallidos: string[] = [];

      function actualizarProgreso() {
        setEstado({ fase: "descargando", hechos, total: cola.length });
      }
      actualizarProgreso();

      let cursor = 0;
      async function trabajador() {
        while (cursor < cola.length) {
          const item = cola[cursor++];
          try {
            const respuesta = await fetchConTimeout(item.url, TIMEOUT_MS);
            // Una respuesta opaca (cross-origin, modo "no-cors") siempre
            // reporta ok:false y status 0 aunque el fetch haya funcionado —
            // no hay forma de saber si fue un 200 o un 404 real, así que se
            // toma como éxito directo (si de verdad falló, fetch() rechaza
            // y cae al catch de abajo). Solo se valida el status en
            // respuestas legibles (mismo origen).
            if (respuesta.type !== "opaque" && !respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);

            if (item.cache === CACHE_PAGINAS) {
              const texto = await respuesta.clone().text();
              for (const assetUrl of extraerAssetsDelHtml(texto)) encolar(assetUrl, CACHE_ASSETS);
            }

            const cache = await caches.open(item.cache);
            await cache.put(item.url, respuesta);
            hechos++;
          } catch (err) {
            fallidos.push(item.url);
            logError(`DescargaOffline(${item.url})`, err);
            hechos++;
          }
          actualizarProgreso();
        }
      }

      await Promise.all(Array.from({ length: Math.min(CONCURRENCIA, cola.length) }, () => trabajador()));

      localStorage.setItem(LLAVE_GENERADO_EN, manifiesto.generadoEn);
      localStorage.setItem(LLAVE_ULTIMA_DESCARGA, new Date().toISOString());
      setEstado({ fase: "lista" });

      if (fallidos.length > 0) {
        toast.error(
          `Se descargó la mayor parte (${cola.length - fallidos.length}/${cola.length}), pero ${fallidos.length} elemento${fallidos.length === 1 ? "" : "s"} falló. Volvé a intentar con mejor señal para completarlo.`,
          { id: idToast },
        );
      } else {
        toast.success(`Catálogo descargado — ${cola.length} elementos guardados para verlos sin conexión.`, {
          id: idToast,
        });
      }
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : "No se pudo completar la descarga.";
      logError("DescargaOffline.descargar", err);
      toast.error(mensaje, { id: idToast });
      setEstado(localStorage.getItem(LLAVE_GENERADO_EN) ? { fase: "lista" } : { fase: "inactivo" });
    } finally {
      enCurso.current = false;
    }
  }

  if (!soportado) return null;

  const descargando = estado.fase === "descargando";
  const porcentaje = descargando && estado.total > 0 ? Math.round((estado.hechos / estado.total) * 100) : 0;

  return (
    <button
      type="button"
      onClick={descargar}
      disabled={descargando}
      aria-label={
        descargando
          ? `Descargando catálogo — ${porcentaje}%`
          : estado.fase === "lista"
            ? "Catálogo descargado — descargar de nuevo"
            : "Descargar catálogo para verlo sin conexión"
      }
      title={desactualizado ? "El catálogo cambió desde tu última descarga — volvé a descargar" : undefined}
      className="relative flex shrink-0 items-center gap-1.5 overflow-hidden rounded-full border border-ink-200 px-3.5 py-2 text-sm font-medium text-ink-900 transition-colors hover:border-ink-900 disabled:cursor-wait disabled:opacity-70"
    >
      {descargando && (
        <span
          className="absolute inset-y-0 left-0 bg-accent-100 transition-[width] duration-200"
          style={{ width: `${porcentaje}%` }}
          aria-hidden="true"
        />
      )}
      <span className="relative flex items-center gap-1.5">
        {estado.fase === "lista" ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
            <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
            <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 19h16" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
        <span className="hidden sm:inline">
          {descargando ? `Descargando ${porcentaje}%` : estado.fase === "lista" ? "Descargado" : "Descargar"}
        </span>
        {desactualizado && !descargando && (
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent-600" aria-hidden="true" />
        )}
      </span>
    </button>
  );
}
