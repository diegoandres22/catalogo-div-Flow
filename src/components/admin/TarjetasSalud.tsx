import Link from "next/link";
import type { SaludCatalogo } from "@/lib/dashboard";

// Lo primero que se ve al entrar al panel — el objetivo de un dashboard es
// que el administrador entienda "cómo está el negocio" en segundos, sin
// tener que ir a buscar cada dato por separado en distintas secciones.
export function TarjetasSalud({ salud }: { salud: SaludCatalogo }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      <Tarjeta etiqueta="Productos activos" valor={String(salud.productosActivos)} />

      <Tarjeta
        etiqueta="Productos agotados"
        valor={String(salud.productosAgotados)}
        enfasis={salud.productosAgotados > 0}
      />

      <Tarjeta
        etiqueta="Stock físico confirmado"
        valor={salud.pctStockFisico === null ? "—" : `${salud.pctStockFisico}%`}
        ayuda="Del stock ofertado con disponibilidad, cuánto ya está en el almacén (no depende de mercadería en tránsito)."
        enfasis={salud.pctStockFisico !== null && salud.pctStockFisico < 70}
      />

      <Tarjeta
        etiqueta="Sin foto (última carga)"
        valor={String(salud.productosSinFotoUltimaCarga)}
        ayuda="Colores excluidos del catálogo en la última carga confirmada por no tener ninguna foto real."
        enfasis={salud.productosSinFotoUltimaCarga > 0}
      />

      <Tarjeta
        etiqueta="Antigüedad del catálogo"
        valor={salud.antiguedadDias === null ? "—" : salud.antiguedadDias === 0 ? "Hoy" : `${salud.antiguedadDias} día${salud.antiguedadDias === 1 ? "" : "s"}`}
        enfasis={salud.antiguedadDias !== null && salud.antiguedadDias >= 14}
        href="/admin/catalogo"
      />
    </div>
  );
}

function Tarjeta({
  etiqueta,
  valor,
  ayuda,
  enfasis,
  href,
}: {
  etiqueta: string;
  valor: string;
  ayuda?: string;
  enfasis?: boolean;
  href?: string;
}) {
  const contenido = (
    <div
      className={`flex h-full flex-col justify-between gap-2 rounded-xl border p-4 ${
        enfasis ? "border-danger-600/30 bg-danger-100" : "border-ink-200 bg-paper-raised"
      }`}
    >
      <span className="text-xs font-medium uppercase tracking-wide text-ink-500">{etiqueta}</span>
      <span className={`text-2xl font-semibold ${enfasis ? "text-danger-600" : "text-ink-900"}`}>{valor}</span>
      {ayuda && <span className="text-[11px] leading-snug text-ink-500">{ayuda}</span>}
    </div>
  );

  if (!href) return contenido;

  return (
    <Link href={href} target="_blank" className="block h-full transition-opacity hover:opacity-80">
      {contenido}
    </Link>
  );
}
