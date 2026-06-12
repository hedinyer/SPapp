"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bike,
  ClipboardList,
  LogOut,
  Package,
  Users,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const links = [
  { href: "/inbox", label: "Bandeja", icon: ClipboardList },
  { href: "/visitadores", label: "Visitadores", icon: Users },
  { href: "/catalogo", label: "Catálogo", icon: Bike },
  { href: "/inventario", label: "Inventario", icon: Package },
  { href: "/solicitudes", label: "Solicitudes", icon: Wrench },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-neutral-200 bg-white">
      <div className="border-b border-neutral-200 px-5 py-6">
        <p className="text-xs font-medium uppercase tracking-widest text-neutral-500">
          SP Admin
        </p>
        <p className="mt-1 text-sm text-neutral-900">Panel interno</p>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-3">
        {links.map(({ href, label, icon: Icon }) => {
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
          variant="ghost"
          className="w-full justify-start gap-3 text-neutral-600 hover:text-black"
          onClick={logout}
        >
          <LogOut className="h-4 w-4" strokeWidth={1.75} />
          Salir
        </Button>
      </div>
    </aside>
  );
}
