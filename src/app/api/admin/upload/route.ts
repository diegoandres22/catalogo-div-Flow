import { NextRequest, NextResponse } from "next/server";
import { guardarCatalogoPendiente } from "@/lib/blob";
import { obtenerCSVDesdeURL, parsearCSV, parsearXLSX, type ArchivoParseado } from "@/lib/parseOrigen";
import { transformarFilas, validarColumnas } from "@/lib/transform";
import type { ResumenImportacion } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const tipo = String(formData.get("tipo") ?? "");

    let parseado: ArchivoParseado;

    if (tipo === "csv" || tipo === "xlsx") {
      const archivo = formData.get("archivo");
      if (!(archivo instanceof File)) {
        return NextResponse.json({ ok: false, mensaje: "Falta el archivo." }, { status: 400 });
      }
      parseado = tipo === "csv" ? parsearCSV(await archivo.text()) : parsearXLSX(await archivo.arrayBuffer());
    } else if (tipo === "sheet") {
      const url = String(formData.get("url") ?? "").trim();
      if (!url) {
        return NextResponse.json({ ok: false, mensaje: "Falta el link de Google Sheets." }, { status: 400 });
      }
      parseado = await obtenerCSVDesdeURL(url);
    } else {
      return NextResponse.json({ ok: false, mensaje: "Origen de datos inválido." }, { status: 400 });
    }

    if (parseado.filas.length === 0) {
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
      return NextResponse.json({ ok: false, resumen }, { status: 422 });
    }

    // Se guarda como "pendiente": el admin todavía tiene que confirmar el
    // reemplazo. El catálogo publicado no se toca hasta ese momento.
    await guardarCatalogoPendiente(catalogo);

    return NextResponse.json({ ok: true, resumen });
  } catch (err) {
    const mensaje = err instanceof Error ? err.message : "Error inesperado al procesar el archivo.";
    return NextResponse.json({ ok: false, mensaje }, { status: 500 });
  }
}
