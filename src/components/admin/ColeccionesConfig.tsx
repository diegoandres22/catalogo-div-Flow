"use client";

import { useId, useState } from "react";
import { toast } from "sonner";
import { logError } from "@/lib/logger";
import { prepararImagenParaSubir } from "@/lib/imagenCliente";
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

/** Chips de resumen para la vista de solo lectura — "Marca: VOLPE", etc., o "Todo el catálogo" si no filtra nada. */
function resumenFiltro(filtro: FiltroColeccion): string[] {
  const partes = CAMPO_FILTRO.filter(({ campo }) => filtro[campo]).map(({ campo, etiqueta }) => `${etiqueta}: ${filtro[campo]}`);
  return partes.length > 0 ? partes : ["Todo el catálogo"];
}

/** Confirmación antes de borrar — un solo toast con acción "Eliminar"/"Cancelar" en vez de borrar directo al click. Se queda en pantalla (duration: Infinity) hasta que el admin elija una de las dos. */
function confirmarEliminar(nombre: string, alConfirmar: () => void) {
  toast(`¿Eliminar "${nombre.trim() || "esta colección"}"?`, {
    description: "Esta acción no se puede deshacer.",
    duration: Infinity,
    action: { label: "Eliminar", onClick: () => alConfirmar() },
    cancel: { label: "Cancelar", onClick: () => {} },
  });
}

