import Link from "next/link";
import type { Metadata } from "next";
import {
  getVisitadorSession,
  hasVisitadorAccess,
} from "@/lib/auth/visitador-session";
import { VisitadorLogoutButton } from "@/components/visitador/visitador-logout-button";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Portal Visitador",
  description: "Visitas domiciliarias asignadas",
};

export default async function VisitadorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getVisitadorSession();
  const isLoggedIn = hasVisitadorAccess(session);

  return (
    <div className="min-h-screen bg-white text-black">
      {isLoggedIn && (
        <header className="safe-area-top border-b border-neutral-200">
          <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
            <Link
              href="/visitador/mis-visitas"
              className="min-h-11 content-center text-lg font-semibold"
            >
              Mis visitas
            </Link>
            <VisitadorLogoutButton />
          </div>
        </header>
      )}
      <main className="mx-auto max-w-lg px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        {children}
      </main>
    </div>
  );
}
