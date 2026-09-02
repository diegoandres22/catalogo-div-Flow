export function SkeletonGrid({ cantidad = 12 }: { cantidad?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
      {Array.from({ length: cantidad }).map((_, i) => (
        <div key={i} className="flex flex-col overflow-hidden rounded-2xl border border-ink-200 bg-paper-raised">
          <div className="skeleton aspect-[3/4] w-full" />
          <div className="flex flex-col gap-2 p-3 sm:p-4">
            <div className="skeleton h-3 w-1/3 rounded" />
            <div className="skeleton h-4 w-4/5 rounded" />
            <div className="skeleton h-4 w-1/2 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
