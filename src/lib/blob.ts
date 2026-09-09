// Acceso al catálogo en Vercel Blob. No hay base de datos: todo vive en JSON.
//
// Claves fijas dentro del store de Blob:
//  - catalogo.json          -> catálogo publicado, el que lee el sitio público
//  - catalogo-backup.json   -> respaldo de un solo paso atrás del catálogo anterior
//  - catalogo-pending.json  -> resultado parseado de la última carga del admin,
//                              a la espera de que confirme "Reemplazar catálogo"

import { del, get, list, put } from "@vercel/blob";
import type { Catalogo, Coleccion, ConfigSitio, EntradaHistorial, GuiaTallas, ResumenImportacion } from "./types";
import { logError, pistaBlob } from "./logger";

const CATALOGO_KEY = "catalogo.json";
const BACKUP_KEY = "catalogo-backup.json";
const PENDING_KEY = "catalogo-pending.json";
// El resumen (incluye la cantidad de errores/filas excluidas) de la carga
// pendiente — separado del catálogo pendiente en sí porque ResumenImportacion
// no es parte de Catalogo. Se usa para construir la entrada de historial al
// confirmar (ver agregarEntradaHistorial más abajo).
const PENDING_RESUMEN_KEY = "catalogo-pending-resumen.json";

// Guía de tallas: NO es parte del catálogo (no cambia con cada carga de
// Excel) — es una config aparte que el admin sube una sola vez desde su
// propio apartado del panel. Ver GuiaTallasConfig.tsx y
// /api/admin/guia-tallas.
const GUIA_TALLAS_KEY = "guia-tallas.json";

// Colecciones de la home (tarjetas "Volpe", "Kriza + Accesorios", etc.) —
// mismo criterio que la guía de tallas: no es parte del catálogo (no cambia
// con cada carga de Excel), el admin la administra aparte desde
// /admin/colecciones. Ver lib/coleccion.ts para el filtro/conteo y
// ColeccionesHome.tsx para el render público.
const COLECCIONES_KEY = "colecciones.json";

// Archivo crudo (.csv/.xlsx) de la carga que generó el catálogo publicado —
// para que el admin pueda descargar "el archivo que se usó" sin tener que
// guardar su propia copia local. Mismo patrón pendiente->confirmado que el
// catálogo: se guarda "pending" al subir, se promueve al confirmar.
const ARCHIVO_ORIGINAL_KEY = "catalogo-original.bin";
const ARCHIVO_ORIGINAL_META_KEY = "catalogo-original-meta.json";
const ARCHIVO_ORIGINAL_PENDIENTE_KEY = "catalogo-pending-original.bin";
const ARCHIVO_ORIGINAL_PENDIENTE_META_KEY = "catalogo-pending-original-meta.json";

async function leerJson<T>(key: string): Promise<T | null> {
  try {
    const resultado = await get(key, { access: "private", useCache: false });
    if (!resultado || resultado.statusCode !== 200) return null;
    const texto = await new Response(resultado.stream).text();
    return JSON.parse(texto) as T;
  } catch (err) {
    const mensaje = err instanceof Error ? err.message : String(err);
    // BlobNotFoundError es normal (todavía no existe ese archivo en Blob) —
    // cualquier otro error sí se registra, porque puede estar tapando un
    // problema real de configuración (por ejemplo, credenciales).
    if (!/BlobNotFoundError|not_found/i.test(mensaje)) {
      logError(`lib/blob.leerJson(${key})`, err, pistaBlob(mensaje));
    }
    return null;
  }
}

async function escribirJson(key: string, data: unknown): Promise<void> {
  try {
    await put(key, JSON.stringify(data), {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
    });
  } catch (err) {
    const mensaje = err instanceof Error ? err.message : String(err);
    logError(`lib/blob.escribirJson(${key})`, err, pistaBlob(mensaje));
    throw err;
  }
}

async function leerBinario(key: string): Promise<ArrayBuffer | null> {
  try {
    const resultado = await get(key, { access: "private", useCache: false });
    if (!resultado || resultado.statusCode !== 200) return null;
    return await new Response(resultado.stream).arrayBuffer();
  } catch (err) {
    const mensaje = err instanceof Error ? err.message : String(err);
    if (!/BlobNotFoundError|not_found/i.test(mensaje)) {
      logError(`lib/blob.leerBinario(${key})`, err, pistaBlob(mensaje));
    }
    return null;
  }
}

