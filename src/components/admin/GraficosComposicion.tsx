import Link from "next/link";
import type { ComposicionCatalogo, ConteoComposicion } from "@/lib/dashboard";

// Composición del catálogo publicado — Propuesta 6. Barras simples en CSS
// (sin librería de gráficos, no hace falta para esto) mostrando cuántos
// productos activos tiene cada marca/rubro/línea. Cada barra enlaza al
// catálogo público ya filtrado por ese valor, para pasar de "cuántos hay" a
// "cuáles son" en un clic.
//
// "Por marca" se mudó a TarjetasSalud (ocupa el lugar que quedaba libre
// junto a "Antigüedad del catálogo") — acá solo quedan rubro y línea, con
// línea ocupando el doble de ancho para que los nombres largos no se corten.
export function GraficosComposicion({ composicion }: { composicion: ComposicionCatalogo }) {
  return (
    <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
      <BarraGrupo titulo="Por rubro" datos={composicion.porRubro} paramUrl="cat" />
      <div className="lg:col-span-2">
        <BarraGrupo titulo="Por línea" subtitulo="top 10" datos={composicion.porLinea} paramUrl="linea" etiquetaAncha />
      </div>
    </div>
  );
}

// Exportado: TarjetasSalud lo reusa para "Por marca" — misma lógica de
// barras, un solo lugar que mantenerla (ver nota de arriba).
export function BarraGrupo({
  titulo,
  subtitulo,
  datos,
  paramUrl,
  etiquetaAncha,
}: {
  titulo: string;
  subtitulo?: string;
  datos: ConteoComposicion[];
  paramUrl: "marca" | "cat" | "linea";
  etiquetaAncha?: boolean;
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
                <span
                  className={`shrink-0 truncate text-ink-700 group-hover:text-ink-900 ${etiquetaAncha ? "w-40" : "w-20"}`}
                >
                  {d.etiqueta}
                </span>
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
