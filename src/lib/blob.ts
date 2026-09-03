// Acceso al catálogo en Vercel Blob. No hay base de datos: todo vive en JSON.
//
// Claves fijas dentro del store de Blob:
//  - catalogo.json          -> catálogo publicado, el que lee el sitio público
//  - catalogo-backup.json   -> respaldo de un solo paso atrás del catálogo anterior
//  - catalogo-pending.json  -> resultado parseado de la última carga del admin,
//                              a la espera de que confirme "Reemplazar catálogo"

import { del, get, put } from "@vercel/blob";
import type { Catalogo } from "./types";
import { logError, pistaBlob } from "./logger";

const CATALOGO_KEY = "catalogo.json";
const BACKUP_KEY = "catalogo-backup.json";
const PENDING_KEY = "catalogo-pending.json";

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

/**
 * Promueve el catálogo pendiente a catálogo publicado:
 *  1) respalda el catálogo actual (si existe) en catalogo-backup.json,
 *  2) sobrescribe catalogo.json con el pendiente,
 *  3) limpia el pendiente.
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
  }

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
  return backup;
}
