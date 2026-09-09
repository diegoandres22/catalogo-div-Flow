import { AdminHeader } from "@/components/admin/AdminHeader";
import { EsqueletoDashboard } from "@/components/admin/EsqueletoDashboard";

// Mismo criterio que src/app/loading.tsx: reproduce la forma real del
// dashboard para que no haya salto de layout mientras se resuelve
// leerCatalogoPublico()/leerHistorial() — el bloque en sí vive en
// EsqueletoDashboard (también lo usa admin/page.tsx cuando la carga falla,
// ver esa nota).
export default function CargandoDashboard() {
  return (
    <>
      <AdminHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <EsqueletoDashboard />
      </main>
    </>
  );
}
