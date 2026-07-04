"use client";

import { useTransition } from "react";
import { FileText } from "lucide-react";
import { toast } from "sonner";
import { printFakeFacturaDemo } from "@/lib/printing/credito-factura-receipt";
import { cn } from "@/lib/utils";

export function AdminFakeFacturaButton({
  collapsed = false,
  className,
  onDone,
}: {
  collapsed?: boolean;
  className?: string;
  onDone?: () => void;
}) {
  const [pending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      try {
        await printFakeFacturaDemo();
        onDone?.();
      } catch {
        toast.error("No se pudo abrir la factura de prueba.");
      }
    });
  }

  return (
    <button
      type="button"
      disabled={pending}
      title={collapsed ? "Fake factura" : undefined}
      onClick={handleClick}
      className={cn(
        "flex items-center rounded-lg py-2.5 text-sm text-neutral-600 transition-colors hover:bg-neutral-50 hover:text-black disabled:opacity-50",
        collapsed ? "justify-center px-2" : "gap-3 px-3",
        className,
      )}
    >
      <FileText className="h-4 w-4 shrink-0" strokeWidth={1.75} />
      {!collapsed && (
        <span className="truncate">{pending ? "Generando…" : "Fake factura"}</span>
      )}
    </button>
  );
}
