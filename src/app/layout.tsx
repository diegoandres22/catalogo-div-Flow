import type { Metadata } from "next";
import "./globals.css";

// Fuente del sistema en vez de next/font/google: carga instantánea, cero
// requests externos y excelente legibilidad en todas las plataformas — clave
// para el caso de uso principal (link abierto desde WhatsApp en el celular).

export const metadata: Metadata = {
  title: {
    default: "Catálogo Mayorista",
    template: "%s · Catálogo Mayorista",
  },
  description: "Catálogo digital de venta al mayor.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-paper text-ink-900">{children}</body>
    </html>
  );
}
