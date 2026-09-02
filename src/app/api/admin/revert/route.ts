import { NextResponse } from "next/server";
import { revertirABackup } from "@/lib/blob";

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
    return NextResponse.json({ ok: false, mensaje }, { status: 400 });
  }
}
