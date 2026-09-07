import Link from "next/link";
import { ImagenProducto } from "./ImagenProducto";
import { AgregarCarritoCard } from "./AgregarCarritoCard";
import { CompartirCard } from "./CompartirCard";
import type { Producto } from "@/lib/types";
import { formatearPrecio, tieneStock } from "@/lib/format";

export function ProductCard({
  producto,
  prioridad = false,
  volver,
}: {
  producto: Producto;
  prioridad?: boolean;
  volver?: string;
}) {
  const disponible = tieneStock(producto.tallas);
  const href =
    volver && volver !== "/"
      ? `/producto/${producto.id}?volver=${encodeURIComponent(volver)}`
      : `/producto/${producto.id}`;

  return (
    // "group relative": ya no es el <Link> el contenedor — el link pasa a
    // ser una capa transparente que cubre toda la tarjeta (ver más abajo),
    // así el botón de "agregar" puede vivir POR ENCIMA de esa capa (z-index)
    // en vez de anidado dentro de un <a> (HTML inválido y fuente de
    // conflictos de click). Ningún otro componente pierde nada: el resto
    // de la tarjeta sigue siendo 100% clickeable para ir al detalle.
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-ink-200 bg-paper-raised transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-ink-900/5">
      <div className="relative aspect-[3/4] w-full">
        <ImagenProducto
          src={producto.fotos[0]}
          alt={producto.modelo}
          priority={prioridad}
          className="h-full w-full transition-transform duration-300 group-hover:scale-[1.04]"
        />
        {/* Las dos etiquetas de estado viven juntas arriba a la IZQUIERDA
            (apiladas si se dan las dos a la vez) para dejar arriba a la
            DERECHA libre exclusivamente para el botón de compartir — así
            nunca compiten por la misma esquina. */}
        {(!disponible || producto.promocion) && (
          <div className="absolute left-2 top-2 z-10 flex flex-col items-start gap-1">
            {!disponible && (
              <span className="rounded-full bg-ink-900/85 px-2.5 py-1 text-xs font-medium text-white">Agotado</span>
            )}
            {producto.promocion && (
              <span className="rounded-full bg-danger-600 px-2.5 py-1 text-xs font-medium text-white">Promoción</span>
            )}
          </div>
        )}

        {/* Esquinas de la FOTO (no de toda la tarjeta) — así ninguno de los
            dos botones pisa el precio/color de abajo. z-20: por encima del
            link de la tarjeta (z-10), así el click acá nunca navega, sin
            necesitar preventDefault. */}
        <div className="absolute right-2 top-2 z-20">
          <CompartirCard producto={producto} />
        </div>
        <div className="absolute bottom-2 right-2 z-20">
          <AgregarCarritoCard producto={producto} disponible={disponible} />
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3 sm:p-4">
        <span className="text-xs font-medium uppercase tracking-wide text-ink-500">{producto.marca}</span>
        <h3 className="line-clamp-2 text-sm font-medium text-ink-900 sm:text-base">{producto.modelo}</h3>
        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="text-base font-semibold text-ink-900 sm:text-lg">{formatearPrecio(producto.precio)}</span>
          <span className="text-xs text-ink-500">{producto.color}</span>
        </div>
      </div>

      <Link
        href={href}
        aria-label={`Ver ${producto.marca} ${producto.modelo}, ${producto.color} — ${formatearPrecio(producto.precio)}`}
        className="absolute inset-0 z-10 rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2"
      />
    </div>
  );
}
