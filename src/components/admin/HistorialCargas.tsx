import type { EntradaHistorial } from "@/lib/types";

// Server component: lee el historial ya resuelto (ver /admin/catalogo/page.tsx)
// y solo lo presenta — no hace falta un endpoint aparte ni estado de carga.
export function HistorialCargas({ entradas }: { entradas: EntradaHistorial[] }) {
  return (
    <div className="mt-6 rounded-2xl border border-ink-200 p-4 sm:p-5">
      <h2 className="text-sm font-semibold text-ink-900">Historial de cargas</h2>
      <p className="mt-1 text-xs text-ink-500">
        Cada vez que se confirma un reemplazo (o se revierte al respaldo) queda un registro acá.
      </p>

      {entradas.length === 0 ? (
        <p className="mt-4 text-xs text-ink-500">Todavía no hay cargas confirmadas registradas.</p>
      ) : (
        <ul className="mt-4 flex flex-col divide-y divide-ink-200">
          {entradas.map((e) => (
            <li key={e.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2.5 text-sm">
              <div className="flex flex-col">
                <span className="text-ink-900">{formatearFecha(e.fecha)}</span>
                <span className="text-xs text-ink-500">
                  {etiquetaOrigen(e.origen)}
                  {e.nombreArchivo ? ` — ${e.nombreArchivo}` : ""}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="text-ink-700">
                  {e.totalProductos} productos · {e.totalVariantes} variantes
                </span>
                {e.totalErrores > 0 && (
                  <span className="rounded-full bg-danger-100 px-2 py-0.5 font-medium text-danger-600">
                    {e.totalErrores} error{e.totalErrores === 1 ? "" : "es"}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function etiquetaOrigen(origen: EntradaHistorial["origen"]): string {
  if (origen === "archivo") return "Archivo subido";
  if (origen === "google_sheets") return "Link de Google Sheets";
  return "Reversión al respaldo";
}

function formatearFecha(iso: string): string {
  const fecha = new Date(iso);
  return fecha.toLocaleString("es-VE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
