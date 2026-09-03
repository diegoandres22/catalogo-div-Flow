import { Header } from "@/components/ui/Header";
import { Footer } from "@/components/ui/Footer";

export default function CargandoProducto() {
  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-4 h-4 w-32 skeleton rounded" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-10">
          <div className="skeleton aspect-square w-full rounded-2xl" />
          <div className="flex flex-col gap-4">
            <div className="h-3 w-20 skeleton rounded" />
            <div className="h-7 w-3/4 skeleton rounded" />
            <div className="h-4 w-1/2 skeleton rounded" />
            <div className="h-8 w-32 skeleton rounded" />
            <div className="h-16 w-full skeleton rounded-xl" />
            <div className="flex gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-10 w-11 skeleton rounded-lg" />
              ))}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
