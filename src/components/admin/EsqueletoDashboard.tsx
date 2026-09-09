// Skeleton del dashboard — mismo bloque para dos casos: la carga inicial
// (ver admin/loading.tsx, mientras se resuelve el fetch) y cuando la carga
// de datos falla del lado del servidor (ver admin/page.tsx: en vez de
// tumbar la pantalla al error.tsx genérico, se deja el panel con su header
// y nav funcionando y esto en el lugar del contenido). Un solo lugar con la
// forma exacta del dashboard real, para no repetirla en los dos casos.
export function EsqueletoDashboard() {
  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3" aria-label="Cargando panel" role="status">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="skeleton h-24 rounded-xl" />
        ))}
        <div className="rounded-xl border border-ink-200 p-4">
          <div className="skeleton h-4 w-20 rounded" />
          <div className="mt-3 flex flex-col gap-2">
            {Array.from({ length: 3 }).map((_, j) => (
              <div key={j} className="skeleton h-4 rounded" />
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-ink-200 p-4 sm:p-5">
          <div className="skeleton h-4 w-24 rounded" />
          <div className="mt-4 flex flex-col gap-2.5">
            {Array.from({ length: 4 }).map((_, j) => (
              <div key={j} className="skeleton h-4 rounded" />
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-ink-200 p-4 sm:p-5 lg:col-span-2">
          <div className="skeleton h-4 w-24 rounded" />
          <div className="mt-4 flex flex-col gap-2.5">
            {Array.from({ length: 6 }).map((_, j) => (
              <div key={j} className="skeleton h-4 rounded" />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
