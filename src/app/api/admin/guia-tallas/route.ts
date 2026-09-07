import { NextRequest, NextResponse } from "next/server";
import { guardarGuiaTallas, leerGuiaTallas, subirImagenGuiaTallas } from "@/lib/blob";
import type { GuiaTallas } from "@/lib/types";
import { logError, pistaBlob } from "@/lib/logger";

// Guía de tallas: config aparte del catálogo (no cambia con cada carga de
// Excel — ver la nota en lib/blob.ts). El admin sube una imagen o pega un
// link para cada uno de los 2 campos ("instrucciones" y "tabla"); ambos son
// opcionales y quedan tal cual como venían si no se toca ese campo en esta
// carga (por eso se lee la config actual antes de mezclar).
const CAMPOS = ["instrucciones", "tabla"] as const;
type Campo = (typeof CAMPOS)[number];

const TIPOS_IMAGEN_PERMITIDOS = ["image/png", "image/jpeg", "image/webp"];

export async function GET() {
  try {
    const guia = await leerGuiaTallas();
    return NextResponse.json({ ok: true, guia });
  } catch (err) {
    const mensaje = err instanceof Error ? err.message : "No se pudo leer la guía de tallas.";
    logError("api/admin/guia-tallas GET", err, pistaBlob(mensaje));
    return NextResponse.json({ ok: false, mensaje }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const actual = await leerGuiaTallas();
    const nueva: GuiaTallas = { ...actual };

    for (const campo of CAMPOS satisfies readonly Campo[]) {
      const archivo = formData.get(`${campo}Archivo`);
      const link = String(formData.get(`${campo}Link`) ?? "").trim();

      // Si en esta carga vino un archivo Y un link para el mismo campo, gana
      // el archivo (es lo que el admin acaba de subir a propósito) — el link
      // queda ignorado en vez de generar un error confuso por un campo que
      // de todas formas no hacía falta llenar.
      if (archivo instanceof File && archivo.size > 0) {
        if (!TIPOS_IMAGEN_PERMITIDOS.includes(archivo.type)) {
          return NextResponse.json(
            { ok: false, mensaje: `"${campo}": la imagen debe ser PNG, JPG o WEBP.` },
            { status: 400 },
          );
        }
        const bytes = await archivo.arrayBuffer();
        nueva[campo] = await subirImagenGuiaTallas(`${campo}-${archivo.name || "imagen"}`, bytes, archivo.type);
      } else if (link) {
        if (!/^https?:\/\//i.test(link)) {
          return NextResponse.json(
            { ok: false, mensaje: `"${campo}": el link tiene que empezar con http:// o https://` },
            { status: 400 },
          );
        }
        nueva[campo] = link;
      }
      // Si no vino ni archivo ni link para este campo, se deja tal cual
      // estaba (nueva ya arrancó como copia de "actual").
    }

    await guardarGuiaTallas(nueva);
    return NextResponse.json({ ok: true, guia: nueva });
  } catch (err) {
    const mensaje = err instanceof Error ? err.message : "No se pudo guardar la guía de tallas.";
    logError("api/admin/guia-tallas POST", err, pistaBlob(mensaje));
    return NextResponse.json({ ok: false, mensaje }, { status: 500 });
  }
}
