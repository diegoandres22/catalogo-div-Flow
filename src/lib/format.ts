const formateadorPrecio = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
});

export function formatearPrecio(valor: number): string {
  return formateadorPrecio.format(valor);
}

export function tieneStock(tallas: { disponible: number }[]): boolean {
  return tallas.some((t) => t.disponible > 0);
}
