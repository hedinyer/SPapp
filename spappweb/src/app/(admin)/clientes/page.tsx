import { searchClients, listClientesMotoCredito } from "@/lib/pipeline/queries";
import { ClientesSearchLive } from "@/components/clientes/clientes-search-live";

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";
  const [results, creditClients] = await Promise.all([
    query.length >= 2 ? searchClients(query) : Promise.resolve([]),
    listClientesMotoCredito(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold sm:text-2xl">Clientes</h1>
        <p className="mt-1 text-neutral-500">
          Clientes con moto a crédito, ordenados por días de atraso (mayor a
          menor). Busca por placa, cédula o nombre para filtrar.
        </p>
      </div>

      <ClientesSearchLive
        initialQuery={query}
        initialResults={results}
        creditClients={creditClients}
      />
    </div>
  );
}
