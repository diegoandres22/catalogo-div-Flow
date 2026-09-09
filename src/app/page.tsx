import { leerCatalogoPublico, leerColecciones, leerConfigSitio } from "@/lib/blob";
import { Header } from "@/components/ui/Header";
import { Footer } from "@/components/ui/Footer";
import { CatalogoClient } from "@/components/catalogo/CatalogoClient";
import { EstadoVacio } from "@/components/catalogo/EstadoVacio";
import { ColeccionesHome } from "@/components/home/ColeccionesHome";

// Siempre dinámico: el admin puede reemplazar el catálogo en cualquier momento
// y el link público debe reflejarlo de inmediato, sin caché.
export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function PaginaCatalogo({ searchParams }: Props) {
  const [catalogo, config, colecciones, sp] = await Promise.all([
    leerCatalogoPublico(),
    leerConfigSitio(),
    leerColecciones(),
    searchParams,
  ]);

  // "/" sin NINGÚN query param muestra el landing de colecciones; cualquier
  // filtro en la URL (venga de una tarjeta de colección o de los Selects de
  // Filtros de siempre) muestra la grilla de siempre, sin cambios. Al
  // quitar un filtro desde ahí, CatalogoClient sincroniza la URL con
  // history.replaceState (no con el router de Next — ver la nota en ese
  // archivo), así que NUNCA dispara una navegación nueva que vuelva a
  // pasar por acá: quitar el filtro dentro de la grilla se queda en la
  // grilla mostrando todo, tal como pedía Diego, aunque la URL vuelva a
  // quedar en "/". Si todavía no hay colecciones cargadas en el admin, se
  // deja la grilla de siempre — no tiene sentido mostrar un landing vacío.
  const mostrarLanding = Object.keys(sp).length === 0 && colecciones.length > 0;

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        {!catalogo || catalogo.productos.length === 0 ? (
          <EstadoVacio
            titulo="Todavía no hay catálogo publicado"
            descripcion="El administrador aún no cargó productos. Volvé a intentarlo más tarde."
          />
        ) : mostrarLanding ? (
          <ColeccionesHome colecciones={colecciones} productos={catalogo.productos} />
        ) : (
          <CatalogoClient productos={catalogo.productos} />
        )}
      </main>
      <Footer config={config} />
    </>
  );
}
