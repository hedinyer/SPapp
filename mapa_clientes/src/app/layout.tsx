import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Mapa Clientes — Segmentación",
  description: "Heatmap y segmentación publicitaria de clientes",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${inter.variable} min-h-full antialiased`}>
      <body className="min-h-full bg-background font-sans text-foreground">
        <header className="border-b border-border bg-card/80 backdrop-blur-sm">
          <div className="mx-auto flex max-w-[1600px] items-center justify-between px-4 py-3">
            <div>
              <p className="text-lg font-semibold tracking-tight">
                Mapa Clientes
              </p>
              <p className="text-xs text-muted-foreground">
                Heatmap · lazo · segmentación DANE
              </p>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-[1600px] p-4">{children}</main>
        <Toaster />
      </body>
    </html>
  );
}
