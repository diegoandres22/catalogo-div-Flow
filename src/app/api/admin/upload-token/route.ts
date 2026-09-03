import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { logError, pistaBlob } from "@/lib/logger";

// Autoriza la subida del archivo de catálogo (CSV/XLSX/XLSM) directo desde
// el navegador a Vercel Blob, sin pasar por el límite de tamaño de body de
// las funciones serverless (~4.5 MB). La ruta ya está protegida por
// src/proxy.ts (matcher /api/admin/:path*) — solo un admin autenticado
// llega hasta acá.
export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: [
          "text/csv",
          "application/vnd.ms-excel",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "application/vnd.ms-excel.sheet.macroEnabled.12",
          // Algunos navegadores no reconocen bien .xlsm/.xls y mandan un
          // content-type genérico — se acepta también para no bloquear la
          // subida por una detección de MIME imprecisa del lado del cliente.
          "application/octet-stream",
        ],
        addRandomSuffix: true,
        // El archivo original solo se necesita el tiempo de procesarlo — se
        // borra en /api/admin/upload apenas se termina de leer.
      }),
      onUploadCompleted: async () => {
        // No-op: el callback de Vercel solo llega en producción (necesita un
        // webhook público). El procesamiento real ocurre cuando el cliente
        // llama a /api/admin/upload con la URL del blob recién subido.
      },
    });
    return NextResponse.json(jsonResponse);
  } catch (err) {
    const mensaje = err instanceof Error ? err.message : "No se pudo autorizar la subida del archivo.";
    logError("api/admin/upload-token", err, pistaBlob(mensaje));
    return NextResponse.json({ error: mensaje }, { status: 400 });
  }
}
