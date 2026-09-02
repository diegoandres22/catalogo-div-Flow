// Autenticación mínima de un solo administrador: la contraseña vive en
// ADMIN_PASSWORD y la sesión es una cookie httpOnly firmada con HMAC-SHA256.
// No hay tabla de usuarios ni recuperación de contraseña.
//
// Se usa Web Crypto (crypto.subtle) en vez de `node:crypto` para que el mismo
// código funcione tanto en middleware (Edge) como en route handlers (Node).

const SIETE_DIAS_MS = 7 * 24 * 60 * 60 * 1000;
export const COOKIE_SESION = "admin_session";

const encoder = new TextEncoder();

function bytesABase64Url(bytes: ArrayBuffer): string {
  let binario = "";
  new Uint8Array(bytes).forEach((b) => {
    binario += String.fromCharCode(b);
  });
  return btoa(binario).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function firmar(payload: string, secreto: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secreto), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ]);
  const firma = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return bytesABase64Url(firma);
}

function compararConstante(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function crearTokenSesion(): Promise<string> {
  const secreto = process.env.ADMIN_PASSWORD;
  if (!secreto) throw new Error("Falta configurar ADMIN_PASSWORD");
  const expira = Date.now() + SIETE_DIAS_MS;
  const payload = String(expira);
  const firma = await firmar(payload, secreto);
  return `${payload}.${firma}`;
}

export async function tokenSesionValido(token: string | undefined | null): Promise<boolean> {
  if (!token) return false;
  const secreto = process.env.ADMIN_PASSWORD;
  if (!secreto) return false;

  const [payload, firma] = token.split(".");
  if (!payload || !firma) return false;

  const expira = Number(payload);
  if (!Number.isFinite(expira) || Date.now() > expira) return false;

  const firmaEsperada = await firmar(payload, secreto);
  return compararConstante(firma, firmaEsperada);
}

export function validarPassword(intento: string): boolean {
  const esperado = process.env.ADMIN_PASSWORD;
  if (!esperado) return false;
  return compararConstante(intento, esperado);
}

export const MAX_AGE_COOKIE_SEGUNDOS = SIETE_DIAS_MS / 1000;
