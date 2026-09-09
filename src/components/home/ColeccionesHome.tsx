import Link from "next/link";
import { ImagenProducto } from "@/components/catalogo/ImagenProducto";
import { coleccionesConProductos, contarColeccion, queryParamsColeccion } from "@/lib/coleccion";
import type { Coleccion, Producto } from "@/lib/types";

// Landing de la home: 6 (o las que el admin haya cargado) tarjetas de
// colección — referencia visual: catalogomesvol.lovable.app. A diferencia
// de ese sitio, clickear una tarjeta NO lleva a una página nueva/paralela:
// es un <Link> a "/" con query params que el catálogo de siempre
// (CatalogoClient, vía page.tsx) ya sabe leer — misma vista, mismo código,
// solo con el filtro inicial puesto. Ver la nota de "/" en page.tsx.
export function ColeccionesHome({ colecciones, productos }: { colecciones: Coleccion[]; productos: Producto[] }) {
  const visibles = coleccionesConProductos(colecciones, productos);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {visibles.map((c) => {
        const { modelos, referencias } = contarColeccion(productos, c.filtro);
        const qs = queryParamsColeccion(c.filtro);
        // Una colección sin ningún campo de filtro (= "todo el catálogo")
        // no puede linkear a "/" a secas: page.tsx interpreta "/" sin
        // ningún query param como "mostrar este landing de nuevo", no como
        // "mostrar la grilla". "ver=todo" no lo lee ningún filtro (se
        // ignora en Filtros.tsx) — solo le basta a page.tsx para saber que
        // hay que mostrar la grilla.
        const href = qs ? `/?${qs}` : "/?ver=todo";
        return (
          <Link
            key={c.id}
            href={href}
            className="group relative flex flex-col overflow-hidden rounded-2xl border border-ink-200 bg-paper-raised transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-ink-900/5"
          >
            <div className="relative aspect-[4/3] w-full">
              <ImagenProducto
                src={c.imagenUrl ?? undefined}
                alt={c.nombre}
                sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                className="h-full w-full transition-transform duration-300 group-hover:scale-[1.03]"
              />
            </div>
            <div className="flex flex-col gap-0.5 p-4">
              <span className="text-base font-semibold text-ink-900">{c.nombre}</span>
              <span className="text-xs text-ink-500">
                {modelos} modelo{modelos === 1 ? "" : "s"} · {referencias} referencia{referencias === 1 ? "" : "s"}
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
