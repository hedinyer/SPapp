import { MotoForm } from "@/components/moto-form";

export default async function NuevaMotoPage({
  searchParams,
}: {
  searchParams: Promise<{ placa?: string }>;
}) {
  const { placa } = await searchParams;
  return <MotoForm initialPlaca={placa} />;
}
