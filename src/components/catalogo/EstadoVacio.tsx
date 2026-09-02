interface Props {
  titulo: string;
  descripcion: string;
  accion?: React.ReactNode;
}

export function EstadoVacio({ titulo, descripcion, accion }: Props) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-ink-300 px-6 py-16 text-center">
      <svg
        width="40"
        height="40"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="text-ink-300"
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
      </svg>
      <h2 className="text-base font-medium text-ink-900">{titulo}</h2>
      <p className="max-w-sm text-sm text-ink-500">{descripcion}</p>
      {accion}
    </div>
  );
}
