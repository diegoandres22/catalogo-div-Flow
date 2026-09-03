// Logging centralizado de errores. Un solo formato, en español, pensado
// para leerse directo sin ayuda externa:
//  - En el servidor (route handlers), llega a los "Runtime Logs" de Vercel
//    (Deployments → el deployment activo → pestaña Logs, o Observability).
//  - En el navegador, llega a la consola de DevTools (F12 → Console).
//
// Uso: logError("contexto corto", error, "pista opcional de cómo resolverlo").
// El contexto identifica DÓNDE pasó (ej. "api/admin/upload-token"), el
// mensaje de error explica QUÉ pasó, y la pista (cuando se puede deducir)
// explica CÓMO resolverlo — sin tener que preguntar.

export function logError(contexto: string, error: unknown, pista?: string): void {
  const mensaje = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;

  const lineas = [`🔴 [${contexto}] ${mensaje}`];
  if (pista) lineas.push(`   → Cómo resolverlo: ${pista}`);
  if (stack) lineas.push(`   → Detalle técnico:\n${stack}`);

  console.error(lineas.join("\n"));
}

/**
 * Diagnóstico automático para errores de Vercel Blob: varios mensajes de
 * esa librería son crípticos fuera de contexto — acá se traducen a una
 * pista accionable cuando el texto del error los delata.
 */
export function pistaBlob(mensaje: string): string | undefined {
  if (/BLOB_READ_WRITE_TOKEN|credentials|Invalid `token`/i.test(mensaje)) {
    return (
      "Falta (o está mal) la variable de entorno BLOB_READ_WRITE_TOKEN en Vercel. " +
      "El token OIDC automático (BLOB_STORE_ID) alcanza para que el servidor lea/escriba " +
      "el catálogo, pero NO alcanza para autorizar subidas directas desde el navegador " +
      "('client upload') — esa función pide específicamente el token de lectura-escritura. " +
      "Solución: Vercel → tu proyecto → pestaña Storage → el store de Blob conectado → " +
      "copiar el 'BLOB_READ_WRITE_TOKEN' (o generarlo si no existe) → Settings → " +
      "Environment Variables → pegarlo ahí (Production) → Redeploy."
    );
  }
  if (/BlobNotFoundError|not_found/i.test(mensaje)) {
    return "El archivo no existe en Blob todavía — normal si es la primera carga del catálogo, no requiere acción.";
  }
  return undefined;
}
