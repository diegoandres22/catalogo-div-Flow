import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { leerCatalogoPublico } from "@/lib/blob";
import { Header } from "@/components/ui/Header";
import { Footer } from "@/components/ui/Footer";
import { Carrusel } from "@/components/detalle/Carrusel";
import { SelectorTalla } from "@/components/detalle/SelectorTalla";
import { AgregarCarrito } from "@/components/detalle/AgregarCarrito";
import { BotonCompartir } from "@/components/detalle/BotonCompartir";
import { formatearPrecio } from "@/lib/format";
import { esCalzado } from "@/lib/transform";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ volver?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const catalogo = await leerCatalogoPublico();
  const producto = catalogo?.productos.find((p) => p.id === id);

  if (!producto) {
    return { title: "Producto no encontrado" };
  }

  const titulo = `${producto.modelo} · ${producto.color}`;
  const descripcion = `${producto.marca} — ${formatearPrecio(producto.precio)}. Catálogo mayorista Calzados Mesvol.`;
  // La imagen del producto en la vista previa del link al compartirlo (ej.
  // por WhatsApp) — sin esto, cualquier producto compartido mostraba la
  // imagen genérica del sitio en vez de la foto real de lo que se comparte.
  const imagen = producto.fotos[0];

  return {
    title: titulo,
    description: descripcion,
    openGraph: {
      title: titulo,
      description: descripcion,
      siteName: "Catálogo Mayorista — Calzados Mesvol, C.A.",
      locale: "es_VE",
      type: "website",
      images: imagen ? [{ url: imagen, alt: `${producto.marca} ${producto.modelo} ${producto.color}` }] : undefined,
    },
    twitter: {
      card: imagen ? "summary_large_image" : "summary",
      title: titulo,
      description: descripcion,
      images: imagen ? [imagen] : undefined,
    },
  };
}

export default async function PaginaProducto({ params, searchParams }: Props) {
  const { id } = await params;
  const { volver } = await searchParams;
  const catalogo = await leerCatalogoPublico();
  const producto = catalogo?.productos.find((p) => p.id === id);

  if (!producto) notFound();

  // Solo se usa si viene del catálogo (empieza con "/"); cualquier otro
  // valor (link editado a mano, por ejemplo) cae al catálogo sin filtrar.
  const hrefVolver = volver && volver.startsWith("/") ? volver : "/";

  const materialesVisibles = Object.entries(producto.materiales ?? {}).filter(([, v]) => Boolean(v)) as [
    string,
    string,
  ][];

  const etiquetasMaterial: Record<string, string> = {
    exterior: "Exterior",
    interior: "Interior",
    suela: "Suela",
    tipoCalzado: "Tipo de calzado",
  };

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-4 flex items-center justify-between gap-3">
          <Link href={hrefVolver} className="inline-flex items-center gap-1 text-sm text-ink-500 hover:text-ink-900">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Volver al catálogo
          </Link>
          <BotonCompartir producto={producto} />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-10">
          <Carrusel fotos={producto.fotos} alt={producto.modelo} />

          <div className="flex flex-col gap-5">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium uppercase tracking-wide text-ink-500">{producto.marca}</span>
                {producto.linea && (
                  <span className="text-xs text-ink-500">· {producto.linea}</span>
                )}
                {producto.promocion && (
                  <span className="rounded-full bg-danger-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-danger-600">
                    Promoción
                  </span>
                )}
              </div>
              <h1 className="mt-1 text-xl font-semibold text-ink-900 sm:text-2xl">{producto.modelo}</h1>
              <p className="mt-1 text-sm text-ink-500">
                Color: <span className="text-ink-900">{producto.color}</span>
                {producto.genero && <> · Género: <span className="text-ink-900">{producto.genero}</span></>}
              </p>
            </div>

            <p className="text-2xl font-semibold text-ink-900">{formatearPrecio(producto.precio)}</p>

            <div className="rounded-xl bg-accent-100 px-4 py-3 text-sm text-accent-700">
              {esCalzado(producto.rubro) ? (
                <>
                  Venta por bulto de <strong>{producto.cantidadPorBulto}</strong> pares
                </>
              ) : (
                <>Venta por unidad</>
              )}
            </div>

            <SelectorTalla tallas={producto.tallas} />

            <AgregarCarrito producto={producto} />

            {esCalzado(producto.rubro) && producto.tallas.some((t) => t.porBulto) && (
              <div className="rounded-xl border border-ink-200 p-3">
                <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-500">
                  Distribución por bulto (talla · pares)
                </h2>
                <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-3">
                  {producto.tallas.map((t) => (
                    <li key={t.talla} className="flex items-baseline justify-between gap-2 text-ink-700">
                      <span className="font-medium text-ink-900">{t.talla}</span>
                      <span className="font-mono text-ink-500">{t.porBulto ?? "—"}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <p className="text-xs text-ink-500">
              Código SAP: <span className="font-mono text-ink-700">{producto.codigoSap}</span>
            </p>

            {producto.guiaTallas.length > 0 && (
              <a
                href={producto.guiaTallas[0]}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-accent-700 underline-offset-2 hover:underline"
              >
                Ver guía de tallas
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M7 17L17 7M7 7h10v10" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
            )}

            {materialesVisibles.length > 0 && (
              <div className="border-t border-ink-200 pt-4">
                <h2 className="mb-2 text-sm font-medium text-ink-900">Materiales</h2>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                  {materialesVisibles.map(([clave, valor]) => (
                    <div key={clave} className="contents">
                      <dt className="text-ink-500">{etiquetasMaterial[clave] ?? clave}</dt>
                      <dd className="text-ink-900">{valor}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
