import { NextRequest, NextResponse } from "next/server";
import { guardarColecciones, leerColecciones } from "@/lib/blob";
import type { Coleccion, FiltroColeccion } from "@/lib/types";
import { logError, pistaBlob } from "@/lib/logger";

// Mismo patrón que /api/admin/config: GET devuelve la lista guardada (o
// vacía si el admin todavía no configuró ninguna), POST reemplaza la lista
// entera con lo que llega del panel — el panel es quien maneja alta/edición/
// borrado/reorden como una sola lista en memoria y la guarda de una vez.
const CAMPOS_FILTRO = ["marca", "categoria", "linea", "genero", "color"] as const;

function limpiarFiltro(valor: unknown): FiltroColeccion {
  const filtro: FiltroColeccion = {};
  if (!valor || typeof valor !== "object") return filtro;
  const obj = valor as Record<string, unknown>;
  for (const campo of CAMPOS_FILTRO) {
    const v = obj[campo];
    if (typeof v === "string" && v.trim()) filtro[campo] = v.trim();
  }
  return filtro;
}

function validarYLimpiar(body: unknown): { ok: true; colecciones: Coleccion[] } | { ok: false; mensaje: string } {
  if (!Array.isArray(body)) return { ok: false, mensaje: "Se esperaba una lista de colecciones." };

  const idsVistos = new Set<string>();
  const colecciones: Coleccion[] = [];

  for (const item of body) {
    if (!item || typeof item !== "object") return { ok: false, mensaje: "Cada colección debe ser un objeto." };
    const { id, nombre, imagenUrl, filtro } = item as Record<string, unknown>;

    if (typeof id !== "string" || !id.trim()) return { ok: false, mensaje: "Falta el id de alguna colección." };
    if (idsVistos.has(id)) return { ok: false, mensaje: `Id de colección repetido: "${id}".` };
    idsVistos.add(id);

    if (typeof nombre !== "string" || !nombre.trim()) {
      return { ok: false, mensaje: "Toda colección necesita un nombre." };
    }
    if (imagenUrl !== null && typeof imagenUrl !== "string") {
      return { ok: false, mensaje: `"${nombre}": la imagen no tiene un formato válido.` };
    }

    colecciones.push({
      id: id.trim(),
      nombre: nombre.trim(),
      imagenUrl: imagenUrl || null,
      filtro: limpiarFiltro(filtro),
    });
  }

  return { ok: true, colecciones };
}

export async function GET() {
  try {
    const colecciones = await leerColecciones();
    return NextResponse.json({ ok: true, colecciones });
  } catch (err) {
    const mensaje = err instanceof Error ? err.message : "No se pudieron leer las colecciones.";
    logError("api/admin/colecciones GET", err, pistaBlob(mensaje));
    return NextResponse.json({ ok: false, mensaje }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const validacion = validarYLimpiar(body);
    if (!validacion.ok) {
      return NextResponse.json({ ok: false, mensaje: validacion.mensaje }, { status: 400 });
    }

    await guardarColecciones(validacion.colecciones);
    return NextResponse.json({ ok: true, colecciones: validacion.colecciones });
  } catch (err) {
    const mensaje = err instanceof Error ? err.message : "No se pudieron guardar las colecciones.";
    logError("api/admin/colecciones POST", err, pistaBlob(mensaje));
    return NextResponse.json({ ok: false, mensaje }, { status: 500 });
  }
}
