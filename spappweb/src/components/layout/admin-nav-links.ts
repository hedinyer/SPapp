import {
  Banknote,
  Bike,
  ClipboardList,
  CreditCard,
  LogOut,
  Package,
  ShoppingBag,
  ShoppingCart,
  Store,
  Warehouse,
  UserPlus,
  UserSearch,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";

export type AdminNavLink = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const adminNavLinks: AdminNavLink[] = [
  { href: "/inbox", label: "Bandeja", icon: ClipboardList },
  { href: "/clientes", label: "Clientes", icon: UserSearch },
  { href: "/crear-cliente", label: "Crear cliente", icon: UserPlus },
  { href: "/visitadores", label: "Visitadores", icon: Users },
  { href: "/catalogo", label: "Catálogo", icon: Bike },
  { href: "/productos-credito", label: "Prod. crédito", icon: CreditCard },
  { href: "/inventario", label: "Inventario", icon: Package },
  { href: "/caja", label: "Caja", icon: Store },
  { href: "/venta", label: "Venta", icon: ShoppingCart },
  { href: "/venta-contado", label: "Venta contado", icon: Banknote },
  { href: "/garaje", label: "Garaje", icon: Warehouse },
  { href: "/vendidas", label: "Vendidas", icon: ShoppingBag },
  { href: "/solicitudes", label: "Solicitudes", icon: Wrench },
];

export { LogOut as AdminLogoutIcon };
