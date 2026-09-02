import Link from "next/link";

export function Header() {
  return (
    <header className="sticky top-0 z-20 border-b border-ink-200 bg-paper/90 backdrop-blur supports-[backdrop-filter]:bg-paper/70">
      <div className="mx-auto flex max-w-6xl items-center px-4 py-3.5 sm:px-6">
        <Link href="/" className="text-base font-semibold tracking-tight text-ink-900">
          Catálogo Mayorista
        </Link>
      </div>
    </header>
  );
}
