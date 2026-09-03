import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import "./globals.css";

// Fuente del sistema en vez de next/font/google: carga instantánea, cero
// requests externos y excelente legibilidad en todas las plataformas — clave
// para el caso de uso principal (link abierto desde WhatsApp en el celular).

const DESCRIPCION = "Catálogo digital de venta al mayor — Volpe, Vita Kids y Kriza.";

export const metadata: Metadata = {
  metadataBase: new URL("https://catalogomesvol.vercel.app"),
  title: {
    default: "Catálogo Mayorista",
    template: "%s · Catálogo Mayorista",
  },
  description: DESCRIPCION,
  applicationName: "Catálogo Mayorista",
  appleWebApp: {
    title: "Cat. Mayorista",
    statusBarStyle: "default",
  },
  openGraph: {
    title: "Catálogo Mayorista",
    description: DESCRIPCION,
    siteName: "Catálogo Mayorista — Calzados Mesvol, C.A.",
    locale: "es_VE",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Catálogo Mayorista",
    description: DESCRIPCION,
  },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-paper text-ink-900">
        {children}
        <Toaster
          position="bottom-center"
          richColors
          closeButton
          toastOptions={{
            classNames: {
              toast: "rounded-xl border border-ink-200 shadow-lg",
              title: "text-sm font-medium",
            },
          }}
        />
      </body>
    </html>
  );
}
