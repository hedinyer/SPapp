import { searchClients } from "@/lib/pipeline/queries";
import { ClientesSearchLive } from "@/components/clientes/clientes-search-live";

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";
  const results = query.length >= 2 ? await searchClients(query) : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold sm:text-2xl">Clientes</h1>
        <p className="mt-1 text-neutral-500">
          Busca por placa, cédula o nombre para ver datos, cuotas pagadas y el
          estado del proceso.
        </p>
      </div>

      <ClientesSearchLive initialQuery={query} initialResults={results} />
    </div>
  );
}
