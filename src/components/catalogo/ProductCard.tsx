"use client";

import { useState } from "react";
import Link from "next/link";
import { ImagenProducto } from "./ImagenProducto";
import { AgregarCarritoCard } from "./AgregarCarritoCard";
import { CompartirCard } from "./CompartirCard";
import { SelectorCurvaCard } from "./SelectorCurvaCard";
import type { Producto } from "@/lib/types";
import { colorPorDefecto, curvaPorDefecto, precioTextoProducto, promocionActiva, tieneStockCurva, tieneStockProducto } from "@/lib/producto";
import { esCalzado } from "@/lib/transform";

export function ProductCard({
  producto,
  prioridad = false,
  volver,
}: {
  producto: Producto;
  prioridad?: boolean;
  volver?: string;
}) {
  // La tarjeta muestra UN producto por modelo (ya no uno por modelo+color) —
  // "colorDefecto" decide qué foto/color aparece acá; el selector de COLOR
  // sigue viviendo solo en el detalle, para no sumar interactividad que el
  // catálogo no necesita ahí. La CURVA es distinta: antes se agregaba al
  // pedido en silencio con la curva "por defecto" sin que el comprador
  // supiera cuál — ahora, si el color por defecto tiene más de una curva,
  // esta tarjeta se vuelve stateful ("use client") para dejarlo elegir acá
  // mismo (ver SelectorCurvaCard) antes de agregar.
  const colorDefecto = colorPorDefecto(producto);
  const calzado = esCalzado(producto.rubro);
  const disponibleProducto = tieneStockProducto(producto);
  const promocion = promocionActiva(producto);
  const href =
    volver && volver !== "/"
      ? `/producto/${producto.id}?volver=${encodeURIComponent(volver)}`
      : `/producto/${producto.id}`;

  const [curvaId, setCurvaId] = useState(() => curvaPorDefecto(colorDefecto).id);
  const curvaSeleccionada = colorDefecto.curvas.find((c) => c.id === curvaId) ?? curvaPorDefecto(colorDefecto);
  // Accesorios no tienen curva real (siempre "Único", ver transform.ts): la
  // disponibilidad del botón sigue siendo la del producto. En calzado pasa
  // a depender de la curva puntual que está seleccionada — puede haber
  // stock en otra curva del mismo color y no en esta.
  const disponibleSeleccion = calzado ? tieneStockCurva(curvaSeleccionada) : disponibleProducto;

  return (
    // "group relative": ya no es el <Link> el contenedor — el link pasa a
    // ser una capa transparente que cubre toda la tarjeta (ver más abajo),
    // así el botón de "agregar" puede vivir POR ENCIMA de esa capa (z-index)
    // en vez de anidado dentro de un <a> (HTML inválido y fuente de
    // conflictos de click). Ningún otro componente pierde nada: el resto
    // de la tarjeta sigue siendo 100% clickeable para ir al detalle.
    //
    // "isolate": crea un stacking context propio para la card — sin esto,
    // el z-20 de los botones (compartir/agregar/curva) competía directo
    // contra el z-20 del <header sticky> (Header.tsx) y, al ser posteriores
    // en el DOM, terminaban pintándose POR ENCIMA del navbar al hacer
    // scroll. Con "isolate" el z-index interno de la card queda contenido
    // adentro y nunca puede escapar por encima de nada externo.
    <div className="group relative isolate flex flex-col overflow-hidden rounded-2xl border border-ink-200 bg-paper-raised transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-ink-900/5">
      <div className="relative aspect-[3/4] w-full">
        <ImagenProducto
          src={colorDefecto.fotos[0]}
          alt={producto.modelo}
          priority={prioridad}
          className="h-full w-full transition-transform duration-300 group-hover:scale-[1.04]"
        />
        {/* Las dos etiquetas de estado viven juntas arriba a la IZQUIERDA
            (apiladas si se dan las dos a la vez) para dejar arriba a la
            DERECHA libre exclusivamente para el botón de compartir — así
            nunca compiten por la misma esquina. */}
        {(!disponibleProducto || promocion) && (
          <div className="absolute left-2 top-2 z-10 flex flex-col items-start gap-1">
            {!disponibleProducto && (
              <span className="rounded-full bg-ink-900/85 px-2.5 py-1 text-xs font-medium text-white">Agotado</span>
            )}
            {promocion && (
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
          <AgregarCarritoCard producto={producto} color={colorDefecto} curva={curvaSeleccionada} disponible={disponibleSeleccion} />
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3 sm:p-4">
        <span className="text-xs font-medium uppercase tracking-wide text-ink-500">{producto.marca}</span>
        <h3 className="line-clamp-2 text-sm font-medium text-ink-900 sm:text-base">{producto.modelo}</h3>

        {calzado &&
          (colorDefecto.curvas.length > 1 ? (
            <SelectorCurvaCard curvas={colorDefecto.curvas} seleccionada={curvaId} onSeleccionar={setCurvaId} />
          ) : curvaSeleccionada.rango !== "Único" ? (
            <span className="text-[11px] font-medium text-ink-500">Curva {curvaSeleccionada.rango}</span>
          ) : null)}

        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="text-base font-semibold text-ink-900 sm:text-lg">{precioTextoProducto(producto)}</span>
          <span className="text-xs text-ink-500">
            {producto.colores.length > 1 ? `${producto.colores.length} colores` : colorDefecto.color}
          </span>
        </div>
      </div>

      <Link
        href={href}
        aria-label={`Ver ${producto.marca} ${producto.modelo} — ${precioTextoProducto(producto)}`}
        className="absolute inset-0 z-10 rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2"
      />
    </div>
  );
}
