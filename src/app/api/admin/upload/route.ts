import { del } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import { guardarCatalogoPendiente } from "@/lib/blob";
import { obtenerCSVDesdeURL, parsearCSV, parsearXLSX, type ArchivoParseado } from "@/lib/parseOrigen";
import { transformarFilas, validarColumnas } from "@/lib/transform";
import type { ResumenImportacion } from "@/lib/types";

export async function POST(request: NextRequest) {
  // Se borra al final, tanto si el import sale bien como si sale mal — es un
  // archivo de paso, no hace falta conservarlo en Blob.
  let blobUrlTemporal: string | null = null;

  try {
    const body = await request.json();
    const tipo = String(body.tipo ?? "");

    let parseado: ArchivoParseado;

    if (tipo === "csv" || tipo === "xlsx") {
      // El archivo ya se subió directo del navegador a Vercel Blob (ver
      // CargadorCatalogo.tsx + /api/admin/upload-token) — acá solo se lee su
      // contenido. Así se evita el límite de tamaño de body de las funciones
      // serverless (~4.5 MB) y se pueden aceptar archivos grandes.
      const blobUrl = String(body.blobUrl ?? "").trim();
      if (!blobUrl) {
        return NextResponse.json({ ok: false, mensaje: "Falta el archivo subido." }, { status: 400 });
      }
      blobUrlTemporal = blobUrl;
      const respuestaArchivo = await fetch(blobUrl);
      if (!respuestaArchivo.ok) {
        return NextResponse.json(
          { ok: false, mensaje: `No se pudo leer el archivo subido (HTTP ${respuestaArchivo.status}).` },
          { status: 502 },
        );
      }
      parseado =
        tipo === "csv" ? parsearCSV(await respuestaArchivo.text()) : parsearXLSX(await respuestaArchivo.arrayBuffer());
    } else if (tipo === "sheet") {
      const url = String(body.url ?? "").trim();
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
  } finally {
    if (blobUrlTemporal) {
      del(blobUrlTemporal).catch(() => {
        // no crítico: si falla la limpieza, el archivo temporal queda huérfano en Blob
      });
    }
  }
}
