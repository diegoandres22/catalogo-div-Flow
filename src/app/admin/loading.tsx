import { AdminHeader } from "@/components/admin/AdminHeader";

// Mismo criterio que src/app/loading.tsx: reproduce la forma real del
// dashboard (5 tarjetas de salud + 3 columnas de composición) para que no
// haya salto de layout cuando llegan los datos — nunca pantalla en blanco
// mientras se resuelve leerCatalogoPublico()/leerHistorial().
export default function CargandoDashboard() {
  return (
    <>
      <AdminHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3" aria-label="Cargando panel" role="status">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton h-24 rounded-xl" />
          ))}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-ink-200 p-4 sm:p-5">
              <div className="skeleton h-4 w-24 rounded" />
              <div className="mt-4 flex flex-col gap-2.5">
                {Array.from({ length: 4 }).map((_, j) => (
                  <div key={j} className="skeleton h-4 rounded" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
