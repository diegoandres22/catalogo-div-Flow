import { NextRequest, NextResponse } from "next/server";
import { COOKIE_SESION, MAX_AGE_COOKIE_SEGUNDOS, crearTokenSesion, validarPassword } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const password = typeof body?.password === "string" ? body.password : "";

  if (!password || !validarPassword(password)) {
    return NextResponse.json({ ok: false, mensaje: "Contraseña incorrecta." }, { status: 401 });
  }

  const token = await crearTokenSesion();
  const respuesta = NextResponse.json({ ok: true });
  respuesta.cookies.set(COOKIE_SESION, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_COOKIE_SEGUNDOS,
  });
  return respuesta;
}
