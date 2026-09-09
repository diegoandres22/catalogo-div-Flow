"use client";

import { useState } from "react";
import { COLUMNAS_GUIA, etiquetaTipo } from "@/lib/columnasGuia";

const OBLIGATORIAS = COLUMNAS_GUIA.filter((c) => c.obligatoria);
const OPCIONALES = COLUMNAS_GUIA.filter((c) => !c.obligatoria);

export function GuiaColumnas() {
  const [abierta, setAbierta] = useState(false);

  return (
    <div className="rounded-2xl border border-ink-200 bg-paper-raised">
      <div className="flex flex-wrap items-center justify-between gap-3 p-5 sm:p-6">
        <div>
          <h2 className="text-base font-semibold text-ink-900">Antes de subir: columnas que necesita el archivo</h2>
          <p className="mt-1 text-sm text-ink-500">
            Una fila por talla+color. Estas <strong className="text-ink-900">5 son obligatorias</strong> — si falta
            alguna, el archivo entero se rechaza sin tocar el catálogo publicado.
          </p>
        </div>
        <a
          href="/admin/plantilla-catalogo.csv"
          download
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-ink-200 px-3.5 py-2 text-sm font-medium text-ink-900 transition-colors hover:border-ink-900"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 19h16" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Descargar plantilla de ejemplo
        </a>
      </div>

      <div className="flex flex-wrap gap-1.5 px-5 pb-5 sm:px-6">
        {OBLIGATORIAS.map((c) => (
          <span
            key={c.columna}
            className="rounded-full border border-accent-600/30 bg-accent-100 px-2.5 py-1 font-mono text-xs font-medium text-accent-700"
          >
            {c.columna}
          </span>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setAbierta((v) => !v)}
        aria-expanded={abierta}
        className="flex w-full items-center justify-center gap-1.5 border-t border-ink-200 py-3 text-sm font-medium text-ink-700 hover:text-ink-900"
      >
        {abierta ? "Ocultar guía completa de columnas" : "Ver guía completa de columnas (obligatorias y opcionales)"}
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`transition-transform ${abierta ? "rotate-180" : ""}`}
          aria-hidden="true"
        >
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {abierta && (
        <div className="border-t border-ink-200 p-5 sm:p-6">
          <TablaGuia titulo="Obligatorias" columnas={OBLIGATORIAS} />
          <div className="mt-6">
            <TablaGuia titulo="Opcionales" columnas={OPCIONALES} />
          </div>
        </div>
      )}
    </div>
  );
}

function TablaGuia({ titulo, columnas }: { titulo: string; columnas: typeof COLUMNAS_GUIA }) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-500">{titulo}</h3>
      <div className="overflow-x-auto rounded-lg border border-ink-200">
        <table className="w-full min-w-[640px] text-left text-xs">
          <thead className="bg-ink-100 text-ink-500">
            <tr>
              <th className="px-3 py-2 font-medium">Columna</th>
              <th className="px-3 py-2 font-medium">Tipo</th>
              <th className="px-3 py-2 font-medium">Ejemplo</th>
              <th className="px-3 py-2 font-medium">Para qué se usa</th>
              <th className="px-3 py-2 font-medium">Si falta o está vacía</th>
            </tr>
          </thead>
          <tbody>
            {columnas.map((c) => (
              <tr key={c.columna} className="border-t border-ink-200 align-top">
                <td className="px-3 py-2 font-mono font-medium text-ink-900">{c.columna}</td>
                <td className="px-3 py-2 whitespace-nowrap text-ink-500">{etiquetaTipo(c.tipo)}</td>
                <td className="max-w-[220px] px-3 py-2 text-ink-700">{c.ejemplo}</td>
                <td className="max-w-[240px] px-3 py-2 text-ink-700">{c.descripcion}</td>
                <td className="max-w-[240px] px-3 py-2 text-ink-500">{c.siFalta}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
