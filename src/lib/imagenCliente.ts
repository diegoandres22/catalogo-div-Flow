// Utilidades de imagen que corren en el NAVEGADOR (canvas/Image bitmap) —
// nunca se importan desde código de servidor.
//
// Por qué existe: las funciones serverless de Vercel tienen un límite duro
// de ~4.5 MB en el body del pedido (ver la nota en
// /api/admin/upload/route.ts) — una foto de celular sin redimensionar lo
// supera fácil y el pedido vuelve con 413 antes de tocar nuestro código (por
// eso el error que se ve en el navegador ni siquiera es JSON). La forma
// "correcta" de esquivar ese límite en Vercel es subir directo del
// navegador a Blob con un token firmado, pero ESE camino específico ya
// quedó probado y roto en este proyecto por un bug de CORS del lado de
// Vercel (ver la misma nota) — así que en vez de reintentar esa ruta acá,
// se redimensiona/recomprime la imagen ACÁ, en el navegador, antes de
// mandarla por el camino simple que ya funciona.
export async function prepararImagenParaSubir(
  archivo: File,
  opciones: { maxAncho?: number; maxAlto?: number; calidad?: number } = {},
): Promise<File> {
  const { maxAncho = 1600, maxAlto = 1600, calidad = 0.85 } = opciones;

  if (!archivo.type.startsWith("image/")) return archivo;

  try {
    const bitmap = await createImageBitmap(archivo);
    const escala = Math.min(1, maxAncho / bitmap.width, maxAlto / bitmap.height);

    // Ya entra bien en dimensiones y no pesa demasiado — no vale la pena
    // recomprimir (evita, por ejemplo, degradar de más una foto chica).
    if (escala === 1 && archivo.size <= 1.5 * 1024 * 1024) {
      bitmap.close();
      return archivo;
    }

    const ancho = Math.max(1, Math.round(bitmap.width * escala));
    const alto = Math.max(1, Math.round(bitmap.height * escala));

    const canvas = document.createElement("canvas");
    canvas.width = ancho;
    canvas.height = alto;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return archivo;
    }
    ctx.drawImage(bitmap, 0, 0, ancho, alto);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", calidad));
    if (!blob) return archivo;

    const nombre = archivo.name.replace(/\.[^./\\]+$/, "") + ".jpg";
    return new File([blob], nombre, { type: "image/jpeg" });
  } catch {
    // Si algo del navegador falla (canvas bloqueado, formato no soportado,
    // etc.) se sigue con el archivo original — mejor intentar la subida tal
    // cual que romper todo el flujo acá.
    return archivo;
  }
}
