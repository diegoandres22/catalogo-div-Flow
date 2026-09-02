// Acceso al catálogo en Vercel Blob. No hay base de datos: todo vive en JSON.
//
// Claves fijas dentro del store de Blob:
//  - catalogo.json          -> catálogo publicado, el que lee el sitio público
//  - catalogo-backup.json   -> respaldo de un solo paso atrás del catálogo anterior
//  - catalogo-pending.json  -> resultado parseado de la última carga del admin,
//                              a la espera de que confirme "Reemplazar catálogo"

import { del, get, put } from "@vercel/blob";
import type { Catalogo } from "./types";

const CATALOGO_KEY = "catalogo.json";
const BACKUP_KEY = "catalogo-backup.json";
const PENDING_KEY = "catalogo-pending.json";

async function leerJson<T>(key: string): Promise<T | null> {
  try {
    const resultado = await get(key, { access: "private", useCache: false });
    if (!resultado || resultado.statusCode !== 200) return null;
    const texto = await new Response(resultado.stream).text();
    return JSON.parse(texto) as T;
  } catch {
    // BlobNotFoundError u otros -> tratamos como "no existe todavía"
    return null;
  }
}

async function escribirJson(key: string, data: unknown): Promise<void> {
  await put(key, JSON.stringify(data), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
}

export async function leerCatalogoPublico(): Promise<Catalogo | null> {
  return leerJson<Catalogo>(CATALOGO_KEY);
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
  } catch {
    // no crítico: si falla la limpieza del pendiente, el catálogo ya quedó reemplazado
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
