import type { Metadata } from "next";
import { PublicApplicationFlow } from "@/components/hojadevida/public-application-flow";

export const metadata: Metadata = {
  title: "Hoja de vida",
  description: "Solicitud de crédito — documentos e hoja de vida",
};

export default function HojaDeVidaPage() {
  return <PublicApplicationFlow />;
}
