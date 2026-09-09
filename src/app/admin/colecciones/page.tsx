import Link from "next/link";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { ColeccionesConfig } from "@/components/admin/ColeccionesConfig";
import { leerCatalogoPublico, leerColecciones } from "@/lib/blob";
import type { Producto } from "@/lib/types";

export const metadata = { title: "Colecciones · Panel de administración" };
// Mismo motivo que las otras pestañas del panel (ver la nota en
// admin/configuracion/page.tsx): siempre detrás del login, no gana nada
// quedando estática.
export const dynamic = "force-dynamic";

function valoresUnicos(productos: Producto[], extraer: (p: Producto) => (string | undefined)[]): string[] {
  const conjunto = new Set<string>();
  for (const p of productos) {
    for (const v of extraer(p)) {
      if (v) conjunto.add(v);
    }
  }
  return Array.from(conjunto).sort((a, b) => a.localeCompare(b, "es"));
}

export default async function PaginaAdminColecciones() {
  const [catalogo, colecciones] = await Promise.all([leerCatalogoPublico(), leerColecciones()]);
  const productos = catalogo?.productos ?? [];

  // Mismas 5 listas que ya usa el catálogo público (ver opcionesContextuales
  // en CatalogoClient.tsx) pero SIN contexto entre sí — acá no son opciones
  // de un Select que se van achicando entre ellas, son "todo lo que existe
  // en el catálogo" para que el admin arme el filtro de cada colección.
  const opciones = {
    marcas: valoresUnicos(productos, (p) => [p.marca]),
    categorias: valoresUnicos(productos, (p) => [p.rubro]),
    lineas: valoresUnicos(productos, (p) => [p.linea]),
    generos: valoresUnicos(productos, (p) => [p.genero]),
    colores: valoresUnicos(productos, (p) => p.colores.map((c) => c.color)),
  };

  return (
    <>
      <AdminHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        {productos.length === 0 ? (
          <p className="rounded-xl border border-ink-200 bg-paper-raised p-4 text-sm text-ink-500">
            Todavía no hay catálogo publicado — subí uno desde{" "}
            <Link href="/admin/catalogo" className="text-accent-700 underline-offset-2 hover:underline">
              Catálogo
            </Link>{" "}
            antes de armar las colecciones.
          </p>
        ) : (
          <ColeccionesConfig opciones={opciones} coleccionesIniciales={colecciones} />
        )}
        <p className="mt-6 text-center text-xs text-ink-500">
          <Link href="/" className="underline-offset-2 hover:underline">
            Ver catálogo público
          </Link>
        </p>
      </main>
    </>
  );
}
