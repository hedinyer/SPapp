/**
 * Shell de ruta para soft-nav: Next prefetchea este boundary y lo muestra al
 * instante, sin esperar el RSC de la página (que suele ir a Supabase).
 * Sin animación a propósito: el panel admin es estático.
 */
export default function AdminLoading() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Cargando">
      <div className="h-8 w-48 rounded-md bg-muted" />
      <div className="h-4 w-72 max-w-full rounded-md bg-muted" />
      <div className="mt-2 h-40 w-full rounded-md bg-muted" />
      <div className="h-40 w-full rounded-md bg-muted" />
    </div>
  );
}
