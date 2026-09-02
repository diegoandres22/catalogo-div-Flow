import { leerCatalogoPublico } from "@/lib/blob";
import { Header } from "@/components/ui/Header";
import { CatalogoClient } from "@/components/catalogo/CatalogoClient";
import { EstadoVacio } from "@/components/catalogo/EstadoVacio";

// Siempre dinámico: el admin puede reemplazar el catálogo en cualquier momento
// y el link público debe reflejarlo de inmediato, sin caché.
export const dynamic = "force-dynamic";

export default async function PaginaCatalogo() {
  const catalogo = await leerCatalogoPublico();

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        {!catalogo || catalogo.productos.length === 0 ? (
          <EstadoVacio
            titulo="Todavía no hay catálogo publicado"
            descripcion="El administrador aún no cargó productos. Volvé a intentarlo más tarde."
          />
        ) : (
          <CatalogoClient productos={catalogo.productos} />
        )}
      </main>
    </>
  );
}
