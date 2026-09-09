import { NextRequest, NextResponse } from "next/server";
import { leerImagenPublica } from "@/lib/blob";

// Puente público hacia el store PRIVADO de Blob — ver la nota grande en
// lib/blob.ts (subirImagenColeccion/subirImagenGuiaTallas). Solo sirve las
// dos carpetas de imágenes pensadas para verse sin login (portadas de
// colección, guía de tallas); todo lo demás del store (catálogo, pedidos,
// historial) sigue totalmente fuera del alcance de esta ruta.
//
// Cache fuerte y para siempre: cada imagen sube con un sufijo aleatorio
// (addRandomSuffix) que nunca se reutiliza, así que el contenido detrás de
// una URL dada jamás cambia — no hace falta revalidar.
const PREFIJOS_PERMITIDOS = /^(colecciones|guia-tallas)\//;

export async function GET(_request: NextRequest, { params }: { params: Promise<{ pathname: string[] }> }) {
  const { pathname: segmentos } = await params;
  const pathname = segmentos.join("/");

  if (!PREFIJOS_PERMITIDOS.test(pathname)) {
    return NextResponse.json({ ok: false, mensaje: "No encontrado." }, { status: 404 });
  }

  try {
    const imagen = await leerImagenPublica(pathname);
    if (!imagen) {
      return NextResponse.json({ ok: false, mensaje: "No encontrado." }, { status: 404 });
    }
    return new NextResponse(imagen.stream, {
      status: 200,
      headers: {
        "Content-Type": imagen.contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    // leerImagenPublica ya registró el detalle (con pista de diagnóstico si aplica).
    return NextResponse.json({ ok: false, mensaje: "No se pudo obtener la imagen." }, { status: 500 });
  }
}
