"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { logError } from "@/lib/logger";

// Botón de descarga offline — ÚNICA forma de guardar contenido del catálogo
// para verlo sin conexión (ver la nota grande en public/sw.js: el service
// worker ya no cachea nada por su cuenta).
//
// Por MARCA, no el catálogo entero: con ~1600+ variantes, descargar todo de
// una vez es lento, pesado en datos móviles, y a esa escala la cantidad de
// ítems que pueden fallar (timeout, red inestable) sube mucho — un vendedor
// normalmente solo necesita la marca que vende. Cada marca se descarga por
// separado y se acumula en las mismas 3 cachés (no se pisan entre sí), así
// que un vendedor que vende dos marcas simplemente descarga las dos.
//
// Al elegir una marca:
//  1) pide el manifiesto de ESA marca (/api/descarga/manifiesto?marca=...):
//     "/", "/?marca=<marca>" y cada /producto/[id] de esa marca, más sus
//     fotos y las portadas de colección (siempre, son livianas — así "/" se
//     ve completa aunque la marca elegida no sea la de esa colección);
//  2) además arranca con los assets de /_next/static/* que YA están
//     cargados en la página actual (chunks compartidos + CSS global);
//  3) descarga todo con concurrencia limitada y timeout por request,
//     escribiendo cada respuesta directo en la Cache API;
//  4) a medida que llega el HTML de cada página, la revisa por referencias a
//     OTROS assets de /_next/static/* (el chunk propio de /producto/[id],
//     por ejemplo) y los agrega a la cola.
const CACHE_VERSION = "v2";
const CACHE_PAGINAS = `catalogo-paginas-${CACHE_VERSION}`;
const CACHE_ASSETS = `catalogo-assets-${CACHE_VERSION}`;
const CACHE_IMAGENES = `catalogo-imagenes-${CACHE_VERSION}`;
// Marca -> generadoEn del catálogo en el momento en que se descargó esa
// marca — para poder avisar "esta descarga quedó desactualizada" sin tener
// que volver a bajar todo para saberlo.
const LLAVE_DESCARGAS = "descarga-offline-marcas";
const CONCURRENCIA = 6;
const TIMEOUT_MS = 20000;

interface RespuestaListaMarcas {
  ok: boolean;
  generadoEn: string;
  marcas: string[];
  mensaje?: string;
}

interface RespuestaManifiesto {
  ok: boolean;
  generadoEn: string;
  marca: string;
  paginas: string[];
  imagenes: string[];
  mensaje?: string;
}

interface Item {
  url: string;
  cache: string;
}

type Estado = { fase: "inactivo" } | { fase: "descargando"; marca: string; hechos: number; total: number };

