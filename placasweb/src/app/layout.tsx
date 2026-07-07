import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Placas — Inventario de motos",
  description: "Inventario móvil de motos con foto, placa o serie",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${inter.variable} min-h-full antialiased`}>
      <body className="min-h-full bg-white font-sans text-black">
        <div className="min-h-screen bg-white text-black">
          <header className="safe-area-top border-b border-neutral-200">
            <div className="mx-auto max-w-lg px-4 py-3">
              <p className="text-lg font-semibold">Placas</p>
            </div>
          </header>
          <main className="mx-auto max-w-lg px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            {children}
          </main>
        </div>
        <Toaster />
      </body>
    </html>
  );
}
