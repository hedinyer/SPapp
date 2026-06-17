"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTransition } from "react";
import { LogOut } from "lucide-react";
import { logoutAdminAction } from "@/lib/actions/auth-actions";
import { adminNavLinks } from "@/components/layout/admin-nav-links";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function AdminSidebar({ className }: { className?: string }) {
  const pathname = usePathname();
  const [loggingOut, startLogout] = useTransition();

  function handleLogout() {
    startLogout(async () => {
      await logoutAdminAction();
    });
  }

  return (
    <aside
      className={cn(
        "flex w-56 shrink-0 flex-col border-r border-neutral-200 bg-white",
        className,
      )}
    >
      <div className="border-b border-neutral-200 px-5 py-6">
        <p className="text-xs font-medium uppercase tracking-widest text-neutral-500">
          SP Admin
        </p>
        <p className="mt-1 text-sm text-neutral-900">Panel interno</p>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-3">
        {adminNavLinks.map(({ href, label, icon: Icon }) => {
          const active =
            pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                active
                  ? "bg-neutral-100 font-medium text-black"
                  : "text-neutral-600 hover:bg-neutral-50 hover:text-black",
              )}
            >
              <Icon className="h-4 w-4" strokeWidth={1.75} />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-neutral-200 p-3">
        <Button
          type="button"
          variant="ghost"
          className="w-full justify-start gap-3 text-neutral-600 hover:text-black"
          disabled={loggingOut}
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" strokeWidth={1.75} />
          {loggingOut ? "Saliendo…" : "Salir"}
        </Button>
      </div>
    </aside>
  );
}
