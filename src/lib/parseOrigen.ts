// Parsing de los 3 orígenes que acepta el admin: CSV subido, XLSX subido, o un
// link de Google Sheets publicado como CSV. Todo corre en el servidor
// (route handler), nunca en el navegador, para evitar problemas de CORS con
// el link de Sheets.

import Papa from "papaparse";
import * as XLSX from "xlsx";
import type { FilaOrigen } from "./transform";

export interface ArchivoParseado {
  filas: FilaOrigen[];
  encabezados: string[];
}

// Los encabezados del export de SAP a veces traen espacios ocultos al
// principio/final (ej. " PV Fabrica " en vez de "PV Fabrica" — visto en el
// archivo real, probablemente por cómo Excel guardó celdas con texto en más
// de un "run" de formato). Sin esto, la columna "existe" para la validación
// (que sí compara con trim) pero el valor queda inaccesible por el nombre
// exacto en cada fila — se pierde en silencio. Se normaliza acá, una sola
// vez, para que el resto del código pueda asumir claves ya limpias.
function normalizarClaves(fila: FilaOrigen): FilaOrigen {
  const limpia: FilaOrigen = {};
  for (const [clave, valor] of Object.entries(fila)) {
    limpia[clave.trim()] = valor;
  }
  return limpia;
}

export function parsearCSV(texto: string): ArchivoParseado {
  const resultado = Papa.parse<FilaOrigen>(texto, { header: true, skipEmptyLines: true });
  return {
    filas: resultado.data.map(normalizarClaves),
    encabezados: (resultado.meta.fields ?? []).map((h) => h.trim()),
  };
}

/**
 * El export de SAP suele traer más de una hoja (por ejemplo, una tabla
 * dinámica de referencia antes que los datos reales). Se busca la hoja cuyo
 * encabezado contenga "ItemCode" — la firma de los datos reales — en vez de
 * asumir que siempre es la primera. Si ninguna calza, se usa la primera hoja
 * (compatibilidad con archivos más simples de una sola hoja).
 */
function elegirHoja(libro: XLSX.WorkBook): string | undefined {
  for (const nombre of libro.SheetNames) {
    const hoja = libro.Sheets[nombre];
    const [primeraFila] = XLSX.utils.sheet_to_json<unknown[]>(hoja, { header: 1, range: 0, blankrows: false });
    if (Array.isArray(primeraFila) && primeraFila.some((c) => String(c ?? "").trim() === "ItemCode")) {
      return nombre;
    }
  }
  return libro.SheetNames[0];
}

// Soporta .xlsx, .xls y .xlsm indistintamente: XLSX.read detecta el formato
// por contenido, no por extensión — un archivo con macros (.xlsm) se lee
// igual, las macros simplemente se ignoran (no se ejecutan).
export function parsearXLSX(buffer: ArrayBuffer): ArchivoParseado {
  const libro = XLSX.read(buffer, { type: "array" });
  const nombreHoja = elegirHoja(libro);
  if (!nombreHoja) return { filas: [], encabezados: [] };
  const hoja = libro.Sheets[nombreHoja];
  const filasCrudas = XLSX.utils.sheet_to_json<FilaOrigen>(hoja, { defval: "", raw: true });
  const filas = filasCrudas.map(normalizarClaves);
  const encabezadosDesdeFilas = filas.length > 0 ? Object.keys(filas[0]) : [];
  return { filas, encabezados: encabezadosDesdeFilas };
}

/**
 * Acepta el link de "Publicar en la web" de Google Sheets (formato CSV) y lo
 * trata como una URL remota de CSV. No usa la API de Google ni OAuth.
 */
export async function obtenerCSVDesdeURL(url: string): Promise<ArchivoParseado> {
  let urlValida: URL;
  try {
    urlValida = new URL(url);
  } catch {
    throw new Error("El link ingresado no es una URL válida.");
  }
  if (urlValida.protocol !== "https:") {
    throw new Error("El link debe ser https.");
  }

  const respuesta = await fetch(urlValida.toString());
  if (!respuesta.ok) {
    throw new Error(`No se pudo descargar el CSV del link (HTTP ${respuesta.status}).`);
  }
  const texto = await respuesta.text();
  return parsearCSV(texto);
}
