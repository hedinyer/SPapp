import { redirect } from "next/navigation";
import { AdminMobileNav } from "@/components/layout/admin-mobile-nav";
import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { getSession, hasAdminAccess } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // ponytail: auth en layout, no en proxy.ts — Next 16.2 404s valid routes when src/middleware.ts is present
  const session = await getSession();
  if (!hasAdminAccess(session)) redirect("/login");

  return (
    <div className="flex h-dvh max-h-dvh flex-col overflow-hidden bg-background text-foreground lg:h-screen lg:max-h-screen lg:flex-row">
      <AdminSidebar className="hidden lg:flex" />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <AdminMobileNav />
        <main className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain bg-muted/30 [-webkit-overflow-scrolling:touch] max-lg:pt-[calc(3.5rem+env(safe-area-inset-top,0px))]">
          <div className="mx-auto max-w-[1313px] px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
