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
      <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_minmax(104px,220px)_minmax(0,1fr)] items-center gap-2 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_minmax(140px,280px)_minmax(0,1fr)] sm:gap-3 sm:px-6">
        {/* minmax(0,1fr) en vez de 1fr a secas en los costados: un 1fr
            "pelado" no se achica por debajo del ancho de SU contenido, así
            que si algún día ese contenido crece (ej. el botón de descarga
            mostrando además el de cancelar mientras descarga) empuja TODO
            el header más ancho que la pantalla en vez de contenerse acá. Con
            el piso en 0, el contenido de esta columna puede recortarse/
            scrollear puntualmente sin romper el layout del resto. */}
        {/* En mobile el logo se acorta ("Catálogo") para dejarle ancho
            usable al buscador — a partir de sm ya entra completo. */}
        <div className="min-w-0 justify-self-start">
          <Link href="/" className="shrink-0 text-base font-semibold tracking-tight text-ink-900">
            <span className="sm:hidden">Catálogo</span>
            <span className="hidden sm:inline">Catálogo Mayorista</span>
          </Link>
        </div>
        <BuscadorNavbar />
        <div className="flex min-w-0 items-center justify-self-end gap-1.5 sm:gap-2">
          <DescargaOffline />
          <CarritoBoton />
        </div>
      </div>
    </header>
  );
}
