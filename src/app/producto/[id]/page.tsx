import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { leerCatalogoPublico, leerConfigSitio, leerGuiaTallas } from "@/lib/blob";
import { Header } from "@/components/ui/Header";
import { Footer } from "@/components/ui/Footer";
import { DetalleProducto } from "@/components/detalle/DetalleProducto";
import { buscarColor, colorPorDefecto } from "@/lib/producto";
import { formatearPrecio } from "@/lib/format";
import { esCalzado } from "@/lib/transform";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ volver?: string; color?: string }>;
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { id } = await params;
  const { color: colorParam } = await searchParams;
  const catalogo = await leerCatalogoPublico();
  const producto = catalogo?.productos.find((p) => p.id === id);

  if (!producto) {
    return { title: "Producto no encontrado" };
  }

  // Si el link trae ?color= (compartido desde un color puntual) se usa ese
  // para la vista previa; si no, el color "por defecto" — mismo criterio
  // que la página en sí, para que la foto de la vista previa (ej. al
  // compartir por WhatsApp) coincida con lo que se ve al abrir el link.
  const colorActual = buscarColor(producto, colorParam) ?? colorPorDefecto(producto);

  const titulo = producto.colores.length > 1 ? `${producto.modelo} · ${colorActual.color}` : producto.modelo;
  const descripcion = `${producto.marca} — ${formatearPrecio(colorActual.precio)}. Catálogo mayorista Calzados Mesvol.`;
  // La imagen del producto en la vista previa del link al compartirlo (ej.
  // por WhatsApp) — sin esto, cualquier producto compartido mostraba la
  // imagen genérica del sitio en vez de la foto real de lo que se comparte.
  const imagen = colorActual.fotos[0];

  return {
    title: titulo,
    description: descripcion,
    openGraph: {
      title: titulo,
      description: descripcion,
      siteName: "Catálogo Mayorista — Calzados Mesvol, C.A.",
      locale: "es_VE",
      type: "website",
      images: imagen ? [{ url: imagen, alt: `${producto.marca} ${producto.modelo} ${colorActual.color}` }] : undefined,
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
  const { volver, color } = await searchParams;
  const catalogo = await leerCatalogoPublico();
  const producto = catalogo?.productos.find((p) => p.id === id);

  if (!producto) notFound();

  // Solo se usa si viene del catálogo (empieza con "/"); cualquier otro
  // valor (link editado a mano, por ejemplo) cae al catálogo sin filtrar.
  const hrefVolver = volver && volver.startsWith("/") ? volver : "/";

  // La guía de tallas es una config fija de todo el calzado del catálogo
  // (no un dato por producto) — se administra aparte, desde el panel admin.
  // Ver GuiaTallasConfig.tsx.
  const [guiaTallas, config] = await Promise.all([
    esCalzado(producto.rubro) ? leerGuiaTallas() : Promise.resolve({ instrucciones: null, tabla: null }),
    leerConfigSitio(),
  ]);

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <DetalleProducto producto={producto} colorInicial={color} hrefVolver={hrefVolver} guiaTallas={guiaTallas} />
      </main>
      <Footer config={config} />
    </>
  );
}
