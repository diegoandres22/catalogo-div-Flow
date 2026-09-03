"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Header } from "@/components/ui/Header";
import { Footer } from "@/components/ui/Footer";

export default function ErrorGlobal({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <>
      <Header />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center px-4 py-16 text-center sm:px-6">
        <h1 className="text-lg font-semibold text-ink-900">Algo salió mal</h1>
        <p className="mt-2 max-w-sm text-sm text-ink-500">
          Hubo un error inesperado al cargar esta página. Podés intentar de nuevo o volver al catálogo.
        </p>
        <div className="mt-5 flex gap-2.5">
          <button
            type="button"
            onClick={reset}
            className="rounded-full bg-ink-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-ink-700"
          >
            Intentar de nuevo
          </button>
          <Link
            href="/"
            className="rounded-full border border-ink-200 px-4 py-2.5 text-sm font-medium text-ink-900 transition-colors hover:border-ink-900"
          >
            Volver al catálogo
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