function leerDescargas(): Record<string, string> {
  try {
    const crudo = localStorage.getItem(LLAVE_DESCARGAS);
    return crudo ? (JSON.parse(crudo) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function guardarDescargas(d: Record<string, string>): void {
  try {
    localStorage.setItem(LLAVE_DESCARGAS, JSON.stringify(d));
  } catch {
    // localStorage lleno/deshabilitado — no crítico, solo se pierde el
    // indicador de "ya descargada"/"desactualizada" entre sesiones.
  }
}

function esAssetDeNext(url: URL): boolean {
  return url.origin === window.location.origin && url.pathname.startsWith("/_next/static/");
}

function esCrossOrigin(url: string): boolean {
  return new URL(url, window.location.href).origin !== window.location.origin;
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
  const [soportado, setSoportado] = useState(false);
  const [abierto, setAbierto] = useState(false);
  const [marcas, setMarcas] = useState<string[] | null>(null);
  const [cargandoMarcas, setCargandoMarcas] = useState(false);
  const [generadoEnActual, setGeneradoEnActual] = useState<string | null>(null);
  const [descargas, setDescargas] = useState<Record<string, string>>({});
  const [estado, setEstado] = useState<Estado>({ fase: "inactivo" });
  const enCurso = useRef(false);

  // Soporte del navegador + lo ya descargado (localStorage) solo se pueden
  // leer del lado del cliente — igual que en CarritoContext, no se evalúan
  // en el primer render para no arriesgar un mismatch de hidratación.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSoportado("caches" in window && "serviceWorker" in navigator);
    setDescargas(leerDescargas());
  }, []);

  // Si ya hay algo descargado, se adelanta la lista de marcas + la fecha
  // vigente del catálogo en segundo plano — así abrir el desplegable es
  // instantáneo y el puntito de "hay una versión más nueva" puede aparecer
  // sin que el vendedor tenga que abrir nada.
  useEffect(() => {
    if (!soportado || typeof navigator === "undefined" || !navigator.onLine) return;
    if (Object.keys(leerDescargas()).length === 0) return;

    fetch("/api/descarga/manifiesto", { cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<RespuestaListaMarcas>) : null))
      .then((data) => {
        if (data?.ok) {
          setGeneradoEnActual(data.generadoEn);
          setMarcas(data.marcas);
        }
      })
      .catch(() => {
        // Sin red o el endpoint falló — se reintenta la próxima vez que se
        // abra el desplegable.
      });
  }, [soportado]);

  async function cargarMarcas() {
    if (marcas || cargandoMarcas) return;
    setCargandoMarcas(true);
    try {
      const resp = await fetch("/api/descarga/manifiesto", { cache: "no-store" });
      const data: RespuestaListaMarcas = await resp.json();
      if (!resp.ok || !data.ok) throw new Error(data.mensaje ?? "No se pudo leer el catálogo.");
      setMarcas(data.marcas);
      setGeneradoEnActual(data.generadoEn);
    } catch (err) {
      logError("DescargaOffline.cargarMarcas", err);
      toast.error("No se pudo cargar la lista de marcas.");
    } finally {
      setCargandoMarcas(false);
    }
  }

  function alternarAbierto() {
    if (!abierto) cargarMarcas();
    setAbierto((v) => !v);
  }

  async function descargarMarca(marca: string) {
    if (enCurso.current) return;
    if (!navigator.onLine) {
      toast.error("Necesitás conexión para descargar.");
      return;
    }

    enCurso.current = true;
    setEstado({ fase: "descargando", marca, hechos: 0, total: 1 });
    const idToast = toast.loading(`Descargando "${marca}"…`);

    try {
      const respuestaManifiesto = await fetch(`/api/descarga/manifiesto?marca=${encodeURIComponent(marca)}`, {
        cache: "no-store",
      });
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
        setEstado({ fase: "descargando", marca, hechos, total: cola.length });
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

      const nuevasDescargas = { ...leerDescargas(), [marca]: manifiesto.generadoEn };
      guardarDescargas(nuevasDescargas);
      setDescargas(nuevasDescargas);
      setGeneradoEnActual(manifiesto.generadoEn);
      setEstado({ fase: "inactivo" });

      if (fallidos.length > 0) {
        toast.error(
          `"${marca}": se descargó la mayor parte (${cola.length - fallidos.length}/${cola.length}), pero ${fallidos.length} elemento${fallidos.length === 1 ? "" : "s"} falló. Volvé a intentar con mejor señal.`,
          { id: idToast },
        );
      } else {
        toast.success(`"${marca}" descargada — ${cola.length} elementos guardados para verla sin conexión.`, {
          id: idToast,
        });
      }
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : "No se pudo completar la descarga.";
      logError("DescargaOffline.descargarMarca", err);
      toast.error(mensaje, { id: idToast });
      setEstado({ fase: "inactivo" });
    } finally {
      enCurso.current = false;
    }
  }

  if (!soportado) return null;

  const descargando = estado.fase === "descargando";
  const marcaDescargando = estado.fase === "descargando" ? estado.marca : null;
  const porcentaje = estado.fase === "descargando" && estado.total > 0 ? Math.round((estado.hechos / estado.total) * 100) : 0;
  const hayAlgunaDescarga = Object.keys(descargas).length > 0;
  const hayDesactualizada =
    generadoEnActual !== null && Object.values(descargas).some((fecha) => fecha !== generadoEnActual);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={alternarAbierto}
        disabled={descargando}
        aria-expanded={abierto}
        aria-label={
          descargando
            ? `Descargando "${marcaDescargando}" — ${porcentaje}%`
            : hayAlgunaDescarga
              ? "Catálogo descargado — elegir marca para descargar"
              : "Descargar catálogo para verlo sin conexión"
        }
        title={hayDesactualizada ? "El catálogo cambió desde tu última descarga — volvé a descargar" : undefined}
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
          {hayAlgunaDescarga ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
              <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
              <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 19h16" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
          <span className="hidden sm:inline">
            {descargando ? `Descargando ${porcentaje}%` : hayAlgunaDescarga ? "Descargado" : "Descargar"}
          </span>
          {hayDesactualizada && !descargando && (
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent-600" aria-hidden="true" />
          )}
        </span>
      </button>

      {abierto && (
        <div className="absolute right-0 top-full z-30 mt-2 w-64 rounded-xl border border-ink-200 bg-paper-raised p-2 shadow-lg">
          <p className="px-2 pb-2 pt-1 text-xs text-ink-500">
            Elegí qué marca descargar para verla sin conexión. Podés descargar más de una, de a una por vez.
          </p>
          {cargandoMarcas ? (
            <div className="space-y-1.5 px-2 pb-2">
              <div className="skeleton h-8 rounded-lg" />
              <div className="skeleton h-8 rounded-lg" />
            </div>
          ) : marcas && marcas.length > 0 ? (
            <ul className="flex flex-col gap-0.5">
              {marcas.map((marca) => {
                const fechaDescarga = descargas[marca];
                const desactualizada = Boolean(fechaDescarga && generadoEnActual && fechaDescarga !== generadoEnActual);
                return (
                  <li key={marca}>
                    <button
                      type="button"
                      onClick={() => descargarMarca(marca)}
                      disabled={descargando}
                      className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-2 text-left text-sm text-ink-900 transition-colors hover:bg-ink-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <span>{marca}</span>
                      {estado.fase === "descargando" && estado.marca === marca ? (
                        <span className="text-[11px] font-medium text-ink-500">{porcentaje}%</span>
                      ) : desactualizada ? (
                        <span className="text-[11px] font-medium text-accent-600">Desactualizada</span>
                      ) : fechaDescarga ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className="shrink-0 text-ink-500">
                          <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      ) : (
                        <span className="text-[11px] text-ink-500">Descargar</span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="px-2 py-2 text-xs text-ink-500">No se pudo cargar el listado de marcas.</p>
          )}
        </div>
      )}
    </div>
  );
}
