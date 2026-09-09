"use client";

import { useId, useState } from "react";
import { toast } from "sonner";
import { logError } from "@/lib/logger";
import { ImagenProducto } from "@/components/catalogo/ImagenProducto";
import type { Coleccion, FiltroColeccion } from "@/lib/types";

interface Opciones {
  marcas: string[];
  categorias: string[];
  lineas: string[];
  generos: string[];
  colores: string[];
}

const CAMPO_FILTRO: { campo: keyof FiltroColeccion; etiqueta: string; todas: string }[] = [
  { campo: "marca", etiqueta: "Marca", todas: "Cualquier marca" },
  { campo: "categoria", etiqueta: "Categoría", todas: "Calzado y accesorios" },
  { campo: "linea", etiqueta: "Línea", todas: "Cualquier línea" },
  { campo: "genero", etiqueta: "Género", todas: "Cualquier género" },
  { campo: "color", etiqueta: "Color", todas: "Cualquier color" },
];

function coleccionVacia(): Coleccion {
  return { id: crypto.randomUUID(), nombre: "", imagenUrl: null, filtro: {} };
}

// El admin ahora puede crear/renombrar/quitar colecciones libremente (no son
// 6 slots fijos) — ver la respuesta de Diego a la pregunta de "modelo de
// datos" del pedido original. El orden de la lista en pantalla ES el orden
// de las tarjetas en la home (botones subir/bajar en vez de un campo
// "orden" aparte).
export function ColeccionesConfig({ opciones, coleccionesIniciales }: { opciones: Opciones; coleccionesIniciales: Coleccion[] }) {
  const [colecciones, setColecciones] = useState<Coleccion[]>(coleccionesIniciales);
  const [subiendoId, setSubiendoId] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [errores, setErrores] = useState<Record<string, string>>({});

  function actualizar(id: string, cambios: Partial<Coleccion>) {
    setColecciones((prev) => prev.map((c) => (c.id === id ? { ...c, ...cambios } : c)));
  }

  function actualizarFiltro(id: string, campo: keyof FiltroColeccion, valor: string) {
    setColecciones((prev) =>
      prev.map((c) => (c.id === id ? { ...c, filtro: { ...c.filtro, [campo]: valor || undefined } } : c)),
    );
  }

  function mover(id: string, direccion: -1 | 1) {
    setColecciones((prev) => {
      const i = prev.findIndex((c) => c.id === id);
      const j = i + direccion;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const copia = [...prev];
      [copia[i], copia[j]] = [copia[j], copia[i]];
      return copia;
    });
  }

  function eliminar(id: string) {
    setColecciones((prev) => prev.filter((c) => c.id !== id));
    setErrores((prev) => {
      if (!(id in prev)) return prev;
      const resto = { ...prev };
      delete resto[id];
      return resto;
    });
  }

  async function subirImagen(id: string, archivo: File) {
    setSubiendoId(id);
    try {
      const formData = new FormData();
      formData.set("archivo", archivo);
      const resp = await fetch("/api/admin/colecciones/imagen", { method: "POST", body: formData });
      const data = (await resp.json()) as { ok: boolean; url?: string; mensaje?: string };
      if (!resp.ok || !data.ok || !data.url) {
        toast.error(data.mensaje ?? "No se pudo subir la imagen.");
        return;
      }
      actualizar(id, { imagenUrl: data.url });
    } catch (err) {
      logError("ColeccionesConfig.subirImagen", err, "No se pudo conectar con el servidor — revisá tu conexión a internet y probá de nuevo.");
      toast.error("No se pudo conectar con el servidor.");
    } finally {
      setSubiendoId(null);
    }
  }

  async function guardar() {
    const nuevosErrores: Record<string, string> = {};
    for (const c of colecciones) {
      if (!c.nombre.trim()) nuevosErrores[c.id] = "Falta el nombre.";
    }
    setErrores(nuevosErrores);
    if (Object.keys(nuevosErrores).length > 0) {
      toast.error("Revisá las colecciones sin nombre antes de guardar.");
      return;
    }

    setGuardando(true);
    try {
      const resp = await fetch("/api/admin/colecciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(colecciones),
      });
      const data = (await resp.json()) as { ok: boolean; colecciones?: Coleccion[]; mensaje?: string };
      if (!resp.ok || !data.ok || !data.colecciones) {
        toast.error(data.mensaje ?? "No se pudieron guardar las colecciones.");
        return;
      }
      setColecciones(data.colecciones);
      toast.success("Colecciones actualizadas.");
    } catch (err) {
      logError("ColeccionesConfig.guardar", err, "No se pudo conectar con el servidor — revisá tu conexión a internet y probá de nuevo.");
      toast.error("No se pudo conectar con el servidor.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="rounded-2xl border border-ink-200 p-4">
      <h2 className="text-sm font-semibold text-ink-900">Colecciones de la home</h2>
      <p className="mt-1 text-xs text-ink-500">
        Cada una es una tarjeta en la página principal. La imagen es obligatoria para que se vea bien; el filtro decide
        qué productos del catálogo se muestran al hacer clic (dejalo vacío para incluir todo).
      </p>

      {colecciones.length === 0 && (
        <p className="mt-4 rounded-xl border border-dashed border-ink-200 p-4 text-center text-xs text-ink-500">
          Todavía no hay colecciones configuradas. La home sigue mostrando el catálogo completo hasta que agregues la
          primera.
        </p>
      )}

      <div className="mt-4 flex flex-col gap-4">
        {colecciones.map((c, i) => (
          <TarjetaColeccionEditor
            key={c.id}
            coleccion={c}
            opciones={opciones}
            error={errores[c.id]}
            subiendo={subiendoId === c.id}
            esPrimera={i === 0}
            esUltima={i === colecciones.length - 1}
            onNombre={(nombre) => actualizar(c.id, { nombre })}
            onFiltro={(campo, valor) => actualizarFiltro(c.id, campo, valor)}
            onImagen={(archivo) => subirImagen(c.id, archivo)}
            onMoverArriba={() => mover(c.id, -1)}
            onMoverAbajo={() => mover(c.id, 1)}
            onEliminar={() => eliminar(c.id)}
          />
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setColecciones((prev) => [...prev, coleccionVacia()])}
          className="rounded-full border border-ink-200 px-4 py-2 text-sm font-medium text-ink-900 transition-colors hover:border-ink-900"
        >
          + Agregar colección
        </button>
        <button
          type="button"
          onClick={guardar}
          disabled={guardando}
          className="rounded-full bg-ink-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-ink-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {guardando ? "Guardando…" : "Guardar cambios"}
        </button>
      </div>
    </div>
  );
}

function TarjetaColeccionEditor({
  coleccion,
  opciones,
  error,
  subiendo,
  esPrimera,
  esUltima,
  onNombre,
  onFiltro,
  onImagen,
  onMoverArriba,
  onMoverAbajo,
  onEliminar,
}: {
  coleccion: Coleccion;
  opciones: Opciones;
  error?: string;
  subiendo: boolean;
  esPrimera: boolean;
  esUltima: boolean;
  onNombre: (v: string) => void;
  onFiltro: (campo: keyof FiltroColeccion, v: string) => void;
  onImagen: (archivo: File) => void;
  onMoverArriba: () => void;
  onMoverAbajo: () => void;
  onEliminar: () => void;
}) {
  const idNombre = useId();
  const OPCIONES_POR_CAMPO: Record<keyof FiltroColeccion, string[]> = {
    marca: opciones.marcas,
    categoria: opciones.categorias,
    linea: opciones.lineas,
    genero: opciones.generos,
    color: opciones.colores,
  };

  return (
    <div className="rounded-xl border border-ink-200 p-3 sm:p-4">
      <div className="flex items-start gap-3">
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-ink-200">
          <ImagenProducto src={coleccion.imagenUrl ?? undefined} alt={coleccion.nombre || "Colección"} className="h-full w-full" sizes="64px" />
        </div>

        <div className="flex-1">
          <label htmlFor={idNombre} className="mb-1 block text-xs font-medium text-ink-500">
            Nombre
          </label>
          <input
            id={idNombre}
            type="text"
            value={coleccion.nombre}
            onChange={(e) => onNombre(e.target.value)}
            placeholder="Ej: Volpe"
            className={`w-full rounded-lg border px-3 py-1.5 text-sm text-ink-900 focus:border-accent-600 ${
              error ? "border-danger-600" : "border-ink-200"
            }`}
          />
          {error && <p className="mt-1 text-xs text-danger-600">{error}</p>}
        </div>

        <div className="flex shrink-0 flex-col gap-1">
          <button
            type="button"
            onClick={onMoverArriba}
            disabled={esPrimera}
            aria-label="Mover arriba"
            className="rounded-lg border border-ink-200 px-2 py-1 text-xs text-ink-700 disabled:cursor-not-allowed disabled:opacity-30"
          >
            ↑
          </button>
          <button
            type="button"
            onClick={onMoverAbajo}
            disabled={esUltima}
            aria-label="Mover abajo"
            className="rounded-lg border border-ink-200 px-2 py-1 text-xs text-ink-700 disabled:cursor-not-allowed disabled:opacity-30"
          >
            ↓
          </button>
        </div>
      </div>

      <div className="mt-3">
        <label className="mb-1 block text-xs font-medium text-ink-500">
          Portada {subiendo && "— subiendo…"}
        </label>
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          disabled={subiendo}
          onChange={(e) => {
            const archivo = e.target.files?.[0];
            if (archivo) onImagen(archivo);
            e.target.value = "";
          }}
          className="block w-full text-xs text-ink-700 file:mr-2 file:rounded-full file:border-0 file:bg-ink-100 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-ink-900 hover:file:bg-ink-200"
        />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {CAMPO_FILTRO.map(({ campo, etiqueta, todas }) => (
          <div key={campo}>
            <label className="mb-1 block text-[11px] font-medium text-ink-500">{etiqueta}</label>
            <select
              value={coleccion.filtro[campo] ?? ""}
              onChange={(e) => onFiltro(campo, e.target.value)}
              className="w-full rounded-lg border border-ink-200 bg-paper-raised px-2 py-1.5 text-xs text-ink-900 focus:border-accent-600"
            >
              <option value="">{todas}</option>
              {OPCIONES_POR_CAMPO[campo].map((op) => (
                <option key={op} value={op}>
                  {op}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={onEliminar}
        className="mt-3 text-xs font-medium text-danger-600 underline-offset-2 hover:underline"
      >
        Quitar colección
      </button>
    </div>
  );
}
