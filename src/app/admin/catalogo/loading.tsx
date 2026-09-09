import { AdminHeader } from "@/components/admin/AdminHeader";

// Reproduce la forma de PanelAdmin (3 bloques: cargar/revertir/descargar) +
// HistorialCargas, para cubrir la espera de leerHistorial() sin pantalla en
// blanco — mismo criterio que el resto de los loading.tsx del proyecto.
export default function CargandoCatalogoAdmin() {
  return (
    <>
      <AdminHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6 sm:py-8" aria-label="Cargando" role="status">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="mt-6 rounded-2xl border border-ink-200 p-4 first:mt-0 sm:p-5">
            <div className="skeleton h-4 w-40 rounded" />
            <div className="skeleton mt-3 h-3 w-full max-w-md rounded" />
            <div className="skeleton mt-4 h-9 w-44 rounded-full" />
          </div>
        ))}

        <div className="mt-6 rounded-2xl border border-ink-200 p-4 sm:p-5">
          <div className="skeleton h-4 w-36 rounded" />
          <div className="mt-4 flex flex-col gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skeleton h-10 rounded-lg" />
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
