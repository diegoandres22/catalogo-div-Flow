"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { useCarrito } from "./CarritoContext";
import {
  linkWhatsAppPedido,
  numeroWhatsAppVentas,
  subtotalDelItem,
  totalCarrito,
  unidadesDelItem,
  type DatosComprador,
  type ItemCarrito,
} from "@/lib/carrito";
import { formatearPrecio } from "@/lib/format";
import { logError } from "@/lib/logger";

type Errores = Partial<Record<keyof DatosComprador, string>>;

function validarComprador(c: DatosComprador): Errores {
  const errores: Errores = {};
  if (!c.nombre.trim()) errores.nombre = "Falta el nombre.";
  if (!c.empresa.trim()) errores.empresa = "Falta el nombre de la empresa.";
  if (!c.telefono.trim()) errores.telefono = "Falta el teléfono.";
  if (!c.rif.trim()) errores.rif = "Falta el RIF.";
  return errores;
}

export function CarritoDrawer() {
  const { items, comprador, abierto, actualizarCantidad, quitarItem, vaciar, setComprador, cerrar } = useCarrito();
  const [errores, setErrores] = useState<Errores>({});
  const numeroConfigurado = numeroWhatsAppVentas();

  // Cierra con Escape — patrón esperado de cualquier panel/diálogo lateral.
  useEffect(() => {
    if (!abierto) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") cerrar();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [abierto, cerrar]);

  useEffect(() => {
    if (!numeroConfigurado) {
      logError(
        "CarritoDrawer",
        "Falta configurar NEXT_PUBLIC_WHATSAPP_VENTAS en Vercel.",
        "Andá a Vercel → el proyecto → Settings → Environment Variables y agregá NEXT_PUBLIC_WHATSAPP_VENTAS con el número de ventas en formato internacional (ej. 584121234567, sin '+' ni espacios). Después hay que volver a desplegar para que tome el cambio.",
      );
    }
    // Solo se registra una vez al montar el panel — no en cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function campo<K extends keyof DatosComprador>(clave: K, valor: string) {
    setComprador({ ...comprador, [clave]: valor });
    if (errores[clave]) setErrores({ ...errores, [clave]: undefined });
  }

  function enviarPorWhatsApp() {
    if (items.length === 0) return;
    const erroresActuales = validarComprador(comprador);
    setErrores(erroresActuales);
    if (Object.keys(erroresActuales).length > 0) {
      // Mensaje inline junto a cada campo (abajo) en vez de un toast
      // genérico — un toast en la esquina inferior tapa justo el botón de
      // envío, que está fijo ahí mismo. Se enfoca el primer campo con error
      // para que quede claro qué falta sin tener que leer todo el panel.
      const primerCampoConError = Object.keys(erroresActuales)[0] as keyof DatosComprador;
      document.getElementById(`comprador-${primerCampoConError}`)?.focus();
      return;
    }
    const link = linkWhatsAppPedido(items, comprador);
    if (!link) {
      toast.error("El envío por WhatsApp todavía no está configurado. Avisale al administrador del sitio.");
      return;
    }
    window.open(link, "_blank", "noopener,noreferrer");
  }

  return (
    <>
      {abierto && (
        <button
          type="button"
          aria-label="Cerrar pedido"
          onClick={cerrar}
          className="fixed inset-0 z-40 bg-ink-900/40 backdrop-blur-[1px]"
        />
      )}

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Tu pedido"
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-paper shadow-2xl transition-transform duration-300 ${
          abierto ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-ink-200 px-4 py-3.5 sm:px-6">
          <h2 className="text-base font-semibold text-ink-900">Tu pedido</h2>
          <button
            type="button"
            onClick={cerrar}
            aria-label="Cerrar"
            className="rounded-full p-1.5 text-ink-500 hover:bg-ink-100 hover:text-ink-900"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
            <p className="text-sm font-medium text-ink-900">Todavía no agregaste productos</p>
            <p className="text-xs text-ink-500">Elegí un producto del catálogo y armá tu pedido para enviarlo por WhatsApp.</p>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-4 py-3 sm:px-6">
              <ul className="flex flex-col gap-3">
                {items.map((item) => (
                  <ItemCarritoFila
                    key={item.productoId}
                    item={item}
                    onCantidad={(c) => actualizarCantidad(item.productoId, c)}
                    onQuitar={() => quitarItem(item.productoId)}
                  />
                ))}
              </ul>
              <button
                type="button"
                onClick={vaciar}
                className="mt-3 text-xs font-medium text-ink-500 underline-offset-2 hover:underline"
              >
                Vaciar pedido
              </button>

              <div className="mt-4 border-t border-ink-200 pt-4">
                <h3 className="mb-3 text-sm font-medium text-ink-900">Tus datos</h3>
                <div className="grid grid-cols-2 gap-3">
                  <CampoComprador
                    id="comprador-nombre"
                    etiqueta="Nombre"
                    value={comprador.nombre}
                    onChange={(v) => campo("nombre", v)}
                    error={errores.nombre}
                    className="col-span-2"
                  />
                  <CampoComprador
                    id="comprador-empresa"
                    etiqueta="Empresa"
                    value={comprador.empresa}
                    onChange={(v) => campo("empresa", v)}
                    error={errores.empresa}
                    className="col-span-2"
                  />
                  <CampoComprador
                    id="comprador-telefono"
                    etiqueta="Teléfono"
                    value={comprador.telefono}
                    onChange={(v) => campo("telefono", v)}
                    error={errores.telefono}
                    type="tel"
                  />
                  <CampoComprador
                    id="comprador-rif"
                    etiqueta="RIF"
                    value={comprador.rif}
                    onChange={(v) => campo("rif", v)}
                    error={errores.rif}
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-ink-200 px-4 py-4 sm:px-6">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm text-ink-500">Total</span>
                <span className="text-lg font-semibold text-ink-900">{formatearPrecio(totalCarrito(items))}</span>
              </div>
              {!numeroConfigurado && (
                <p className="mb-2 text-xs text-danger-600">
                  El envío por WhatsApp no está disponible por ahora. Probá de nuevo más tarde o contactá directamente a ventas.
                </p>
              )}
              <button
                type="button"
                onClick={enviarPorWhatsApp}
                disabled={!numeroConfigurado}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-ink-900 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-ink-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                  <path d="M12.004 2C6.486 2 2.004 6.482 2.004 12c0 1.85.505 3.58 1.386 5.067L2 22l5.084-1.334A9.94 9.94 0 0 0 12.004 22C17.522 22 22 17.518 22 12S17.522 2 12.004 2zm0 18.166a8.13 8.13 0 0 1-4.15-1.14l-.298-.177-3.017.792.805-2.94-.194-.303a8.15 8.15 0 0 1-1.25-4.398c0-4.507 3.667-8.174 8.174-8.174s8.174 3.667 8.174 8.174-3.667 8.166-8.244 8.166z" />
                </svg>
                Enviar pedido por WhatsApp
              </button>
              <p className="mt-2 text-center text-[11px] text-ink-500">
                Las cantidades son referenciales — el vendedor confirma disponibilidad final por WhatsApp.
              </p>
            </div>
          </>
        )}
      </aside>
    </>
  );
}

function ItemCarritoFila({
  item,
  onCantidad,
  onQuitar,
}: {
  item: ItemCarrito;
  onCantidad: (cantidad: number) => void;
  onQuitar: () => void;
}) {
  function cambiarCantidad(valor: string) {
    const n = Math.floor(Number(valor));
    onCantidad(Number.isFinite(n) && n > 0 ? n : 1);
  }

  return (
    <li className="flex gap-3">
      <div className="relative h-16 w-14 shrink-0 overflow-hidden rounded-lg bg-ink-100">
        {item.foto && <Image src={item.foto} alt={item.modelo} fill sizes="56px" className="object-cover" />}
      </div>
      <div className="flex flex-1 flex-col gap-1">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-ink-500">{item.marca}</p>
            <p className="text-sm font-medium text-ink-900">{item.modelo}</p>
            <p className="text-xs text-ink-500">{item.color}</p>
          </div>
          <button type="button" onClick={onQuitar} aria-label={`Quitar ${item.modelo} del pedido`} className="p-1 text-ink-500 hover:text-danger-600">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center rounded-lg border border-ink-200">
            <button
              type="button"
              onClick={() => onCantidad(Math.max(1, item.cantidad - 1))}
              aria-label="Restar"
              className="px-2 py-1 text-ink-700 hover:text-ink-900"
            >
              −
            </button>
            <input
              type="number"
              min={1}
              inputMode="numeric"
              value={item.cantidad}
              onChange={(e) => cambiarCantidad(e.target.value)}
              aria-label={item.esCalzado ? "Cantidad de bultos" : "Cantidad de unidades"}
              className="w-10 border-x border-ink-200 py-1 text-center text-xs"
            />
            <button type="button" onClick={() => onCantidad(item.cantidad + 1)} aria-label="Sumar" className="px-2 py-1 text-ink-700 hover:text-ink-900">
              +
            </button>
          </div>
          <span className="text-xs text-ink-500">
            {item.esCalzado ? `${item.cantidad} bulto${item.cantidad === 1 ? "" : "s"} · ${unidadesDelItem(item)} pares` : `${item.cantidad} unidad${item.cantidad === 1 ? "" : "es"}`}
          </span>
        </div>
        <span className="self-end text-sm font-medium text-ink-900">{formatearPrecio(subtotalDelItem(item))}</span>
      </div>
    </li>
  );
}

function CampoComprador({
  id,
  etiqueta,
  value,
  onChange,
  error,
  type = "text",
  className,
}: {
  id: string;
  etiqueta: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  type?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-xs font-medium text-ink-500">
        {etiqueta}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`w-full rounded-lg border bg-paper-raised px-3 py-2 text-sm focus:border-accent-600 ${error ? "border-danger-600" : "border-ink-200"}`}
      />
      {error && (
        <p id={`${id}-error`} className="mt-1 text-xs text-danger-600">
          {error}
        </p>
      )}
    </div>
  );
}
