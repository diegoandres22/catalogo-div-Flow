import Link from "next/link";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { TarjetasSalud } from "@/components/admin/TarjetasSalud";
import { GraficosComposicion } from "@/components/admin/GraficosComposicion";
import { EsqueletoDashboard } from "@/components/admin/EsqueletoDashboard";
import { leerCatalogoPublico, leerHistorial } from "@/lib/blob";
import { calcularComposicion, calcularSalud, type ComposicionCatalogo, type SaludCatalogo } from "@/lib/dashboard";
import { logError } from "@/lib/logger";

export const metadata = { title: "Panel de administración" };

// Igual que la home pública: el catálogo (y ahora el historial) puede
// cambiar en cualquier momento y el dashboard debe reflejarlo al instante.
export const dynamic = "force-dynamic";

export default async function PaginaAdminDashboard() {
  // Si algo falla acá (ej. el catálogo publicado quedó en un formato que
  // calcularSalud/calcularComposicion no esperan) NO se deja caer a la
  // pantalla de error genérica — eso tumba todo el panel, incluida la nav,
  // justo cuando el admin más necesita moverse a /admin/catalogo a
  // arreglarlo. En su lugar se deja el header/nav funcionando y se muestra
  // el mismo esqueleto de "cargando" en el lugar del contenido, sin
  // reintentar solo — el admin refresca cuando ya corrigió el catálogo.
  let datos: { salud: SaludCatalogo; composicion: ComposicionCatalogo } | null = null;
  try {
    // Alcanza con las últimas 5 cargas: calcularSalud solo mira la más
    // reciente (productosSinFotoUltimaCarga) — pedir el historial completo
    // acá sería leer de más para lo que esta pantalla necesita.
    const [catalogo, historial] = await Promise.all([leerCatalogoPublico(), leerHistorial(5)]);
    datos = { salud: calcularSalud(catalogo, historial), composicion: calcularComposicion(catalogo) };
  } catch (err) {
    logError("admin/page.PaginaAdminDashboard", err, "El catálogo publicado no tiene la forma esperada — probablemente hace falta re-subirlo desde /admin/catalogo.");
  }

  return (
    <>
      <AdminHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        {datos ? (
          <>
            <TarjetasSalud salud={datos.salud} porMarca={datos.composicion.porMarca} />
            <GraficosComposicion composicion={datos.composicion} />
          </>
        ) : (
          <EsqueletoDashboard />
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
