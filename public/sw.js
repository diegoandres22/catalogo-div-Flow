// Service worker del catálogo — hecho a mano con la Cache API nativa, sin
// librerías (Workbox/Serwist requieren el plugin de webpack de Next, que no
// corre con Turbopack, el bundler que usa este proyecto — con eso, el
// service worker nunca se generaría en el build real).
//
// v2: el service worker YA NO escribe caché ambientalmente (antes guardaba
// cada página/foto que el vendedor visitaba con señal). Ahora es de SOLO
// LECTURA — toda la escritura pasa por el botón explícito de descarga
// (ver DescargaOffline.tsx), que es la ÚNICA forma de guardar contenido
// para verlo offline. Esto evita que un vendedor crea que "ya descargó" el
// catálogo simplemente por haber navegado un rato con señal, cuando en
// realidad solo quedaron guardadas las páginas puntuales que abrió.
//
// Estrategia por tipo de recurso:
//  - Páginas del catálogo (HTML, navegación, mismo origen, no /api/): red
//    primero (siempre la versión más nueva si hay señal), y si la red
//    falla, se lee de la caché de páginas SIN escribir nada — con tres
//    niveles de respaldo (ver navegarConRespaldo). La descarga ahora es POR
//    MARCA (ver DescargaOffline.tsx: con ~1600+ variantes, todo el catálogo
//    de una vez es demasiado), así que no hay una única "grilla completa"
//    fija — puede haber cero, una o varias marcas descargadas:
//      1) la página exacta, si fue descargada;
//      2) si la URL es "/" con algún filtro/colección que no se descargó
//         puntualmente, CUALQUIER grilla por marca ya descargada
//         ("/?marca=…") sirve de mejor esfuerzo — normalmente hay una sola;
//      3) la landing ("/" sin query), si se descargó;
//      4) offline.html, si ninguna de las anteriores está.
//  - Fotos de producto (cdn.shopify.com), portadas servidas por
//    /api/imagenes/*, y los logos de marca del Footer (/marcas/*.png):
//    solo lectura de caché — si no están, se pide a la red (sin guardar la
//    respuesta).
//  - Assets estáticos de Next (/_next/static/*, con hash — no cambian
//    nunca): misma lógica de solo lectura.
//  - /api/* (salvo /api/imagenes/*, ver arriba) y /admin/*: nunca se toca —
//    son llamadas que mutan datos o requieren sesión, o el panel admin en
//    sí, que no tiene sentido offline.
//
// Se sube de versión (CACHE_VERSION) cuando cambia la lógica de este
// archivo — no hace falta tocarlo cuando solo cambia el catálogo (Vercel
// Blob) ni cuando el vendedor vuelve a descargar (eso reescribe las mismas
// claves de caché, sin subir de versión).
const CACHE_VERSION = "v2";
const CACHE_PAGINAS = `catalogo-paginas-${CACHE_VERSION}`;
const CACHE_ASSETS = `catalogo-assets-${CACHE_VERSION}`;
const CACHE_IMAGENES = `catalogo-imagenes-${CACHE_VERSION}`;
const CACHES_VIGENTES = new Set([CACHE_PAGINAS, CACHE_ASSETS, CACHE_IMAGENES]);
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (evento) => {
  self.skipWaiting();
  // offline.html es infraestructura del propio service worker (la página de
  // "no guardada" que se muestra cuando falla todo lo demás), no "contenido"
  // del catálogo — se sigue precacheando sola al instalar, sin depender del
  // botón de descarga. Es la única excepción a "solo el botón escribe caché".
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

// Logos de marca del Footer (public/marcas/*.png, mismo origen) — el
// componente los pide con "unoptimized" (ver Footer.tsx) para que el <img>
// real apunte acá directo y no a /_next/image?..., que es una URL dinámica
// imposible de precachear de forma confiable.
function esLogoDeMarca(url) {
  return url.origin === self.location.origin && url.pathname.startsWith("/marcas/");
}

// Puente propio hacia imágenes privadas (portadas de colección, guía de
// tallas) — ver la nota grande en lib/blob.ts. Vive bajo /api/ pero SÍ debe
// cachearse: a diferencia del resto de /api/*, no muta nada ni requiere
// sesión, y sin esto las portadas de colección nunca quedaban guardadas
// para verse offline (quedaban siempre excluidas por esRutaAdmin).
function esImagenProxeada(url) {
  return url.origin === self.location.origin && url.pathname.startsWith("/api/imagenes/");
}

function esRutaAdmin(url) {
  return (url.pathname.startsWith("/api/") && !esImagenProxeada(url)) || url.pathname.startsWith("/admin");
}

// Página cacheada exacta si existe; si es "/" con query (colección/filtro
// que no se descargó puntualmente) cae a cualquier grilla por marca ya
// descargada, y si no a la landing ("/" sin query); por último offline.html.
// Nunca escribe caché — ver la nota grande de arriba.
async function buscarPaginaEnCache(cache, peticion, url) {
  const enCache = await cache.match(peticion);
  if (enCache) return enCache;

  if (url.origin === self.location.origin && url.pathname === "/") {
    const claves = await cache.keys();
    // Normalmente hay una sola marca descargada — con más de una, cualquiera
    // sirve igual de bien como "mejor esfuerzo" (no es la colección exacta
    // que se pidió, pero es mejor que offline.html).
    const grillaPorMarca = claves.find((r) => {
      const u = new URL(r.url);
      return u.origin === self.location.origin && u.pathname === "/" && u.searchParams.has("marca");
    });
    if (grillaPorMarca) {
      const respuesta = await cache.match(grillaPorMarca);
      if (respuesta) return respuesta;
    }

    const landing = await cache.match("/");
    if (landing) return landing;
  }

  return cache.match(OFFLINE_URL);
}

async function navegarConRespaldo(peticion) {
  const cache = await caches.open(CACHE_PAGINAS);
  const url = new URL(peticion.url);
  try {
    const respuesta = await fetch(peticion);
    if (respuesta) return respuesta;
    throw new Error("Respuesta vacía de red");
  } catch {
    const respaldo = await buscarPaginaEnCache(cache, peticion, url);
    if (respaldo) return respaldo;
    throw new Error("Sin conexión y sin versión guardada para: " + peticion.url);
  }
}

async function soloLecturaDeCache(peticion, nombreCache) {
  const cache = await caches.open(nombreCache);
  const enCache = await cache.match(peticion);
  if (enCache) return enCache;
  // No estaba descargada — se deja pasar a la red tal cual, sin guardar la
  // respuesta (eso ahora es trabajo exclusivo del botón de descarga).
  return fetch(peticion);
}

self.addEventListener("fetch", (evento) => {
  const peticion = evento.request;
  if (peticion.method !== "GET") return; // POST/PUT (cargas del admin, etc.) siempre van directo a la red

  const url = new URL(peticion.url);

  if (esRutaAdmin(url)) return; // se deja pasar sin intervenir — nunca se cachea el panel admin ni sus llamadas mutantes

  if (esAssetEstaticoDeNext(url) || esFotoDeProducto(url) || esImagenProxeada(url) || esLogoDeMarca(url)) {
    evento.respondWith(soloLecturaDeCache(peticion, esAssetEstaticoDeNext(url) ? CACHE_ASSETS : CACHE_IMAGENES));
    return;
  }

  if (url.origin === self.location.origin) {
    evento.respondWith(navegarConRespaldo(peticion));
  }
});
