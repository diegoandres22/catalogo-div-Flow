"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { logError } from "@/lib/logger";
import type { ConfigSitio } from "@/lib/types";
import {
  DESCRIPCION_EMPRESA_MAX,
  RIF_MAX,
  WHATSAPP_VENTAS_MAX,
  validarConfigSitio,
  type ErroresConfigSitio,
} from "@/lib/validarConfigSitio";

const VACIA: ConfigSitio = { whatsappVentas: null, descripcionEmpresa: null, rif: null };

// Datos operativos que antes solo se podían cambiar desde Vercel (variable
// de entorno) o estaban fijos en el código (Footer.tsx) — Propuesta 10.
// Todos los campos son opcionales: si se dejan vacíos acá, cada lugar que
// los usa cae a su valor por defecto (ver ConfigSitio en lib/types.ts).
export function ConfiguracionForm() {
  const [config, setConfig] = useState<ConfigSitio>(VACIA);
  const [errores, setErrores] = useState<ErroresConfigSitio>({});
  const [cargandoInicial, setCargandoInicial] = useState(true);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      try {
        const resp = await fetch("/api/admin/config");
        const data = (await resp.json()) as { ok: boolean; config?: ConfigSitio; mensaje?: string };
        if (!resp.ok || !data.ok || !data.config) {
          throw new Error(data.mensaje ?? "No se pudo cargar la configuración actual.");
        }
        if (!cancelado) setConfig(data.config);
      } catch (err) {
        logError("ConfiguracionForm.cargar", err, "No se pudo leer la configuración actual desde Vercel Blob.");
        if (!cancelado) toast.error("No se pudo cargar la configuración actual.");
      } finally {
        if (!cancelado) setCargandoInicial(false);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, []);

  // Igual que CarritoDrawer con los datos del comprador: limpia el error de
  // ESE campo apenas se vuelve a tocar, en vez de esperar al próximo intento
  // de guardar para que desaparezca.
  function campo<K extends keyof ConfigSitio>(clave: K, valor: string) {
    setConfig({ ...config, [clave]: valor });
    if (errores[clave as keyof ErroresConfigSitio]) setErrores({ ...errores, [clave]: undefined });
  }

  async function guardar() {
    const campos = {
      whatsappVentas: (config.whatsappVentas ?? "").trim(),
      descripcionEmpresa: (config.descripcionEmpresa ?? "").trim(),
      rif: (config.rif ?? "").trim(),
    };

    const erroresActuales = validarConfigSitio(campos);
    setErrores(erroresActuales);
    if (Object.keys(erroresActuales).length > 0) {
      // Mensaje inline junto al campo (abajo), no un toast genérico — mismo
      // criterio que el formulario del carrito: se enfoca el primer campo
      // con error para que quede claro qué corregir sin leer todo el form.
      const primerCampoConError = Object.keys(erroresActuales)[0] as keyof ErroresConfigSitio;
      document.getElementById(`config-${primerCampoConError}`)?.focus();
      return;
    }

    setGuardando(true);
    try {
      const resp = await fetch("/api/admin/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(campos),
      });
      const data = (await resp.json()) as { ok: boolean; config?: ConfigSitio; mensaje?: string };
      if (!resp.ok || !data.ok || !data.config) {
        // Esto solo debería pasar por algo que el form no pudo anticipar
        // (ej. se cayó la conexión a mitad de camino) — la validación de
        // campo ya cubrió los casos previsibles antes de llegar acá.
        toast.error(data.mensaje ?? "No se pudo guardar la configuración.");
        return;
      }
      setConfig(data.config);
      toast.success("Configuración guardada.");
    } catch (err) {
      logError("ConfiguracionForm.guardar", err, "No se pudo conectar con el servidor — revisá tu conexión a internet y probá de nuevo.");
      toast.error("No se pudo conectar con el servidor.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="rounded-2xl border border-ink-200 p-4 sm:p-5">
      <h2 className="text-sm font-semibold text-ink-900">Datos generales</h2>
      <p className="mt-1 text-xs text-ink-500">
        Número de WhatsApp de ventas y datos de contacto que se muestran en el catálogo público — antes solo se
        podían cambiar desde Vercel.
      </p>

      {cargandoInicial ? (
        <div className="mt-4 space-y-3" aria-label="Cargando configuración actual" role="status">
          <div className="skeleton h-14 rounded-lg" />
          <div className="skeleton h-20 rounded-lg" />
          <div className="skeleton h-14 rounded-lg" />
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-4">
          <Campo
            id="config-whatsappVentas"
            etiqueta="WhatsApp de ventas"
            ayuda="Formato internacional, solo dígitos (ej: 584121234567, sin '+' ni espacios). Vacío = se usa el configurado en Vercel."
            value={config.whatsappVentas ?? ""}
            onChange={(v) => campo("whatsappVentas", v)}
            type="tel"
            maxLength={WHATSAPP_VENTAS_MAX}
            error={errores.whatsappVentas}
          />
          <CampoTextarea
            id="config-descripcionEmpresa"
            etiqueta="Descripción de la empresa"
            ayuda="Se muestra en el pie de página del catálogo. Vacío = se usa el texto por defecto."
            value={config.descripcionEmpresa ?? ""}
            onChange={(v) => campo("descripcionEmpresa", v)}
            maxLength={DESCRIPCION_EMPRESA_MAX}
            error={errores.descripcionEmpresa}
          />
          <Campo
            id="config-rif"
            etiqueta="RIF"
            ayuda="Vacío = se usa el RIF por defecto."
            value={config.rif ?? ""}
            onChange={(v) => campo("rif", v)}
            maxLength={RIF_MAX}
            error={errores.rif}
          />
        </div>
      )}

      <button
        type="button"
        onClick={guardar}
        disabled={guardando || cargandoInicial}
        className="mt-4 rounded-full bg-ink-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-ink-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {guardando ? "Guardando…" : "Guardar cambios"}
      </button>
    </div>
  );
}

// Encabezado compartido por Campo/CampoTextarea: etiqueta + contador de
// caracteres — visible siempre que el campo tenga un maxLength, para que el
// límite no sea una sorpresa recién al guardar.
function EncabezadoCampo({ id, etiqueta, valor, maxLength }: { id: string; etiqueta: string; valor: string; maxLength?: number }) {
  return (
    <div className="mb-1 flex items-baseline justify-between gap-2">
      <label htmlFor={id} className="text-xs font-medium text-ink-900">
        {etiqueta}
      </label>
      {maxLength !== undefined && (
        <span className={`text-[11px] tabular-nums ${valor.length >= maxLength ? "text-danger-600" : "text-ink-500"}`}>
          {valor.length}/{maxLength}
        </span>
      )}
    </div>
  );
}

function Campo({
  id,
  etiqueta,
  ayuda,
  value,
  onChange,
  type = "text",
  maxLength,
  error,
}: {
  id: string;
  etiqueta: string;
  ayuda?: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  maxLength?: number;
  error?: string;
}) {
  return (
    <div>
      <EncabezadoCampo id={id} etiqueta={etiqueta} valor={value} maxLength={maxLength} />
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={maxLength}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : ayuda ? `${id}-ayuda` : undefined}
        className={`w-full rounded-lg border bg-paper px-3 py-2 text-sm text-ink-900 focus:border-accent-600 ${
          error ? "border-danger-600" : "border-ink-200"
        }`}
      />
      {error ? (
        <p id={`${id}-error`} className="mt-1 text-xs text-danger-600">
          {error}
        </p>
      ) : (
        ayuda && (
          <p id={`${id}-ayuda`} className="mt-1 text-[11px] text-ink-500">
            {ayuda}
          </p>
        )
      )}
    </div>
  );
}

function CampoTextarea({
  id,
  etiqueta,
  ayuda,
  value,
  onChange,
  maxLength,
  error,
}: {
  id: string;
  etiqueta: string;
  ayuda?: string;
  value: string;
  onChange: (v: string) => void;
  maxLength?: number;
  error?: string;
}) {
  return (
    <div>
      <EncabezadoCampo id={id} etiqueta={etiqueta} valor={value} maxLength={maxLength} />
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        maxLength={maxLength}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : ayuda ? `${id}-ayuda` : undefined}
        className={`w-full resize-none rounded-lg border bg-paper px-3 py-2 text-sm text-ink-900 focus:border-accent-600 ${
          error ? "border-danger-600" : "border-ink-200"
        }`}
      />
      {error ? (
        <p id={`${id}-error`} className="mt-1 text-xs text-danger-600">
          {error}
        </p>
      ) : (
        ayuda && (
          <p id={`${id}-ayuda`} className="mt-1 text-[11px] text-ink-500">
            {ayuda}
          </p>
        )
      )}
    </div>
  );
}
