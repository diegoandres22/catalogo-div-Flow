import { AdminHeader } from "@/components/admin/AdminHeader";

// ConfiguracionForm y GuiaTallasConfig ya tienen su propio skeleton interno
// (cargandoInicial), pero eso recién aparece una vez montado el componente
// cliente — este loading.tsx cubre la transición de navegación misma, con la
// misma forma, para que no haya parpadeo entre "nada" y el skeleton interno.
export default function CargandoConfiguracion() {
  return (
    <>
      <AdminHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6 sm:py-8" aria-label="Cargando" role="status">
        <div className="rounded-2xl border border-ink-200 p-4 sm:p-5">
          <div className="skeleton h-4 w-32 rounded" />
          <div className="skeleton mt-2 h-3 w-full max-w-md rounded" />
          <div className="mt-4 space-y-3">
            <div className="skeleton h-14 rounded-lg" />
            <div className="skeleton h-20 rounded-lg" />
            <div className="skeleton h-14 rounded-lg" />
          </div>
          <div className="skeleton mt-4 h-9 w-36 rounded-full" />
        </div>

        <div className="mt-6 rounded-2xl border border-ink-200 p-4">
          <div className="skeleton h-4 w-28 rounded" />
          <div className="skeleton mt-2 h-3 w-full max-w-md rounded" />
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="skeleton h-16 rounded-lg" />
            <div className="skeleton h-16 rounded-lg" />
          </div>
          <div className="skeleton mt-4 h-9 w-40 rounded-full" />
        </div>
      </main>
    </>
  );
}
