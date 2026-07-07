"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { LogOut, Menu, X } from "lucide-react";
import { logoutAdminAction } from "@/lib/actions/auth-actions";
import { adminNavLinks } from "@/components/layout/admin-nav-links";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const headerBtnClass =
  "inline-flex min-h-11 min-w-11 shrink-0 cursor-pointer touch-manipulation items-center justify-center rounded-lg text-neutral-900 transition-colors hover:bg-neutral-100 active:bg-neutral-100";

const MENU_TOGGLE_ID = "admin-mobile-menu-toggle";

export function AdminMobileNav() {
  const pathname = usePathname();
  const menuRef = useRef<HTMLInputElement>(null);

  function closeMenu() {
    if (menuRef.current) menuRef.current.checked = false;
  }

  useEffect(() => {
    closeMenu();
  }, [pathname]);

  useEffect(() => {
    const checkbox = menuRef.current;
    if (!checkbox) return;

    function syncScrollLock() {
      if (!checkbox) return;
      const locked = checkbox.checked;
      document.body.style.overflow = locked ? "hidden" : "";
      document.documentElement.style.overflow = locked ? "hidden" : "";
    }

    syncScrollLock();
    checkbox.addEventListener("change", syncScrollLock);
    return () => {
      checkbox.removeEventListener("change", syncScrollLock);
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    };
  }, []);

  return (
    <>
      <input
        ref={menuRef}
        id={MENU_TOGGLE_ID}
        type="checkbox"
        className="peer sr-only"
        aria-hidden="true"
      />

      <header className="fixed inset-x-0 top-0 z-[100] shrink-0 border-b border-neutral-200 bg-white lg:hidden safe-area-top">
        <div className="relative flex h-14 items-center justify-between px-4">
          <label
            htmlFor={MENU_TOGGLE_ID}
            className={headerBtnClass}
            aria-label="Abrir menú"
          >
            <Menu className="pointer-events-none h-5 w-5" />
          </label>

          <p className="pointer-events-none text-sm font-semibold">SP Admin</p>

          <form action={logoutAdminAction}>
            <button
              type="submit"
              className={cn(headerBtnClass, "text-neutral-600")}
              aria-label="Cerrar sesión"
            >
              <LogOut className="pointer-events-none h-5 w-5" />
            </button>
          </form>
        </div>
      </header>

      <div
        className="fixed inset-0 z-[110] hidden peer-checked:block lg:hidden"
        role="dialog"
        aria-modal="true"
        aria-label="Menú de navegación"
      >
        <label
          htmlFor={MENU_TOGGLE_ID}
          className="absolute inset-0 cursor-pointer touch-manipulation bg-black/20"
          aria-label="Cerrar menú"
        />
        <aside className="pointer-events-auto absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-white shadow-xl safe-area-top">
          <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-widest text-neutral-500">
                SP Admin
              </p>
              <p className="text-sm text-neutral-900">Panel interno</p>
            </div>
            <label
              htmlFor={MENU_TOGGLE_ID}
              className={headerBtnClass}
              aria-label="Cerrar menú"
            >
              <X className="pointer-events-none h-5 w-5" />
            </label>
          </div>
          <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
            {adminNavLinks.map(({ href, label, icon: Icon }) => {
              const active =
                pathname === href || pathname.startsWith(`${href}/`);
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={closeMenu}
                  className={cn(
                    "flex min-h-11 touch-manipulation items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
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
          <div className="border-t border-neutral-200 p-3 safe-area-bottom">
            <form action={logoutAdminAction}>
              <Button
                type="submit"
                variant="ghost"
                className="min-h-11 w-full touch-manipulation justify-start gap-3 text-neutral-600 hover:text-black"
              >
                <LogOut className="h-4 w-4" strokeWidth={1.75} />
                Salir
              </Button>
            </form>
          </div>
        </aside>
      </div>
    </>
  );
}