async function escribirBinario(key: string, data: ArrayBuffer, contentType: string): Promise<void> {
  try {
    await put(key, data, {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType,
    });
  } catch (err) {
    const mensaje = err instanceof Error ? err.message : String(err);
    logError(`lib/blob.escribirBinario(${key})`, err, pistaBlob(mensaje));
    throw err;
  }
}

async function borrarSiExiste(key: string): Promise<void> {
  try {
    await del(key);
  } catch {
    // No crítico — probablemente ya no existía (nada que borrar).
  }
}

export async function leerCatalogoPublico(): Promise<Catalogo | null> {
  return leerJson<Catalogo>(CATALOGO_KEY);
}

export interface MetaArchivoOriginal {
  nombreArchivo: string;
  contentType: string;
}

export interface ArchivoOriginal {
  bytes: ArrayBuffer;
  meta: MetaArchivoOriginal;
}

/** Guarda el archivo crudo de la carga en curso, a la espera de que se confirme. */
export async function guardarArchivoOriginalPendiente(bytes: ArrayBuffer, meta: MetaArchivoOriginal): Promise<void> {
  try {
    await escribirBinario(ARCHIVO_ORIGINAL_PENDIENTE_KEY, bytes, meta.contentType);
    await escribirJson(ARCHIVO_ORIGINAL_PENDIENTE_META_KEY, meta);
  } catch (err) {
    // No debe tumbar la importación si esto falla — el catálogo en sí ya se
    // guardó bien; solo se pierde la posibilidad de descargar el archivo.
    const mensaje = err instanceof Error ? err.message : String(err);
    logError("lib/blob.guardarArchivoOriginalPendiente", err, pistaBlob(mensaje));
  }
}

/** Origen "Google Sheets": no hay archivo que guardar — limpia cualquier pendiente de una carga anterior. */
export async function limpiarArchivoOriginalPendiente(): Promise<void> {
  await borrarSiExiste(ARCHIVO_ORIGINAL_PENDIENTE_KEY);
  await borrarSiExiste(ARCHIVO_ORIGINAL_PENDIENTE_META_KEY);
}

/** El archivo (.csv/.xlsx) que generó el catálogo actualmente publicado, si lo hay. */
export async function leerArchivoOriginal(): Promise<ArchivoOriginal | null> {
  const meta = await leerJson<MetaArchivoOriginal>(ARCHIVO_ORIGINAL_META_KEY);
  if (!meta) return null;
  const bytes = await leerBinario(ARCHIVO_ORIGINAL_KEY);
  if (!bytes) return null;
  return { bytes, meta };
}

export async function guardarCatalogoPendiente(catalogo: Catalogo): Promise<void> {
  await escribirJson(PENDING_KEY, catalogo);
}

export async function leerCatalogoPendiente(): Promise<Catalogo | null> {
  return leerJson<Catalogo>(PENDING_KEY);
}

/** Resumen (errores incluidos) de la carga pendiente — ver PENDING_RESUMEN_KEY. */
export async function guardarResumenPendiente(resumen: ResumenImportacion): Promise<void> {
  await escribirJson(PENDING_RESUMEN_KEY, resumen);
}

export async function leerResumenPendiente(): Promise<ResumenImportacion | null> {
  return leerJson<ResumenImportacion>(PENDING_RESUMEN_KEY);
}

/**
 * Promueve el catálogo pendiente a catálogo publicado:
 *  1) respalda el catálogo actual (si existe) en catalogo-backup.json,
 *  2) sobrescribe catalogo.json con el pendiente,
 *  3) limpia el pendiente,
 *  4) registra la carga en el historial (ver agregarEntradaHistorial).
 */
