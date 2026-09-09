import { NextRequest, NextResponse } from "next/server";
import { leerCatalogoPublico, leerColecciones, leerGuiaTallas } from "@/lib/blob";
import { logError } from "@/lib/logger";

// Manifiesto para la "descarga offline" (ver DescargaOffline.tsx) — POR
// MARCA, no el catálogo entero: con ~1600+ variantes, bajar todo de una vez
// es lento, pesado en datos móviles y con esa cantidad de ítems el riesgo
// de que algunos fallen (timeout, red inestable) es alto. Un vendedor
// normalmente solo necesita la marca que vende.
//
// Sin "?marca=": listado liviano de marcas disponibles (para armar el
// selector) — NO arma el manifiesto completo de páginas/imágenes.
// Con "?marca=X": manifiesto completo, acotado a los productos de esa
// marca.
//
// "paginas" son rutas del propio sitio (mismo origen) — el cliente las pide
// con fetch() normal (sin headers de RSC) para obtener el documento HTML
// completo, igual que una navegación real, y las guarda en la caché de
// páginas del service worker (ver public/sw.js).
//
// "imagenes" son URLs completas: fotos de producto (cdn.shopify.com) y
// portadas de colección / guía de tallas servidas por
// /api/imagenes/[...pathname] (que SÍ hay que cachear, a diferencia del
// resto de /api/* — ver la nota en sw.js).
//
// No incluye assets de _next/static: esos los descubre el propio cliente
// (DescargaOffline.tsx) a partir del HTML de cada página, porque son los
// que Next generó para ESTE build puntual.
export async function GET(request: NextRequest) {
  try {
    const marca = request.nextUrl.searchParams.get("marca");
    const catalogo = await leerCatalogoPublico();

    if (!catalogo || catalogo.productos.length === 0) {
      return NextResponse.json({ ok: false, mensaje: "Todavía no hay catálogo publicado." }, { status: 404 });
    }

    if (!marca) {
      const marcas = Array.from(new Set(catalogo.productos.map((p) => p.marca))).sort((a, b) => a.localeCompare(b, "es"));
      return NextResponse.json({ ok: true, generadoEn: catalogo.generadoEn, marcas });
    }

    const productosMarca = catalogo.productos.filter((p) => p.marca === marca);
    if (productosMarca.length === 0) {
      return NextResponse.json({ ok: false, mensaje: `No hay productos de "${marca}" en el catálogo vigente.` }, { status: 404 });
    }

    const [colecciones, guiaTallas] = await Promise.all([leerColecciones(), leerGuiaTallas()]);

    // "/?marca=X" es la grilla de esa marca (Filtros.tsx ya sabe leer ese
    // query param) — el fallback del service worker cae acá cuando el
    // vendedor entra offline a un link de colección/filtro que no se
    // descargó puntualmente (ver buscarPaginaEnCache en sw.js).
    const paginas = new Set<string>(["/", `/?marca=${encodeURIComponent(marca)}`]);
    const imagenes = new Set<string>();

    for (const producto of productosMarca) {
      paginas.add(`/producto/${producto.id}`);
      for (const color of producto.colores) {
        for (const foto of color.fotos) {
          if (foto) imagenes.add(foto);
        }
      }
    }

    // Portadas de TODAS las colecciones (no solo las de esta marca): son
    // livianas y así la landing ("/") se ve completa offline aunque las
    // otras colecciones no correspondan a la marca descargada.
    for (const coleccion of colecciones) {
      if (coleccion.imagenUrl) imagenes.add(coleccion.imagenUrl);
    }

    if (guiaTallas.instrucciones) imagenes.add(guiaTallas.instrucciones);
    if (guiaTallas.tabla) imagenes.add(guiaTallas.tabla);

    return NextResponse.json({
      ok: true,
      generadoEn: catalogo.generadoEn,
      marca,
      paginas: Array.from(paginas),
      imagenes: Array.from(imagenes),
    });
  } catch (err) {
    const mensaje = err instanceof Error ? err.message : "No se pudo generar el manifiesto de descarga.";
    logError("api/descarga/manifiesto GET", err);
    return NextResponse.json({ ok: false, mensaje }, { status: 500 });
  }
}
