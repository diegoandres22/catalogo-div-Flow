import { Suspense } from "react";
import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import { CarritoProvider } from "@/components/carrito/CarritoContext";
import { CarritoDrawer } from "@/components/carrito/CarritoDrawer";
import { BusquedaProvider } from "@/components/catalogo/BusquedaContext";
import { ModoOffline } from "@/components/ui/ModoOffline";
import { leerConfigSitio } from "@/lib/blob";
import { sanearNumeroWhatsApp } from "@/lib/carrito";
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

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Número de WhatsApp de ventas configurado desde /admin/configuracion
  // (ConfigSitio en Vercel Blob) — se resuelve acá, una sola vez por
  // request, y se pasa a CarritoProvider. Si el admin no configuró ninguno
  // todavía, CarritoProvider cae solo al de la variable de entorno (ver
  // numeroWhatsAppVentas en lib/carrito.ts).
  const config = await leerConfigSitio();
  const numeroWhatsApp = sanearNumeroWhatsApp(config.whatsappVentas);

  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-paper text-ink-900">
        <ModoOffline />
        {/* Suspense: BusquedaProvider usa useSearchParams (para sembrar la
            búsqueda desde "?q="). El fetch de ConfigSitio de arriba ya hace
            dinámica toda la app (Vercel Blob no se puede cachear estático),
            así que este boundary ya no evita un prerender estático global —
            se mantiene igual porque sigue haciendo falta para que
            useSearchParams no rompa el build. */}
        <Suspense fallback={null}>
          <BusquedaProvider>
            <CarritoProvider numeroWhatsApp={numeroWhatsApp}>
              {children}
              <CarritoDrawer />
            </CarritoProvider>
          </BusquedaProvider>
        </Suspense>
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
