import { NextResponse } from "next/server";
import { COOKIE_SESION } from "@/lib/auth";

export async function POST() {
  const respuesta = NextResponse.json({ ok: true });
  respuesta.cookies.set(COOKIE_SESION, "", { httpOnly: true, path: "/", maxAge: 0 });
  return respuesta;
}
