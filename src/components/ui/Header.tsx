import Link from "next/link";
import { CarritoBoton } from "@/components/carrito/CarritoBoton";
import { BuscadorNavbar } from "./BuscadorNavbar";

export function Header() {
  return (
    <header className="sticky top-0 z-20 border-b border-ink-200 bg-paper/90 backdrop-blur supports-[backdrop-filter]:bg-paper/70">
      <div className="mx-auto flex max-w-6xl flex-col gap-2.5 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-base font-semibold tracking-tight text-ink-900">
            Catálogo Mayorista
          </Link>
          <CarritoBoton />
        </div>
        <BuscadorNavbar />
      </div>
    </header>
  );
}
