import Link from "next/link";
import type { ComposicionCatalogo, ConteoComposicion } from "@/lib/dashboard";

// Composición del catálogo publicado — Propuesta 6. Barras simples en CSS
// (sin librería de gráficos, no hace falta para esto) mostrando cuántos
// productos activos tiene cada marca/rubro/línea. Cada barra enlaza al
// catálogo público ya filtrado por ese valor, para pasar de "cuántos hay" a
// "cuáles son" en un clic.
export function GraficosComposicion({ composicion }: { composicion: ComposicionCatalogo }) {
  return (
    <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
      <BarraGrupo titulo="Por marca" datos={composicion.porMarca} paramUrl="marca" />
      <BarraGrupo titulo="Por rubro" datos={composicion.porRubro} paramUrl="cat" />
      <BarraGrupo titulo="Por línea" subtitulo="top 10" datos={composicion.porLinea} paramUrl="linea" />
    </div>
  );
}

function BarraGrupo({
  titulo,
  subtitulo,
  datos,
  paramUrl,
}: {
  titulo: string;
  subtitulo?: string;
  datos: ConteoComposicion[];
  paramUrl: "marca" | "cat" | "linea";
}) {
  const max = Math.max(1, ...datos.map((d) => d.cantidad));

  return (
    <div className="rounded-2xl border border-ink-200 p-4 sm:p-5">
      <h3 className="text-sm font-semibold text-ink-900">
        {titulo} {subtitulo && <span className="font-normal text-ink-500">({subtitulo})</span>}
      </h3>

      {datos.length === 0 ? (
        <p className="mt-3 text-xs text-ink-500">Sin datos.</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-2.5">
          {datos.map((d) => (
            <li key={d.etiqueta}>
              <Link
                href={`/?${paramUrl}=${encodeURIComponent(d.etiqueta)}`}
                target="_blank"
                className="group flex items-center gap-2 text-xs"
                title={`Ver "${d.etiqueta}" en el catálogo público`}
              >
                <span className="w-20 shrink-0 truncate text-ink-700 group-hover:text-ink-900">{d.etiqueta}</span>
                <span className="h-4 flex-1 overflow-hidden rounded bg-ink-100">
                  <span
                    className="block h-full rounded bg-accent-600 transition-[width] group-hover:bg-accent-700"
                    style={{ width: `${(d.cantidad / max) * 100}%` }}
                  />
                </span>
                <span className="w-6 shrink-0 text-right font-medium text-ink-900">{d.cantidad}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
