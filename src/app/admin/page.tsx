import Link from "next/link";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { TarjetasSalud } from "@/components/admin/TarjetasSalud";
import { GraficosComposicion } from "@/components/admin/GraficosComposicion";
import { leerCatalogoPublico, leerHistorial } from "@/lib/blob";
import { calcularComposicion, calcularSalud } from "@/lib/dashboard";

export const metadata = { title: "Panel de administración" };

// Igual que la home pública: el catálogo (y ahora el historial) puede
// cambiar en cualquier momento y el dashboard debe reflejarlo al instante.
export const dynamic = "force-dynamic";

export default async function PaginaAdminDashboard() {
  // Alcanza con las últimas 5 cargas: calcularSalud solo mira la más
  // reciente (productosSinFotoUltimaCarga) — pedir el historial completo acá
  // sería leer de más para lo que esta pantalla necesita.
  const [catalogo, historial] = await Promise.all([leerCatalogoPublico(), leerHistorial(5)]);
  const salud = calcularSalud(catalogo, historial);
  const composicion = calcularComposicion(catalogo);

  return (
    <>
      <AdminHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <TarjetasSalud salud={salud} />
        <GraficosComposicion composicion={composicion} />
        <p className="mt-6 text-center text-xs text-ink-500">
          <Link href="/" className="underline-offset-2 hover:underline">
            Ver catálogo público
          </Link>
        </p>
      </main>
    </>
  );
}
