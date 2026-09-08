"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Carrusel } from "./Carrusel";
import { AgregarCarrito } from "./AgregarCarrito";
import { BotonCompartir } from "./BotonCompartir";
import { SelectorColor } from "./SelectorColor";
import { SelectorCurva } from "./SelectorCurva";
import type { GuiaTallas, Producto } from "@/lib/types";
import { formatearPrecio } from "@/lib/format";
import { esCalzado } from "@/lib/transform";
import { buscarColor, colorPorDefecto, curvaPorDefecto } from "@/lib/producto";

interface Props {
  producto: Producto;
  colorInicial?: string;
  hrefVolver: string;
  guiaTallas: GuiaTallas;
}

const ETIQUETAS_MATERIAL: Record<string, string> = {
  exterior: "Exterior",
  interior: "Interior",
  suela: "Suela",
  tipoCalzado: "Tipo de calzado",
};

// Dueño del estado de "qué color / qué curva está eligiendo el comprador"
// (antes esto ni existía: cada modelo+color era su propia página fija).
// Arranca desde el ?color= de la URL (link compartido con un color puntual)
// y si no viene, desde el primer color con stock — mismo criterio que la
// tarjeta del catálogo, para que la foto que trajo al comprador acá coincida
// con lo que ve al entrar.
export function DetalleProducto({ producto, colorInicial, hrefVolver, guiaTallas }: Props) {
  const [colorNombre, setColorNombre] = useState(
    () => (buscarColor(producto, colorInicial) ?? colorPorDefecto(producto)).color,
  );
  const colorActual = buscarColor(producto, colorNombre) ?? colorPorDefecto(producto);

  const [curvaId, setCurvaId] = useState(() => curvaPorDefecto(colorActual).id);
  const curvaActual = colorActual.curvas.find((c) => c.id === curvaId) ?? curvaPorDefecto(colorActual);

  const calzado = esCalzado(producto.rubro);

  function cambiarColor(nuevoColor: string) {
    setColorNombre(nuevoColor);
    const color = buscarColor(producto, nuevoColor);
    // Al cambiar de color, la curva elegida vuelve a la "por defecto" de ese
    // color — la curva seleccionada en el color anterior puede ni siquiera
    // existir en el nuevo.
    if (color) setCurvaId(curvaPorDefecto(color).id);
  }

  const guiaPrincipal = guiaTallas.tabla ?? guiaTallas.instrucciones;
  const guiaSecundaria = guiaTallas.tabla && guiaTallas.instrucciones ? guiaTallas.instrucciones : null;

  const materialesVisibles = useMemo(
    () => Object.entries(producto.materiales ?? {}).filter(([, v]) => Boolean(v)) as [string, string][],
    [producto.materiales],
  );

  const etiquetasMaterial = ETIQUETAS_MATERIAL;

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-3">
        <Link href={hrefVolver} className="inline-flex items-center gap-1 text-sm text-ink-500 hover:text-ink-900">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Volver al catálogo
        </Link>
        <BotonCompartir producto={producto} color={colorActual.color} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-10">
        <Carrusel fotos={colorActual.fotos} alt={`${producto.modelo} ${colorActual.color}`} />

        <div className="flex flex-col gap-5">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-ink-500">{producto.marca}</span>
              {producto.linea && <span className="text-xs text-ink-500">· {producto.linea}</span>}
              {colorActual.promocion && (
                <span className="rounded-full bg-danger-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-danger-600">
                  Promoción
                </span>
              )}
            </div>
            <h1 className="mt-1 text-xl font-semibold text-ink-900 sm:text-2xl">{producto.modelo}</h1>
            <p className="mt-1 text-sm text-ink-500">
              Color: <span className="text-ink-900">{colorActual.color}</span>
              {producto.genero && (
                <>
                  {" "}
                  · Género: <span className="text-ink-900">{producto.genero}</span>
                </>
              )}
            </p>
          </div>

          <p className="text-2xl font-semibold text-ink-900">{formatearPrecio(colorActual.precio)}</p>

          <SelectorColor colores={producto.colores} seleccionado={colorActual.color} onChange={cambiarColor} />

          <div className="rounded-xl bg-accent-100 px-4 py-3 text-sm text-accent-700">
            {calzado ? (
              <>
                Venta por bulto de <strong>{curvaActual.cantidadPorBulto}</strong> pares
              </>
            ) : (
              <>Venta por unidad</>
            )}
          </div>

          {calzado && <SelectorCurva curvas={colorActual.curvas} seleccionada={curvaActual} onChange={(c) => setCurvaId(c.id)} />}

          <AgregarCarrito producto={producto} color={colorActual} curva={curvaActual} />

          <p className="text-xs text-ink-500">
            Código SAP: <span className="font-mono text-ink-700">{curvaActual.codigoSap}</span>
            {producto.codigoModelo && (
              <>
                {" "}
                · Modelo: <span className="font-mono text-ink-700">{producto.codigoModelo}</span>
              </>
            )}
          </p>

          {guiaPrincipal && (
            <div className="flex w-fit flex-wrap items-center gap-3">
              <a
                href={guiaPrincipal}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-accent-700 underline-offset-2 hover:underline"
              >
                Ver guía de tallas
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M7 17L17 7M7 7h10v10" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
              {guiaSecundaria && (
                <a href={guiaSecundaria} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-ink-500 underline-offset-2 hover:underline">
                  Cómo medir
                </a>
              )}
            </div>
          )}

          {materialesVisibles.length > 0 && (
            <div className="border-t border-ink-200 pt-4">
              <h2 className="mb-2 text-sm font-medium text-ink-900">Materiales</h2>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                {materialesVisibles.map(([clave, valor]) => (
                  <div key={clave} className="contents">
                    <dt className="text-ink-500">{etiquetasMaterial[clave] ?? clave}</dt>
                    <dd className="text-ink-900">{valor}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
