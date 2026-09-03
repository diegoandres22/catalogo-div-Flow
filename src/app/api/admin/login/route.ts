import { NextRequest, NextResponse } from "next/server";
import { COOKIE_SESION, MAX_AGE_COOKIE_SEGUNDOS, crearTokenSesion, validarPassword } from "@/lib/auth";
import { logError } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const password = typeof body?.password === "string" ? body.password : "";

    if (!process.env.ADMIN_PASSWORD) {
      logError(
        "api/admin/login",
        "Falta la variable de entorno ADMIN_PASSWORD — por eso ningún login funciona, sin importar la contraseña que se escriba.",
        "Vercel → tu proyecto → Settings → Environment Variables → agregar ADMIN_PASSWORD (Production) → Redeploy.",
      );
      return NextResponse.json({ ok: false, mensaje: "Contraseña incorrecta." }, { status: 401 });
    }

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
  } catch (err) {
    logError("api/admin/login", err);
    return NextResponse.json({ ok: false, mensaje: "No se pudo iniciar sesión." }, { status: 500 });
  }
}
