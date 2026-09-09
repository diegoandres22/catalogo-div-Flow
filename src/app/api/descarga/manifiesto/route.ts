import { NextResponse } from "next/server";
import { leerCatalogoPublico, leerColecciones, leerGuiaTallas } from "@/lib/blob";
import { logError } from "@/lib/logger";

// Manifiesto para la "descarga offline completa" (ver DescargaOffline.tsx):
// todo lo que hace falta guardar en Cache API para que el vendedor pueda
// navegar el catálogo entero sin señal, no solo lo que haya visitado antes.
//
// "paginas" son rutas del propio sitio (mismo origen) — el cliente las pide
// con fetch() normal (sin headers de RSC) para obtener el documento HTML
// completo, igual que una navegación real, y las guarda en la caché de
// páginas del service worker (ver public/sw.js).
//
// "imagenes" son URLs completas: fotos de producto (cdn.shopify.com) y
// portadas/guía de tallas servidas por /api/imagenes/[...pathname] (que SÍ
// hay que cachear, a diferencia del resto de /api/* — ver la nota en sw.js).
//
// No incluye assets de _next/static: esos los descubre el propio cliente
// (DescargaOffline.tsx) a partir del HTML de cada página, porque son los
// que Next generó para ESTE build puntual y no vale la pena duplicar esa
// lógica acá.
export async function GET() {
  try {
    const [catalogo, colecciones, guiaTallas] = await Promise.all([
      leerCatalogoPublico(),
      leerColecciones(),
      leerGuiaTallas(),
    ]);

    if (!catalogo || catalogo.productos.length === 0) {
      return NextResponse.json({ ok: false, mensaje: "Todavía no hay catálogo publicado." }, { status: 404 });
    }

    // "/?ver=todo" es la grilla completa sin filtrar (ver ColeccionesHome) —
    // se guarda siempre, sea o no que haya colecciones configuradas, porque
    // es el fallback que usa el service worker cuando el vendedor entra
    // offline a un link de colección/filtro que no se guardó puntualmente
    // (ver esFallbackColeccion en sw.js).
    const paginas = new Set<string>(["/", "/?ver=todo"]);
    const imagenes = new Set<string>();

    for (const producto of catalogo.productos) {
      paginas.add(`/producto/${producto.id}`);
      for (const color of producto.colores) {
        for (const foto of color.fotos) {
          if (foto) imagenes.add(foto);
        }
      }
    }

    for (const coleccion of colecciones) {
      if (coleccion.imagenUrl) imagenes.add(coleccion.imagenUrl);
    }

    if (guiaTallas.instrucciones) imagenes.add(guiaTallas.instrucciones);
    if (guiaTallas.tabla) imagenes.add(guiaTallas.tabla);

    return NextResponse.json({
      ok: true,
      generadoEn: catalogo.generadoEn,
      paginas: Array.from(paginas),
      imagenes: Array.from(imagenes),
    });
  } catch (err) {
    const mensaje = err instanceof Error ? err.message : "No se pudo generar el manifiesto de descarga.";
    logError("api/descarga/manifiesto GET", err);
    return NextResponse.json({ ok: false, mensaje }, { status: 500 });
  }
}
