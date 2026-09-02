import type { ResumenImportacion } from "@/lib/types";

interface Props {
  resumen: ResumenImportacion;
  onConfirmar: () => void;
  onCancelar: () => void;
  confirmando: boolean;
}

export function ResumenPrevio({ resumen, onConfirmar, onCancelar, confirmando }: Props) {
  return (
    <div className="rounded-2xl border border-ink-200 bg-paper-raised p-5 sm:p-6">
      <h2 className="text-base font-semibold text-ink-900">Resumen antes de confirmar</h2>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <Metrica etiqueta="Productos" valor={resumen.totalProductos} />
        <Metrica etiqueta="Variantes talla/color" valor={resumen.totalVariantes} />
        <Metrica etiqueta="Filas con error" valor={resumen.errores.length} enfasis={resumen.errores.length > 0} />
      </div>

      {resumen.errores.length > 0 && (
        <div className="mt-5">
          <h3 className="mb-2 text-sm font-medium text-ink-900">Detalle de errores</h3>
          <div className="max-h-56 overflow-y-auto rounded-lg border border-ink-200">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-ink-100 text-ink-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Fila</th>
                  <th className="px-3 py-2 font-medium">Modelo / Color</th>
                  <th className="px-3 py-2 font-medium">Motivo</th>
                </tr>
              </thead>
              <tbody>
                {resumen.errores.map((e, i) => (
                  <tr key={i} className="border-t border-ink-200">
                    <td className="px-3 py-2 text-ink-500">{e.fila ?? "—"}</td>
                    <td className="px-3 py-2 text-ink-900">
                      {[e.modelo, e.color].filter(Boolean).join(" / ") || "—"}
                    </td>
                    <td className="px-3 py-2 text-ink-700">{e.motivo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancelar}
          disabled={confirmando}
          className="rounded-full border border-ink-200 px-4 py-2.5 text-sm font-medium text-ink-900 disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={onConfirmar}
          disabled={confirmando}
          className="rounded-full bg-accent-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {confirmando ? "Reemplazando…" : "Reemplazar catálogo"}
        </button>
      </div>
    </div>
  );
}

function Metrica({ etiqueta, valor, enfasis }: { etiqueta: string; valor: number; enfasis?: boolean }) {
  return (
    <div className="rounded-xl bg-ink-100 px-3 py-3 text-center">
      <div className={`text-xl font-semibold ${enfasis ? "text-danger-600" : "text-ink-900"}`}>{valor}</div>
      <div className="mt-0.5 text-xs text-ink-500">{etiqueta}</div>
    </div>
  );
}
