import Link from "next/link";
import { Header } from "@/components/ui/Header";
import { EstadoVacio } from "@/components/catalogo/EstadoVacio";

export default function ProductoNoEncontrado() {
  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
        <EstadoVacio
          titulo="Producto no encontrado"
          descripcion="Puede que ya no esté disponible en el catálogo vigente."
          accion={
            <Link
              href="/"
              className="rounded-full bg-ink-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-ink-700"
            >
              Volver al catálogo
            </Link>
          }
        />
      </main>
    </>
  );
}
