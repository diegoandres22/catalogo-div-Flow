"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { logError } from "@/lib/logger";
import type { ConfigSitio } from "@/lib/types";

const VACIA: ConfigSitio = { whatsappVentas: null, descripcionEmpresa: null, rif: null };

// Datos operativos que antes solo se podían cambiar desde Vercel (variable
// de entorno) o estaban fijos en el código (Footer.tsx) — Propuesta 10.
// Todos los campos son opcionales: si se dejan vacíos acá, cada lugar que
// los usa cae a su valor por defecto (ver ConfigSitio en lib/types.ts).
export function ConfiguracionForm() {
  const [config, setConfig] = useState<ConfigSitio>(VACIA);
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

  async function guardar() {
    setGuardando(true);
    try {
      const resp = await fetch("/api/admin/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      const data = (await resp.json()) as { ok: boolean; config?: ConfigSitio; mensaje?: string };
      if (!resp.ok || !data.ok || !data.config) {
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
            id="config-whatsapp"
            etiqueta="WhatsApp de ventas"
            ayuda="Formato internacional, solo dígitos (ej: 584121234567, sin '+' ni espacios). Vacío = se usa el configurado en Vercel."
            value={config.whatsappVentas ?? ""}
            onChange={(v) => setConfig({ ...config, whatsappVentas: v })}
            type="tel"
          />
          <CampoTextarea
            id="config-descripcion"
            etiqueta="Descripción de la empresa"
            ayuda="Se muestra en el pie de página del catálogo. Vacío = se usa el texto por defecto."
            value={config.descripcionEmpresa ?? ""}
            onChange={(v) => setConfig({ ...config, descripcionEmpresa: v })}
          />
          <Campo
            id="config-rif"
            etiqueta="RIF"
            ayuda="Vacío = se usa el RIF por defecto."
            value={config.rif ?? ""}
            onChange={(v) => setConfig({ ...config, rif: v })}
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

function Campo({
  id,
  etiqueta,
  ayuda,
  value,
  onChange,
  type = "text",
}: {
  id: string;
  etiqueta: string;
  ayuda?: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs font-medium text-ink-900">
        {etiqueta}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-900 focus:border-accent-600"
      />
      {ayuda && <p className="mt-1 text-[11px] text-ink-500">{ayuda}</p>}
    </div>
  );
}

function CampoTextarea({
  id,
  etiqueta,
  ayuda,
  value,
  onChange,
}: {
  id: string;
  etiqueta: string;
  ayuda?: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs font-medium text-ink-900">
        {etiqueta}
      </label>
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        className="w-full resize-none rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-900 focus:border-accent-600"
      />
      {ayuda && <p className="mt-1 text-[11px] text-ink-500">{ayuda}</p>}
    </div>
  );
}
