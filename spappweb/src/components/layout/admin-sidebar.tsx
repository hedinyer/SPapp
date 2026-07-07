"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { LogOut, PanelLeft, PanelLeftClose } from "lucide-react";
import { logoutAdminAction } from "@/lib/actions/auth-actions";
import { adminNavLinks } from "@/components/layout/admin-nav-links";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "admin-sidebar-collapsed";

export function AdminSidebar({ className }: { className?: string }) {
  const pathname = usePathname();
  const [loggingOut, startLogout] = useTransition();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(localStorage.getItem(STORAGE_KEY) === "true");
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  }

  function handleLogout() {
    startLogout(async () => {
      await logoutAdminAction();
    });
  }

  return (
    <aside
      className={cn(
        "flex shrink-0 flex-col border-r border-neutral-200 bg-white transition-[width] duration-200 ease-in-out",
        collapsed ? "w-16" : "w-56",
        className,
      )}
    >
      <div
        className={cn(
          "flex border-b border-neutral-200",
          collapsed
            ? "flex-col items-center gap-2 px-2 py-4"
            : "items-start justify-between px-5 py-6",
        )}
      >
        {!collapsed ? (
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-widest text-neutral-500">
              SP Admin
            </p>
            <p className="mt-1 text-sm text-neutral-900">Panel interno</p>
          </div>
        ) : (
          <p className="text-xs font-semibold text-neutral-900">SP</p>
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-neutral-500 hover:text-black"
          onClick={toggleCollapsed}
          aria-label={collapsed ? "Expandir menú" : "Recoger menú"}
          aria-expanded={!collapsed}
        >
          {collapsed ? (
            <PanelLeft className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </Button>
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-3">
        {adminNavLinks.map(({ href, label, icon: Icon }) => {
          const active =
            pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={cn(
                "flex items-center rounded-lg py-2.5 text-sm transition-colors",
                collapsed ? "justify-center px-2" : "gap-3 px-3",
                active
                  ? "bg-neutral-100 font-medium text-black"
                  : "text-neutral-600 hover:bg-neutral-50 hover:text-black",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
              {!collapsed && <span className="truncate">{label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-neutral-200 p-3">
        <Button
          type="button"
          variant="ghost"
          className={cn(
            "w-full text-neutral-600 hover:text-black",
            collapsed ? "justify-center px-2" : "justify-start gap-3",
          )}
          disabled={loggingOut}
          title={collapsed ? "Salir" : undefined}
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4 shrink-0" strokeWidth={1.75} />
          {!collapsed && (loggingOut ? "Saliendo…" : "Salir")}
        </Button>
      </div>
    </aside>
  );
}
