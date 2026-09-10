import Link from "next/link";
import Image from "next/image";
import type { ConfigSitio } from "@/lib/types";
import { LOGOS_FOOTER } from "@/lib/logosFooter";

// Texto por defecto — se muestra mientras el admin no configure nada
// distinto desde /admin/configuracion (ConfigSitio en Vercel Blob), y
// también en las pantallas que no pueden leer esa config (ver "config" más
// abajo): error.tsx es un Client Component (no puede hacer fetch a Blob), y
// los loading.tsx/not-found.tsx son vistas de paso donde no vale la pena
// pagar esa lectura extra — solo lo hacen las páginas de contenido real.
const DESCRIPCION_DEFECTO =
  "Fábrica de calzado venezolana con más de 70 años de trayectoria, negocio familiar de tres generaciones. Capacidad instalada de 192.000 pares al mes.";
const RIF_DEFECTO = "J-30242134-9";

interface Props {
  config?: Pick<ConfigSitio, "descripcionEmpresa" | "rif"> | null;
}

export function Footer({ config }: Props = {}) {
  const descripcion = config?.descripcionEmpresa?.trim() || DESCRIPCION_DEFECTO;
  const rif = config?.rif?.trim() || RIF_DEFECTO;
  const anio = new Date().getFullYear();

  return (
    <footer className="mt-12 border-t border-ink-200 bg-paper-raised">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3 sm:px-6">
        <div>
          <h2 className="text-sm font-semibold text-ink-900">Calzados Mesvol</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-500">{descripcion}</p>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-ink-900">Nuestras marcas</h2>
          <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-3">
            {LOGOS_FOOTER.map((marca) => (
              <Image
                key={marca.nombre}
                src={marca.src}
                alt={marca.nombre}
                width={marca.ancho}
                height={marca.alto}
                // unoptimized: sin esto, el <img> real termina apuntando a
                // /_next/image?url=...&w=...&q=... (el optimizador de Next),
                // una URL dinámica que el service worker no tiene forma
                // confiable de precachear ni de reconocer como "la misma
                // imagen" offline. Con esto, el src es directo a
                // /marcas/*.png — una URL fija que sw.js sí puede guardar
                // (ver esAssetDeMarca) y DescargaOffline agrega al
                // manifiesto de cada descarga (ver manifiesto/route.ts).
                // Son 3 logos chicos en el footer, el costo de no optimizar
                // es insignificante.
                unoptimized
                className="h-7 w-auto object-contain"
              />
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-ink-900">Contacto</h2>
          <p className="mt-2 text-sm text-ink-500">Calzados Mesvol, C.A.</p>
          <p className="text-sm text-ink-500">RIF {rif}</p>
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
