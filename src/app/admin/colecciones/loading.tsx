import { AdminHeader } from "@/components/admin/AdminHeader";

export default function CargandoColecciones() {
  return (
    <>
      <AdminHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <div className="rounded-2xl border border-ink-200 p-4" aria-label="Cargando colecciones" role="status">
          <div className="skeleton h-4 w-40 rounded" />
          <div className="mt-4 flex flex-col gap-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="skeleton h-32 rounded-xl" />
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
