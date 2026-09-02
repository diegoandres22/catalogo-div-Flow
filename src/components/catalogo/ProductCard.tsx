import Link from "next/link";
import { ImagenProducto } from "./ImagenProducto";
import type { Producto } from "@/lib/types";
import { formatearPrecio, tieneStock } from "@/lib/format";

export function ProductCard({ producto, prioridad = false }: { producto: Producto; prioridad?: boolean }) {
  const disponible = tieneStock(producto.tallas);

  return (
    <Link
      href={`/producto/${producto.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-ink-200 bg-paper-raised transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-ink-900/5"
    >
      <div className="relative aspect-[3/4] w-full">
        <ImagenProducto
          src={producto.fotos[0]}
          alt={producto.modelo}
          priority={prioridad}
          className="h-full w-full transition-transform duration-300 group-hover:scale-[1.04]"
        />
        {!disponible && (
          <span className="absolute left-2 top-2 rounded-full bg-ink-900/85 px-2.5 py-1 text-xs font-medium text-white">
            Agotado
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3 sm:p-4">
        <span className="text-xs font-medium uppercase tracking-wide text-ink-500">{producto.marca}</span>
        <h3 className="line-clamp-2 text-sm font-medium text-ink-900 sm:text-base">{producto.modelo}</h3>
        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="text-base font-semibold text-ink-900 sm:text-lg">{formatearPrecio(producto.precio)}</span>
          <span className="text-xs text-ink-500">{producto.color}</span>
        </div>
      </div>
    </Link>
  );
}
