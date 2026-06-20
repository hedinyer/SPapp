import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SP Admin",
  description: "Panel administrativo SP",
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
    <html
      lang="es"
      className={`${inter.variable} h-full antialiased`}
    >
      <head>
        {/* Evita que extensiones crypto rotas (sin window.ethereum) tumben la app */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{window.ethereum=window.ethereum||{selectedAddress:void 0,isMetaMask:!1}}catch(e){}",
          }}
        />
      </head>
      <body className="min-h-full bg-white font-sans text-black">
        {children}
        <Toaster
          position="bottom-center"
          richColors={false}
          toastOptions={{
            classNames: {
              toast: "mb-[max(0.5rem,env(safe-area-inset-bottom))]",
            },
          }}
        />
      </body>
    </html>
  );
}
