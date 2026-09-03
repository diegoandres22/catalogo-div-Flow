import { NextRequest, NextResponse } from "next/server";
import { guardarCatalogoPendiente, guardarArchivoOriginalPendiente, limpiarArchivoOriginalPendiente } from "@/lib/blob";
import { obtenerCSVDesdeURL, parsearCSV, parsearXLSX, type ArchivoParseado } from "@/lib/parseOrigen";
import { transformarFilas, validarColumnas } from "@/lib/transform";
import type { ResumenImportacion } from "@/lib/types";
import { logError, pistaBlob } from "@/lib/logger";

// El archivo llega directo en el body del pedido (multipart/form-data) — pasa
// por esta función serverless, así que está sujeto al límite de tamaño de
// body de Vercel (4.5 MB). Antes se subía directo del navegador a Vercel
// Blob para evitar ese límite, pero ese camino (vercel.com/api/blob) está
// devolviendo respuestas sin cabecera CORS en este proyecto — un problema
// del lado de Vercel, no de este código — así que se volvió a este camino
// más simple mientras eso no se resuelva. Un archivo de precios de Excel
// entra sin problema en 4.5 MB.
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const tipo = String(formData.get("tipo") ?? "");

    let parseado: ArchivoParseado;
    // Bytes crudos del archivo subido (si vino de csv/xlsx), para poder
    // ofrecerlo después como descarga desde el panel admin — ver
    // guardarArchivoOriginalPendiente más abajo.
    let archivoOriginal: { bytes: ArrayBuffer; nombreArchivo: string; contentType: string } | null = null;

    if (tipo === "csv" || tipo === "xlsx") {
      const archivo = formData.get("archivo");
      if (!(archivo instanceof File)) {
        logError("api/admin/upload", "El pedido llegó sin archivo adjunto en el campo 'archivo'.");
        return NextResponse.json({ ok: false, mensaje: "Falta el archivo." }, { status: 400 });
      }
      const bytes = await archivo.arrayBuffer();
      archivoOriginal = {
        bytes,
        nombreArchivo: archivo.name || (tipo === "csv" ? "catalogo.csv" : "catalogo.xlsx"),
        contentType:
          archivo.type ||
          (tipo === "csv" ? "text/csv" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),
      };
      parseado = tipo === "csv" ? parsearCSV(new TextDecoder("utf-8").decode(bytes)) : parsearXLSX(bytes);
    } else if (tipo === "sheet") {
      const url = String(formData.get("url") ?? "").trim();
      if (!url) {
        return NextResponse.json({ ok: false, mensaje: "Falta el link de Google Sheets." }, { status: 400 });
      }
      parseado = await obtenerCSVDesdeURL(url);
    } else {
      logError("api/admin/upload", `Tipo de origen inválido: "${tipo}" (se esperaba "csv", "xlsx" o "sheet").`);
      return NextResponse.json({ ok: false, mensaje: "Origen de datos inválido." }, { status: 400 });
    }

    if (parseado.filas.length === 0) {
      logError(
        "api/admin/upload",
        "El archivo se leyó bien pero no tiene ninguna fila de datos.",
        "Revisá que el archivo no esté vacío y que la primera fila tenga los encabezados de columna (no datos ya corridos).",
      );
      const resumen: ResumenImportacion = {
        ok: false,
        totalFilasOrigen: 0,
        totalProductos: 0,
        totalVariantes: 0,
        errores: [],
        mensaje: "El archivo no tiene filas de datos.",
      };
      return NextResponse.json({ ok: false, resumen }, { status: 422 });
    }

    const columnasFaltantes = validarColumnas(parseado.encabezados);
    if (columnasFaltantes.length > 0) {
      logError(
        "api/admin/upload",
        `Faltan columnas obligatorias: ${columnasFaltantes.join(", ")}. Encabezados encontrados: ${parseado.encabezados.join(", ")}.`,
        "Revisá que el encabezado del archivo tenga exactamente esos nombres de columna (mayúsculas/minúsculas y guiones bajos incluidos, sin espacios de más).",
      );
      const resumen: ResumenImportacion = {
        ok: false,
        totalFilasOrigen: parseado.filas.length,
        totalProductos: 0,
        totalVariantes: 0,
        errores: [],
        columnasFaltantes,
        mensaje: `Faltan columnas obligatorias: ${columnasFaltantes.join(", ")}`,
      };
      return NextResponse.json({ ok: false, resumen }, { status: 422 });
    }

    const { catalogo, resumen } = transformarFilas(parseado.filas, parseado.filas.length);

    if (!catalogo) {
      logError(
        "api/admin/upload",
        `El archivo se procesó pero ningún producto pasó las validaciones (${resumen.errores.length} fila(s) con error).`,
        "Mirá el detalle de 'errores' en la respuesta — cada uno dice el motivo puntual por fila.",
      );
      return NextResponse.json({ ok: false, resumen }, { status: 422 });
    }

    // Se guarda como "pendiente": el admin todavía tiene que confirmar el
    // reemplazo. El catálogo publicado no se toca hasta ese momento.
    await guardarCatalogoPendiente(catalogo);

    // Igual que el catálogo, el archivo crudo (si vino de csv/xlsx) queda
    // "pendiente" hasta confirmar — se promueve junto con el catálogo en
    // confirmarReemplazoCatalogo(). Si el origen fue un link de Google
    // Sheets no hay archivo que guardar; se limpia cualquier pendiente de
    // una carga anterior para no dejar un archivo desactualizado a mitad de
    // camino.
    if (archivoOriginal) {
      await guardarArchivoOriginalPendiente(archivoOriginal.bytes, {
        nombreArchivo: archivoOriginal.nombreArchivo,
        contentType: archivoOriginal.contentType,
      });
    } else {
      await limpiarArchivoOriginalPendiente();
    }

    return NextResponse.json({ ok: true, resumen });
  } catch (err) {
    const mensaje = err instanceof Error ? err.message : "Error inesperado al procesar el archivo.";
    logError("api/admin/upload", err, pistaBlob(mensaje));

    // El body de una función serverless de Vercel no puede superar ~4.5 MB —
    // Next.js corta la conexión y esto suele llegar acá como un error de
    // parseo del body en vez de un mensaje claro.
    const pista = /body|payload|exceeds|too large/i.test(mensaje)
      ? " El archivo probablemente pesa más de 4.5 MB (el límite de las funciones serverless de Vercel) — probá con un archivo más liviano."
      : "";

    return NextResponse.json({ ok: false, mensaje: mensaje + pista }, { status: 500 });
  }
}