// El admin ahora puede crear/renombrar/quitar colecciones libremente (no son
// 6 slots fijos) — ver la respuesta de Diego a la pregunta de "modelo de
// datos" del pedido original. El orden de la lista en pantalla ES el orden
// de las tarjetas en la home (botones subir/bajar en vez de un campo
// "orden" aparte).
//
// Vista vs. edición: una colección YA GUARDADA arranca en modo lectura
// (TarjetaColeccionVista) — antes se veía siempre como formulario abierto,
// sin forma de distinguir "esto ya está guardado" de "esto es nuevo/sin
// guardar" (queja de Diego). Solo una colección recién agregada con "+
// Agregar colección", o una que el admin tocó explícitamente con "Editar",
// se muestra como formulario (TarjetaColeccionEditor). "guardadas" guarda
// la última versión confirmada por el servidor — es lo que "Cancelar"
// restaura al cerrar una edición sin guardar.
export function ColeccionesConfig({ opciones, coleccionesIniciales }: { opciones: Opciones; coleccionesIniciales: Coleccion[] }) {
  const [colecciones, setColecciones] = useState<Coleccion[]>(coleccionesIniciales);
  const [guardadas, setGuardadas] = useState<Coleccion[]>(coleccionesIniciales);
  const [idsEnEdicion, setIdsEnEdicion] = useState<Set<string>>(new Set());
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

  function limpiarError(id: string) {
    setErrores((prev) => {
      if (!(id in prev)) return prev;
      const resto = { ...prev };
      delete resto[id];
      return resto;
    });
  }

  function eliminar(id: string) {
    setColecciones((prev) => prev.filter((c) => c.id !== id));
    setIdsEnEdicion((prev) => {
      if (!prev.has(id)) return prev;
      const copia = new Set(prev);
      copia.delete(id);
      return copia;
    });
    limpiarError(id);
  }

  function editar(id: string) {
    setIdsEnEdicion((prev) => new Set(prev).add(id));
  }

  /** Cierra el formulario sin guardar: si la colección ya existía, vuelve a sus valores guardados; si es nueva (recién agregada, nunca guardada), se descarta directamente. */
  function cancelar(id: string) {
    const original = guardadas.find((g) => g.id === id);
    if (original) {
      setColecciones((prev) => prev.map((c) => (c.id === id ? original : c)));
      setIdsEnEdicion((prev) => {
        const copia = new Set(prev);
        copia.delete(id);
        return copia;
      });
      limpiarError(id);
    } else {
      eliminar(id);
    }
  }

  async function subirImagen(id: string, archivoOriginal: File) {
    setSubiendoId(id);
    try {
      const archivo = await prepararImagenParaSubir(archivoOriginal);
      const formData = new FormData();
      formData.set("archivo", archivo);
      const resp = await fetch("/api/admin/colecciones/imagen", { method: "POST", body: formData });

      if (!resp.ok) {
        // Un 413 (o cualquier otro corte antes de llegar a nuestro route
        // handler) no siempre trae JSON — leerlo como texto primero evita
        // el "Unexpected token" al intentar parsear HTML/texto plano.
        const texto = await resp.text();
        let mensaje =
          resp.status === 413 ? "La imagen sigue pesando demasiado — probá con otra o recortala." : "No se pudo subir la imagen.";
        try {
          const data = JSON.parse(texto) as { mensaje?: string };
          if (data.mensaje) mensaje = data.mensaje;
        } catch {
          // No era JSON — se queda con el mensaje genérico de arriba.
        }
        toast.error(mensaje);
        return;
      }

      const data = (await resp.json()) as { ok: boolean; url?: string; mensaje?: string };
      if (!data.ok || !data.url) {
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
      // Guardado exitoso = ya no queda ningún formulario abierto: TODO lo
      // que se ve ahora es, por definición, lo que hay guardado en el
      // servidor — ver la nota grande de arriba.
      setColecciones(data.colecciones);
      setGuardadas(data.colecciones);
      setIdsEnEdicion(new Set());
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

      <div className="mt-4 flex flex-col gap-3">
        {colecciones.map((c, i) =>
          idsEnEdicion.has(c.id) ? (
            <TarjetaColeccionEditor
              key={c.id}
              coleccion={c}
              opciones={opciones}
              error={errores[c.id]}
              subiendo={subiendoId === c.id}
              guardando={guardando}
              esNueva={!guardadas.some((g) => g.id === c.id)}
              esPrimera={i === 0}
              esUltima={i === colecciones.length - 1}
              onNombre={(nombre) => actualizar(c.id, { nombre })}
              onFiltro={(campo, valor) => actualizarFiltro(c.id, campo, valor)}
              onImagen={(archivo) => subirImagen(c.id, archivo)}
              onMoverArriba={() => mover(c.id, -1)}
              onMoverAbajo={() => mover(c.id, 1)}
              onEliminar={() => confirmarEliminar(c.nombre, () => eliminar(c.id))}
              onGuardar={guardar}
              onCancelar={() => cancelar(c.id)}
            />
          ) : (
            <TarjetaColeccionVista
              key={c.id}
              coleccion={c}
              esPrimera={i === 0}
              esUltima={i === colecciones.length - 1}
              onMoverArriba={() => mover(c.id, -1)}
              onMoverAbajo={() => mover(c.id, 1)}
              onEditar={() => editar(c.id)}
              onEliminar={() => confirmarEliminar(c.nombre, () => eliminar(c.id))}
            />
          ),
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => {
            const nueva = coleccionVacia();
            setColecciones((prev) => [...prev, nueva]);
            editar(nueva.id);
          }}
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

/** Colección ya guardada — solo lectura. Reordenar (↑↓) y quitar siguen disponibles acá mismo; para tocar nombre/imagen/filtro hay que entrar a "Editar" explícitamente (ver la nota grande arriba). */
function TarjetaColeccionVista({
  coleccion,
  esPrimera,
  esUltima,
  onMoverArriba,
  onMoverAbajo,
  onEditar,
  onEliminar,
}: {
  coleccion: Coleccion;
  esPrimera: boolean;
  esUltima: boolean;
  onMoverArriba: () => void;
  onMoverAbajo: () => void;
  onEditar: () => void;
  onEliminar: () => void;
}) {
  return (
    <div className="rounded-xl border border-ink-200 bg-paper-raised p-3 sm:p-4">
      <div className="flex items-start gap-3">
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-ink-200">
          <ImagenProducto src={coleccion.imagenUrl ?? undefined} alt={coleccion.nombre} className="h-full w-full" sizes="64px" />
        </div>

        <div className="flex-1">
          <span className="block text-sm font-semibold text-ink-900">{coleccion.nombre}</span>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {resumenFiltro(coleccion.filtro).map((etiqueta) => (
              <span key={etiqueta} className="rounded-md border border-ink-200 bg-ink-100 px-1.5 py-0.5 text-[11px] text-ink-700">
                {etiqueta}
              </span>
            ))}
          </div>
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

      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={onEditar}
          className="rounded-full border border-ink-200 px-3 py-1.5 text-xs font-medium text-ink-900 transition-colors hover:border-ink-900"
        >
          Editar
        </button>
        <button type="button" onClick={onEliminar} className="text-xs font-medium text-danger-600 underline-offset-2 hover:underline">
          Quitar
        </button>
      </div>
    </div>
  );
}

/** Formulario abierto — colección nueva (sin guardar todavía) o una guardada que el admin tocó con "Editar". El borde de acento distingue de un vistazo esta tarjeta de las de solo lectura. */
function TarjetaColeccionEditor({
  coleccion,
  opciones,
  error,
  subiendo,
  guardando,
  esNueva,
  esPrimera,
  esUltima,
  onNombre,
  onFiltro,
  onImagen,
  onMoverArriba,
  onMoverAbajo,
  onEliminar,
  onGuardar,
  onCancelar,
}: {
  coleccion: Coleccion;
  opciones: Opciones;
  error?: string;
  subiendo: boolean;
  guardando: boolean;
  esNueva: boolean;
  esPrimera: boolean;
  esUltima: boolean;
  onNombre: (v: string) => void;
  onFiltro: (campo: keyof FiltroColeccion, v: string) => void;
  onImagen: (archivo: File) => void;
  onMoverArriba: () => void;
  onMoverAbajo: () => void;
  onEliminar: () => void;
  onGuardar: () => void;
  onCancelar: () => void;
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
    <div className="rounded-xl border-2 border-accent-600 bg-paper-raised p-3 sm:p-4">
      <span
        className={`mb-2 inline-block rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
          esNueva ? "bg-warning-100 text-warning-600" : "bg-info-100 text-info-600"
        }`}
      >
        {esNueva ? "Colección nueva — sin guardar" : "Editando"}
      </span>

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

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onGuardar}
          disabled={guardando}
          className="rounded-full bg-ink-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-ink-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {guardando ? "Guardando…" : "Guardar"}
        </button>
        <button
          type="button"
          onClick={onCancelar}
          disabled={guardando}
          className="text-xs font-medium text-ink-500 underline-offset-2 hover:underline disabled:cursor-not-allowed"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={onEliminar}
          className="ml-auto text-xs font-medium text-danger-600 underline-offset-2 hover:underline"
        >
          Quitar colección
        </button>
      </div>
    </div>
  );
}
