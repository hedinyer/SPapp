import { AdminMobileNav } from "@/components/layout/admin-mobile-nav";
import { AdminSidebar } from "@/components/layout/admin-sidebar";

export const dynamic = "force-dynamic";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-white text-black lg:flex-row">
      <AdminSidebar className="hidden lg:flex" />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <AdminMobileNav />
        <main className="min-h-0 flex-1 overflow-auto max-lg:pt-[calc(3.5rem+env(safe-area-inset-top,0px))]">
          <div className="mx-auto max-w-6xl px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
