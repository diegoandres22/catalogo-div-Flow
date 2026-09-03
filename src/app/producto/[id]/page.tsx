import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { leerCatalogoPublico } from "@/lib/blob";
import { Header } from "@/components/ui/Header";
import { Footer } from "@/components/ui/Footer";
import { Carrusel } from "@/components/detalle/Carrusel";
import { SelectorTalla } from "@/components/detalle/SelectorTalla";
import { formatearPrecio } from "@/lib/format";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ volver?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const catalogo = await leerCatalogoPublico();
  const producto = catalogo?.productos.find((p) => p.id === id);
  return { title: producto ? `${producto.modelo} · ${producto.color}` : "Producto no encontrado" };
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
        <Link href={hrefVolver} className="mb-4 inline-flex items-center gap-1 text-sm text-ink-500 hover:text-ink-900">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Volver al catálogo
        </Link>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-10">
          <Carrusel fotos={producto.fotos} alt={producto.modelo} />

          <div className="flex flex-col gap-5">
            <div>
              <span className="text-xs font-medium uppercase tracking-wide text-ink-500">{producto.marca}</span>
              <h1 className="mt-1 text-xl font-semibold text-ink-900 sm:text-2xl">{producto.modelo}</h1>
              <p className="mt-1 text-sm text-ink-500">
                Color: <span className="text-ink-900">{producto.color}</span>
                {producto.genero && <> · Género: <span className="text-ink-900">{producto.genero}</span></>}
              </p>
            </div>

            <p className="text-2xl font-semibold text-ink-900">{formatearPrecio(producto.precio)}</p>

            <div className="rounded-xl bg-accent-100 px-4 py-3 text-sm text-accent-700">
              Venta por bulto de <strong>{producto.cantidadPorBulto}</strong> pares
            </div>

            <SelectorTalla tallas={producto.tallas} />

            <div className="rounded-xl border border-ink-200 p-3">
              <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-500">
                Referencia SAP (talla · SKU)
              </h2>
              <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-3">
                {producto.tallas.map((t) => (
                  <li key={t.bcdCode} className="flex items-baseline justify-between gap-2 text-ink-700">
                    <span className="font-medium text-ink-900">{t.talla}</span>
                    <span className="truncate font-mono text-ink-500">{t.bcdCode}</span>
                  </li>
                ))}
              </ul>
            </div>

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
