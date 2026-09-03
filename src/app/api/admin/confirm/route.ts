import { NextResponse } from "next/server";
import { confirmarReemplazoCatalogo } from "@/lib/blob";
import { logError, pistaBlob } from "@/lib/logger";

export async function POST() {
  try {
    const catalogo = await confirmarReemplazoCatalogo();
    return NextResponse.json({
      ok: true,
      totalProductos: catalogo.totalProductos,
      totalVariantes: catalogo.totalVariantes,
    });
  } catch (err) {
    const mensaje = err instanceof Error ? err.message : "No se pudo confirmar el reemplazo.";
    logError("api/admin/confirm", err, pistaBlob(mensaje));
    return NextResponse.json({ ok: false, mensaje }, { status: 400 });
  }
}
