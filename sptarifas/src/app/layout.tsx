import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Registrar pago de tarifa",
  description: "OCR de comprobante Nequi y registro de pago de tarifa por placa",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
