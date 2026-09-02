import type { Producto } from "@/lib/types";
import { ProductCard } from "./ProductCard";

export function ProductGrid({ productos }: { productos: Producto[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
      {productos.map((producto, i) => (
        <ProductCard key={producto.id} producto={producto} prioridad={i < 4} />
      ))}
    </div>
  );
}