export async function confirmarReemplazoCatalogo(): Promise<Catalogo> {
  const pendiente = await leerCatalogoPendiente();
  if (!pendiente) {
    throw new Error("No hay un catálogo pendiente por confirmar. Vuelve a cargar el archivo.");
  }

  const actual = await leerCatalogoPublico();
  if (actual) {
    await escribirJson(BACKUP_KEY, actual);
  }

  await escribirJson(CATALOGO_KEY, pendiente);

  // Se lee ANTES de limpiar el pendiente — es lo único que sabe cuántas
  // filas se excluyeron en esta carga (Catalogo no lo trae).
  const resumenPendiente = await leerResumenPendiente();
  const metaArchivoPendiente = await leerJson<MetaArchivoOriginal>(ARCHIVO_ORIGINAL_PENDIENTE_META_KEY);

  try {
    await del(PENDING_KEY);
  } catch (err) {
    // no crítico: si falla la limpieza del pendiente, el catálogo ya quedó reemplazado
    logError(
      "lib/blob.confirmarReemplazoCatalogo (limpieza)",
      err,
      "No se pudo borrar catalogo-pending.json después de confirmar — no afecta el catálogo publicado, pero conviene borrarlo a mano desde Vercel → Storage.",
    );
  }

  // Promueve el archivo original (.csv/.xlsx) igual que el catálogo. Si la
  // carga vino de un link de Google Sheets no hay archivo pendiente — se
  // borra el que hubiera quedado de una carga anterior, para no ofrecer
  // para descargar un archivo que ya no corresponde al catálogo publicado.
  try {
    const metaPendiente = await leerJson<MetaArchivoOriginal>(ARCHIVO_ORIGINAL_PENDIENTE_META_KEY);
    if (metaPendiente) {
      const bytesPendiente = await leerBinario(ARCHIVO_ORIGINAL_PENDIENTE_KEY);
      if (bytesPendiente) {
        await escribirBinario(ARCHIVO_ORIGINAL_KEY, bytesPendiente, metaPendiente.contentType);
        await escribirJson(ARCHIVO_ORIGINAL_META_KEY, metaPendiente);
      }
    } else {
      await borrarSiExiste(ARCHIVO_ORIGINAL_KEY);
      await borrarSiExiste(ARCHIVO_ORIGINAL_META_KEY);
    }
  } catch (err) {
    // no crítico: el catálogo ya quedó reemplazado igual, solo afecta la descarga del archivo
    const mensaje = err instanceof Error ? err.message : String(err);
    logError("lib/blob.confirmarReemplazoCatalogo (archivo original)", err, pistaBlob(mensaje));
  } finally {
    await limpiarArchivoOriginalPendiente();
    await borrarSiExiste(PENDING_RESUMEN_KEY);
  }

  await agregarEntradaHistorial({
    id: String(Date.now()),
    fecha: new Date().toISOString(),
    origen: metaArchivoPendiente ? "archivo" : "google_sheets",
    nombreArchivo: metaArchivoPendiente?.nombreArchivo ?? null,
    totalProductos: pendiente.totalProductos,
    totalVariantes: pendiente.totalVariantes,
    totalErrores: resumenPendiente?.errores.length ?? 0,
    totalSinFoto: resumenPendiente?.errores.filter((e) => /sin foto/i.test(e.motivo)).length ?? 0,
  });

  return pendiente;
}

export async function leerCatalogoBackup(): Promise<Catalogo | null> {
  return leerJson<Catalogo>(BACKUP_KEY);
}

/** Revierte manualmente al respaldo (catalogo-backup.json), si existe. */
export async function revertirABackup(): Promise<Catalogo> {
  const backup = await leerCatalogoBackup();
  if (!backup) {
    throw new Error("No hay respaldo disponible para revertir.");
  }
  await escribirJson(CATALOGO_KEY, backup);

  // Un revert también es un cambio real al catálogo publicado — queda en el
  // historial igual que una carga, con origen "revertir" para distinguirla
  // (no hubo archivo ni errores propios: son los del catálogo restaurado).
  await agregarEntradaHistorial({
    id: String(Date.now()),
    fecha: new Date().toISOString(),
    origen: "revertir",
    nombreArchivo: null,
    totalProductos: backup.totalProductos,
    totalVariantes: backup.totalVariantes,
    totalErrores: 0,
    totalSinFoto: 0,
  });

  return backup;
}

/** Config actual de la guía de tallas (instrucciones + tabla). Nunca falta: si no se configuró aún, ambos campos vienen en null. */
export async function leerGuiaTallas(): Promise<GuiaTallas> {
  return (await leerJson<GuiaTallas>(GUIA_TALLAS_KEY)) ?? { instrucciones: null, tabla: null };
}

export async function guardarGuiaTallas(guia: GuiaTallas): Promise<void> {
  await escribirJson(GUIA_TALLAS_KEY, guia);
}

