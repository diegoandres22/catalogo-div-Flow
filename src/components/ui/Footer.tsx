import Link from "next/link";
import Image from "next/image";

const MARCAS = [
  { nombre: "Volpe", src: "/marcas/volpe.png", ancho: 783, alto: 161 },
  { nombre: "Vita Kids", src: "/marcas/vitakids.png", ancho: 976, alto: 346 },
  { nombre: "Kriza", src: "/marcas/kriza.svg", ancho: 1001, alto: 275 },
];

export function Footer() {
  const anio = new Date().getFullYear();

  return (
    <footer className="mt-12 border-t border-ink-200 bg-paper-raised">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3 sm:px-6">
        <div>
          <h2 className="text-sm font-semibold text-ink-900">Calzados Mesvol</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-500">
            Fábrica de calzado venezolana con más de 70 años de trayectoria, negocio familiar de tres generaciones.
            Capacidad instalada de 192.000 pares al mes.
          </p>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-ink-900">Nuestras marcas</h2>
          <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-3">
            {MARCAS.map((marca) => (
              <Image
                key={marca.nombre}
                src={marca.src}
                alt={marca.nombre}
                width={marca.ancho}
                height={marca.alto}
                className="h-7 w-auto object-contain"
              />
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-ink-900">Contacto</h2>
          <p className="mt-2 text-sm text-ink-500">Calzados Mesvol, C.A.</p>
          <p className="text-sm text-ink-500">RIF J-30242134-9</p>
        </div>
      </div>

      <div className="border-t border-ink-200">
        <div className="mx-auto flex max-w-6xl flex-col-reverse items-center justify-between gap-2 px-4 py-4 text-xs text-ink-500 sm:flex-row sm:px-6">
          <span>© {anio} Calzados Mesvol, C.A.</span>
          <Link href="/admin" className="underline-offset-2 hover:text-ink-900 hover:underline">
            Acceso administrador
          </Link>
        </div>
      </div>
    </footer>
  );
}
