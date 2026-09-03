import { NextResponse } from "next/server";
import { leerArchivoOriginal } from "@/lib/blob";
import { logError, pistaBlob } from "@/lib/logger";

// Descarga el archivo (.csv/.xlsx) que se usó para cargar el catálogo
// actualmente publicado. Protegido por el proxy (matcher /api/admin/:path*),
// igual que el resto del panel admin.
export async function GET() {
  try {
    const archivo = await leerArchivoOriginal();
    if (!archivo) {
      return NextResponse.json(
        {
          ok: false,
          mensaje:
            "No hay un archivo disponible para descargar. El catálogo publicado se cargó desde un link de Google Sheets, o todavía no se confirmó ninguna carga por archivo.",
        },
        { status: 404 },
      );
    }

    return new NextResponse(archivo.bytes, {
      status: 200,
      headers: {
        "Content-Type": archivo.meta.contentType,
        "Content-Disposition": `attachment; filename="${archivo.meta.nombreArchivo.replace(/"/g, "")}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    const mensaje = err instanceof Error ? err.message : "No se pudo obtener el archivo original.";
    logError("api/admin/original", err, pistaBlob(mensaje));
    return NextResponse.json({ ok: false, mensaje }, { status: 500 });
  }
}
