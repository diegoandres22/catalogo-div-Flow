// Service worker del catálogo — hecho a mano con la Cache API nativa, sin
// librerías (Workbox/Serwist requieren el plugin de webpack de Next, que no
// corre con Turbopack, el bundler que usa este proyecto — con eso, el
// service worker nunca se generaría en el build real).
//
// Objetivo: un vendedor que navegó el catálogo con señal en la ciudad puede
// seguir viendo esos mismos productos y fotos sin señal en el interior.
// Estrategia por tipo de recurso:
//  - Páginas del catálogo (HTML/RSC, mismo origen, no /api/): red primero,
//    caché como respaldo — siempre se ve la versión más nueva si hay señal,
//    y la última vista si no la hay.
//  - Fotos de producto (cdn.shopify.com) y assets estáticos de Next
//    (/_next/static/*, con hash — no cambian nunca): caché primero, se
//    guardan la primera vez que se piden.
//  - /api/* (en especial /api/admin/*): nunca se cachea — son llamadas que
//    mutan datos o requieren sesión, cachearlas sería activamente incorrecto.
//
// Se sube de versión (CACHE_VERSION) solo cuando cambia la lógica de este
// archivo — no hace falta tocarlo cuando solo cambia el catálogo (Vercel
// Blob), eso ya lo resuelve la estrategia "red primero" de arriba.
const CACHE_VERSION = "v1";
const CACHE_PAGINAS = `catalogo-paginas-${CACHE_VERSION}`;
const CACHE_ASSETS = `catalogo-assets-${CACHE_VERSION}`;
const CACHE_IMAGENES = `catalogo-imagenes-${CACHE_VERSION}`;
const CACHES_VIGENTES = new Set([CACHE_PAGINAS, CACHE_ASSETS, CACHE_IMAGENES]);
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (evento) => {
  self.skipWaiting();
  evento.waitUntil(
    caches.open(CACHE_PAGINAS).then((cache) => cache.add(OFFLINE_URL).catch(() => {
      // No crítico: si falla precachear el offline.html (ej. primera
      // instalación sin red), igual el resto del service worker funciona.
    })),
  );
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((nombres) =>
        Promise.all(nombres.filter((n) => !CACHES_VIGENTES.has(n)).map((n) => caches.delete(n))),
      ),
    ]),
  );
});

function esAssetEstaticoDeNext(url) {
  return url.origin === self.location.origin && url.pathname.startsWith("/_next/static/");
}

function esFotoDeProducto(url) {
  return url.hostname === "cdn.shopify.com";
}

function esRutaAdmin(url) {
  return url.pathname.startsWith("/api/") || url.pathname.startsWith("/admin");
}

async function redPrimeroConRespaldo(peticion) {
  const cache = await caches.open(CACHE_PAGINAS);
  try {
    const respuesta = await fetch(peticion);
    if (respuesta && respuesta.ok) cache.put(peticion, respuesta.clone());
    return respuesta;
  } catch {
    const enCache = await cache.match(peticion);
    if (enCache) return enCache;
    // Ni red ni caché: si era una navegación (el vendedor entrando a un
    // producto/página que nunca visitó con señal), mostramos una página
    // propia explicando la situación en vez del error genérico del
    // navegador.
    if (peticion.mode === "navigate") {
      const offline = await cache.match(OFFLINE_URL);
      if (offline) return offline;
    }
    throw new Error("Sin conexión y sin versión guardada para: " + peticion.url);
  }
}

async function cachePrimero(peticion, nombreCache) {
  const cache = await caches.open(nombreCache);
  const enCache = await cache.match(peticion);
  if (enCache) return enCache;
  // Sin modo "cors": las fotos vienen de cdn.shopify.com sin cabeceras CORS
  // habilitadas para este sitio — la respuesta llega "opaca" (no se puede
  // leer su contenido ni status), pero la Cache API igual la puede guardar
  // y servir tal cual, que es exactamente lo que hace un <img> normal.
  const respuesta = await fetch(peticion);
  cache.put(peticion, respuesta.clone());
  return respuesta;
}

self.addEventListener("fetch", (evento) => {
  const peticion = evento.request;
  if (peticion.method !== "GET") return; // POST/PUT (cargas del admin, etc.) siempre van directo a la red

  const url = new URL(peticion.url);

  if (esRutaAdmin(url)) return; // se deja pasar sin intervenir — nunca se cachea el panel admin ni sus llamadas

  if (esAssetEstaticoDeNext(url) || esFotoDeProducto(url)) {
    evento.respondWith(cachePrimero(peticion, esFotoDeProducto(url) ? CACHE_IMAGENES : CACHE_ASSETS));
    return;
  }

  if (url.origin === self.location.origin) {
    evento.respondWith(redPrimeroConRespaldo(peticion));
  }
});
