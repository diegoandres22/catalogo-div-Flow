import Link from "next/link";
import { CarritoBoton } from "@/components/carrito/CarritoBoton";
import { BuscadorNavbar } from "./BuscadorNavbar";
import { DescargaOffline } from "./DescargaOffline";

export function Header() {
  return (
    <header className="sticky top-0 z-20 border-b border-ink-200 bg-paper/90 backdrop-blur supports-[backdrop-filter]:bg-paper/70">
      {/* Grid de 3 columnas, las dos de los costados con el MISMO ancho
          fraccional (1fr/…/1fr) — es lo que centra el buscador de verdad
          (equidistante de los dos bordes) en vez de "lo que sobre después
          del logo", que quedaba corrido a la izquierda cuando logo y
          carrito no pesan lo mismo. La columna central se acota con
          minmax(piso, techo) para que el buscador nunca se estire de más
          en desktop ni se aplaste por debajo de un ancho usable en mobile. */}
      <div className="mx-auto grid max-w-6xl grid-cols-[1fr_minmax(104px,220px)_1fr] items-center gap-2 px-4 py-3 sm:grid-cols-[1fr_minmax(140px,280px)_1fr] sm:gap-3 sm:px-6">
        {/* En mobile el logo se acorta ("Catálogo") para dejarle ancho
            usable al buscador — a partir de sm ya entra completo. */}
        <div className="justify-self-start">
          <Link href="/" className="shrink-0 text-base font-semibold tracking-tight text-ink-900">
            <span className="sm:hidden">Catálogo</span>
            <span className="hidden sm:inline">Catálogo Mayorista</span>
          </Link>
        </div>
        <BuscadorNavbar />
        <div className="flex items-center justify-self-end gap-2">
          <DescargaOffline />
          <CarritoBoton />
        </div>
      </div>
    </header>
  );
}
