import { Header } from "@/components/ui/Header";
import { SkeletonGrid } from "@/components/catalogo/SkeletonGrid";

export default function CargandoCatalogo() {
  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-5 h-11 w-full max-w-md rounded-full skeleton" />
        <SkeletonGrid />
      </main>
    </>
  );
}
