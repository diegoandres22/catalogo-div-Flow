import { NextResponse } from "next/server";
import { revertirABackup } from "@/lib/blob";
import { logError, pistaBlob } from "@/lib/logger";

export async function POST() {
  try {
    const catalogo = await revertirABackup();
    return NextResponse.json({
      ok: true,
      totalProductos: catalogo.totalProductos,
      totalVariantes: catalogo.totalVariantes,
    });
  } catch (err) {
    const mensaje = err instanceof Error ? err.message : "No se pudo revertir al respaldo.";
    logError("api/admin/revert", err, pistaBlob(mensaje));
    return NextResponse.json({ ok: false, mensaje }, { status: 400 });
  }
}
