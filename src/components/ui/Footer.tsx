import Link from "next/link";

const MARCAS = ["Volpe", "Vita Kids", "Kriza"];

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
          <ul className="mt-2 space-y-1 text-sm text-ink-500">
            {MARCAS.map((marca) => (
              <li key={marca}>{marca}</li>
            ))}
          </ul>
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
