import {
  Banknote,
  Bike,
  ClipboardList,
  CreditCard,
  History,
  LogOut,
  Package,
  ShoppingBag,
  ShoppingCart,
  Store,
  Warehouse,
  UserSearch,
  Users,
  type LucideIcon,
} from "lucide-react";

export type AdminNavLink = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export type AdminNavGroup = {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  /** Sub-rutas del hub; vacío = link simple (Hoy, Clientes) */
  children: AdminNavLink[];
};

export const adminNavGroups: AdminNavGroup[] = [
  {
    id: "hoy",
    label: "Hoy",
    href: "/inbox",
    icon: ClipboardList,
    children: [],
  },
  {
    id: "clientes",
    label: "Clientes",
    href: "/clientes",
    icon: UserSearch,
    children: [],
  },
  {
    id: "motos",
    label: "Motos",
    href: "/garaje",
    icon: Warehouse,
    children: [
      { href: "/garaje", label: "Garaje", icon: Warehouse },
      { href: "/vendidas", label: "En calle", icon: ShoppingBag },
      { href: "/catalogo", label: "Modelos", icon: Bike },
      { href: "/venta-contado", label: "Contado", icon: Banknote },
    ],
  },
  {
    id: "tienda",
    label: "Tienda",
    href: "/venta",
    icon: ShoppingCart,
    children: [
      { href: "/venta", label: "Repuestos y accesorios", icon: ShoppingCart },
      { href: "/caja", label: "Caja", icon: Store },
      { href: "/inventario", label: "Stock", icon: Package },
      { href: "/productos-credito", label: "Extras a crédito", icon: CreditCard },
      { href: "/historial-ventas", label: "Historial", icon: History },
    ],
  },
  {
    id: "equipo",
    label: "Equipo",
    href: "/visitadores",
    icon: Users,
    children: [],
  },
];

export function pathMatchesHref(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function findNavGroupByPathname(
  pathname: string,
): AdminNavGroup | undefined {
  return adminNavGroups.find((group) => {
    if (group.children.length === 0) {
      return pathMatchesHref(pathname, group.href);
    }
    return group.children.some((child) => pathMatchesHref(pathname, child.href));
  });
}

export function isGroupActive(pathname: string, group: AdminNavGroup): boolean {
  if (group.children.length === 0) {
    return pathMatchesHref(pathname, group.href);
  }
  return group.children.some((child) => pathMatchesHref(pathname, child.href));
}

export function isChildActive(pathname: string, href: string): boolean {
  return pathMatchesHref(pathname, href);
}

export { LogOut as AdminLogoutIcon };
