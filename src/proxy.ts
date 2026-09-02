import { NextRequest, NextResponse } from "next/server";
import { COOKIE_SESION, tokenSesionValido } from "@/lib/auth";

// Protege todo /admin/* y /api/admin/* excepto la propia pantalla/endpoint de login.
// (Next.js 16 renombró "middleware" a "proxy"; misma función, nuevo nombre de archivo.)
const RUTAS_PUBLICAS = ["/admin/login", "/api/admin/login"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (RUTAS_PUBLICAS.some((ruta) => pathname === ruta)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_SESION)?.value;
  const autenticado = await tokenSesionValido(token);

  if (!autenticado) {
    if (pathname.startsWith("/api/admin")) {
      return NextResponse.json({ ok: false, mensaje: "No autenticado" }, { status: 401 });
    }
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