/**
 * Sube una imagen con acceso público (a diferencia del resto de las claves
 * de este archivo, que son privadas) — la necesita el navegador del
 * comprador para poder mostrarla directo en /producto/[id], sin pasar por
 * el servidor. Se usa solo para las imágenes de la guía de tallas que el
 * admin sube desde su panel (no para el catálogo, cuyas fotos ya vienen
 * como URLs externas del Excel).
 */
export async function subirImagenGuiaTallas(nombre: string, bytes: ArrayBuffer, contentType: string): Promise<string> {
  const resultado = await put(`guia-tallas/${nombre}`, bytes, {
    access: "public",
    addRandomSuffix: true,
    contentType,
  });
  return resultado.url;
}

export async function leerColecciones(): Promise<Coleccion[]> {
  return (await leerJson<Coleccion[]>(COLECCIONES_KEY)) ?? [];
}

export async function guardarColecciones(colecciones: Coleccion[]): Promise<void> {
  await escribirJson(COLECCIONES_KEY, colecciones);
}

/** Mismo patrón que subirImagenGuiaTallas: acceso público, la necesita el navegador del comprador para pintar la portada en la home sin pasar por el servidor. */
export async function subirImagenColeccion(nombre: string, bytes: ArrayBuffer, contentType: string): Promise<string> {
  const resultado = await put(`colecciones/${nombre}`, bytes, {
    access: "public",
    addRandomSuffix: true,
    contentType,
  });
  return resultado.url;
}

// --- Historial de cargas -----------------------------------------------
// Un archivo JSON por carga confirmada, bajo el prefijo "historial/" — no
// una sola lista que se reescribe entera en cada carga (eso arriesgaría
// perder historial viejo si dos cargas se confirman casi al mismo tiempo).
// El nombre de archivo es el id (timestamp en ms): al ser todos del mismo
// largo mientras dure este milenio, ordenar por nombre = ordenar por fecha.
const HISTORIAL_PREFIJO = "historial/";
const HISTORIAL_LIMITE_LISTADO = 50; // más que suficiente para lo que el panel muestra; evita listar sin límite si el historial crece mucho

async function agregarEntradaHistorial(entrada: EntradaHistorial): Promise<void> {
  try {
    await escribirJson(`${HISTORIAL_PREFIJO}${entrada.id}.json`, entrada);
  } catch (err) {
    // No debe tumbar la confirmación/reversión si esto falla — el catálogo
    // en sí ya quedó publicado; solo se pierde ese registro del historial.
    const mensaje = err instanceof Error ? err.message : String(err);
    logError("lib/blob.agregarEntradaHistorial", err, pistaBlob(mensaje));
  }
}

/** Las cargas confirmadas más recientes primero (más nuevo primero). */
export async function leerHistorial(limite = 20): Promise<EntradaHistorial[]> {
  try {
    const { blobs } = await list({ prefix: HISTORIAL_PREFIJO, limit: HISTORIAL_LIMITE_LISTADO });
    const ordenados = [...blobs].sort((a, b) => (a.pathname < b.pathname ? 1 : -1));
    const entradas = await Promise.all(
      ordenados.slice(0, limite).map((b) => leerJson<EntradaHistorial>(b.pathname)),
    );
    return entradas.filter((e): e is EntradaHistorial => e !== null);
  } catch (err) {
    const mensaje = err instanceof Error ? err.message : String(err);
    logError("lib/blob.leerHistorial", err, pistaBlob(mensaje));
    return [];
  }
}

// --- Configuración del sitio ---------------------------------------------
// Valores operativos editables desde /admin/configuracion (WhatsApp de
// ventas, datos de contacto del footer) que antes solo se podían cambiar
// desde Vercel (variable de entorno) o estaban fijos en el código. Todos
// los campos son opcionales — si no están configurados acá, cada lugar que
// los usa cae a su valor por defecto (ver CONFIG_VACIA).
const CONFIG_SITIO_KEY = "config-sitio.json";

export const CONFIG_SITIO_VACIA: ConfigSitio = { whatsappVentas: null, descripcionEmpresa: null, rif: null };

export async function leerConfigSitio(): Promise<ConfigSitio> {
  return (await leerJson<ConfigSitio>(CONFIG_SITIO_KEY)) ?? CONFIG_SITIO_VACIA;
}

export async function guardarConfigSitio(config: ConfigSitio): Promise<void> {
  await escribirJson(CONFIG_SITIO_KEY, config);
}
