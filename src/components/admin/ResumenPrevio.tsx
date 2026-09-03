import type { ResumenImportacion } from "@/lib/types";
import { TablaErrores } from "./TablaErrores";

interface Props {
  resumen: ResumenImportacion;
  onConfirmar: () => void;
  onCancelar: () => void;
  confirmando: boolean;
  // true mientras hay OTRA operación crítica en curso (p. ej. un revertir al
  // respaldo) — evita que "Reemplazar catálogo" se dispare al mismo tiempo y
  // pisen el catálogo publicado entre sí. No cambia el texto del botón,
  // solo lo deshabilita.
  bloqueadoPorOtraOperacion?: boolean;
}

export function ResumenPrevio({ resumen, onConfirmar, onCancelar, confirmando, bloqueadoPorOtraOperacion }: Props) {
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
          <h3 className="mb-2 text-sm font-medium text-ink-900">
            Filas excluidas del catálogo <span className="font-normal text-ink-500">(el resto se importó igual)</span>
          </h3>
          <TablaErrores errores={resumen.errores} />
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
          disabled={confirmando || bloqueadoPorOtraOperacion}
          title={bloqueadoPorOtraOperacion ? "Esperá a que termine la otra operación en curso." : undefined}
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
