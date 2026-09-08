"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/admin", etiqueta: "Dashboard" },
  { href: "/admin/catalogo", etiqueta: "Catálogo" },
  { href: "/admin/configuracion", etiqueta: "Configuración" },
];

// Navegación del panel — separada en secciones a medida que el panel fue
// ganando funcionalidades (antes todo vivía en una sola pantalla). Cada
// pestaña agrupa lo que tiene algo en común: ver el estado del catálogo
// (Dashboard), cargarlo/revertirlo/ver su historial (Catálogo), y datos
// operativos que casi no cambian (Configuración).
export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="mx-auto flex max-w-3xl gap-1 overflow-x-auto px-4 sm:px-6" aria-label="Secciones del panel">
      {TABS.map((tab) => {
        const activo = tab.href === "/admin" ? pathname === "/admin" : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={activo ? "page" : undefined}
            className={`shrink-0 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
              activo ? "border-ink-900 text-ink-900" : "border-transparent text-ink-500 hover:text-ink-900"
            }`}
          >
            {tab.etiqueta}
          </Link>
        );
      })}
    </nav>
  );
}
