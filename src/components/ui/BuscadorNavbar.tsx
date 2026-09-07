"use client";

import { useId, useState, type FormEvent } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useBusqueda } from "@/components/catalogo/BusquedaContext";

// Buscador global en el navbar: visible en cualquier parte del scroll (el
// Header ya es sticky), no solo arriba del catálogo.
//
// En "/" filtra en vivo, tecla por tecla, escribiendo directo en la
// búsqueda compartida (BusquedaContext) — igual que antes.
//
// En cualquier otra página (detalle de producto, etc.) no hay catálogo que
// filtrar ahí mismo, así que el input es un borrador local: escribir no
// toca la búsqueda compartida hasta confirmar con Enter, que navega a
// "/?q=…" ya filtrado. Sin este borrador, un texto a medio escribir en la
// página de un producto dejaría el catálogo filtrado por algo que nunca se
// llegó a buscar, apenas volvieras con "Volver al catálogo".
export function BuscadorNavbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { busqueda, setBusqueda } = useBusqueda();
  const enCatalogo = pathname === "/";
  const id = useId();

  const [borrador, setBorrador] = useState(busqueda);
  // Reinicia el borrador al valor confirmado cada vez que cambia de
  // página — durante el render (no en un efecto aparte) para no disparar
  // un segundo render extra ni un parpadeo del valor previo.
  const [pathnamePrevio, setPathnamePrevio] = useState(pathname);
  if (pathname !== pathnamePrevio) {
    setPathnamePrevio(pathname);
    setBorrador(busqueda);
  }

  const valor = enCatalogo ? busqueda : borrador;

  function onChange(v: string) {
    if (enCatalogo) setBusqueda(v);
    else setBorrador(v);
  }

  function enviar(e: FormEvent) {
    e.preventDefault();
    if (enCatalogo) return; // ya filtra en vivo, no hace falta confirmar
    const texto = borrador.trim();
    setBusqueda(texto);
    router.push(texto ? `/?q=${encodeURIComponent(texto)}` : "/");
  }

  return (
    // El ancho (piso y techo) ya lo define el track central del grid en
    // Header — acá solo hay que llenarlo (w-full) y no oponer resistencia
    // a que se achique (min-w-0, si no un <form> por defecto no se achica
    // más allá del contenido, lo que rompería el centrado en mobile).
    <form onSubmit={enviar} role="search" className="w-full min-w-0">
      <label htmlFor={id} className="sr-only">
        Buscar por modelo, marca, color o código SAP
      </label>
      <div className="relative">
        <button
          type="submit"
          aria-label="Buscar en el catálogo"
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-500"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
          </svg>
        </button>
        <input
          id={id}
          type="search"
          placeholder={enCatalogo ? "Buscar…" : "Buscar en el catálogo…"}
          value={valor}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-full border border-ink-200 bg-paper-raised py-1.5 pl-8 pr-3 text-sm text-ink-900 placeholder:text-ink-500 focus:border-accent-600"
        />
      </div>
    </form>
  );
}
