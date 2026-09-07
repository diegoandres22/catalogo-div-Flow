import Link from "next/link";
import { CarritoBoton } from "@/components/carrito/CarritoBoton";
import { BuscadorNavbar } from "./BuscadorNavbar";

export function Header() {
  return (
    <header className="sticky top-0 z-20 border-b border-ink-200 bg-paper/90 backdrop-blur supports-[backdrop-filter]:bg-paper/70">
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3 sm:gap-3 sm:px-6">
        {/* En mobile el logo se acorta ("Catálogo") para dejarle ancho
            usable al buscador — a partir de sm ya entra completo. */}
        <Link href="/" className="shrink-0 text-base font-semibold tracking-tight text-ink-900">
          <span className="sm:hidden">Catálogo</span>
          <span className="hidden sm:inline">Catálogo Mayorista</span>
        </Link>
        <BuscadorNavbar />
        <CarritoBoton />
      </div>
    </header>
  );
}
