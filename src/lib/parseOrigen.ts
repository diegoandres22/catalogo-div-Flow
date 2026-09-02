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

export function parsearCSV(texto: string): ArchivoParseado {
  const resultado = Papa.parse<FilaOrigen>(texto, { header: true, skipEmptyLines: true });
  return { filas: resultado.data, encabezados: resultado.meta.fields ?? [] };
}

export function parsearXLSX(buffer: ArrayBuffer): ArchivoParseado {
  const libro = XLSX.read(buffer, { type: "array" });
  const nombreHoja = libro.SheetNames[0];
  if (!nombreHoja) return { filas: [], encabezados: [] };
  const hoja = libro.Sheets[nombreHoja];
  const filas = XLSX.utils.sheet_to_json<FilaOrigen>(hoja, { defval: "", raw: true });
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
