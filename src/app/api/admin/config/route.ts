import { NextRequest, NextResponse } from "next/server";
import { guardarConfigSitio, leerConfigSitio } from "@/lib/blob";
import type { ConfigSitio } from "@/lib/types";
import { logError, pistaBlob } from "@/lib/logger";

// Config operativa del sitio (WhatsApp de ventas, datos de contacto del
// footer) — Propuesta 10. Mismo patrón que /api/admin/guia-tallas: GET
// devuelve lo guardado (o los 3 campos en null si no se configuró nada
// todavía), POST reemplaza el documento entero con lo que llega del form.
export async function GET() {
  try {
    const config = await leerConfigSitio();
    return NextResponse.json({ ok: true, config });
  } catch (err) {
    const mensaje = err instanceof Error ? err.message : "No se pudo leer la configuración.";
    logError("api/admin/config GET", err, pistaBlob(mensaje));
    return NextResponse.json({ ok: false, mensaje }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ ok: false, mensaje: "Cuerpo de la solicitud inválido." }, { status: 400 });
    }

    const whatsappVentas = typeof body.whatsappVentas === "string" ? body.whatsappVentas.trim() : "";
    const descripcionEmpresa = typeof body.descripcionEmpresa === "string" ? body.descripcionEmpresa.trim() : "";
    const rif = typeof body.rif === "string" ? body.rif.trim() : "";

    if (whatsappVentas && whatsappVentas.replace(/\D/g, "").length < 10) {
      return NextResponse.json(
        { ok: false, mensaje: "El WhatsApp de ventas debe tener al menos 10 dígitos (formato internacional, sin '+' ni espacios)." },
        { status: 400 },
      );
    }

    const config: ConfigSitio = {
      whatsappVentas: whatsappVentas || null,
      descripcionEmpresa: descripcionEmpresa || null,
      rif: rif || null,
    };

    await guardarConfigSitio(config);
    return NextResponse.json({ ok: true, config });
  } catch (err) {
    const mensaje = err instanceof Error ? err.message : "No se pudo guardar la configuración.";
    logError("api/admin/config POST", err, pistaBlob(mensaje));
    return NextResponse.json({ ok: false, mensaje }, { status: 500 });
  }
}
