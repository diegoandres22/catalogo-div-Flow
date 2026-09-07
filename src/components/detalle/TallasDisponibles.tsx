import type { TallaVariante } from "@/lib/types";

// Antes era un "selector" con botones clickeables — pero acá no hay nada que
// elegir: el pedido va por bulto completo (curva de tallas ya fija de
// fábrica, ver AgregarCarrito/CarritoContext), así que presionar una talla
// nunca cambiaba nada. Quedaba como una interacción falsa que solo confundía
// ("Elegí una talla" invitaba a una acción sin efecto real). Ahora es una
// lista puramente informativa: qué tallas trae la curva y cuáles ya no
// tienen stock.
export function TallasDisponibles({ tallas }: { tallas: TallaVariante[] }) {
  return (
    <div>
      <span className="mb-2 block text-sm font-medium text-ink-900">Tallas de la curva</span>
      <ul className="flex flex-wrap gap-2" aria-label="Tallas de la curva">
        {tallas.map((t) => {
          const agotada = t.disponible <= 0;
          return (
            <li
              key={t.talla}
              aria-label={agotada ? `Talla ${t.talla}, agotada` : `Talla ${t.talla}`}
              className={[
                "relative min-w-11 rounded-lg border px-3 py-2 text-center text-sm font-medium",
                agotada ? "border-ink-200 bg-ink-100 text-ink-400" : "border-ink-200 text-ink-900",
              ].join(" ")}
            >
              {t.talla}
              {agotada && (
                <span className="pointer-events-none absolute -right-1.5 -top-1.5 rounded-full border border-ink-200 bg-paper-raised px-1 text-[9px] font-semibold uppercase leading-tight tracking-wide text-ink-500">
                  agotada
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
