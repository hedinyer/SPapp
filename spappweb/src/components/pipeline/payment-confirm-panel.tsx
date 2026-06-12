"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { confirmPayment } from "@/lib/actions/admin-actions";
import type { UserMotoCompraRow } from "@/lib/pipeline/types";
import { formatCop } from "@/lib/utils/format";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PaymentConfirmPanelProps {
  compra: UserMotoCompraRow | null;
  userId: number;
}

export function PaymentConfirmPanel({ compra, userId }: PaymentConfirmPanelProps) {
  const [pending, startTransition] = useTransition();

  if (!compra) {
    return (
      <Card className="border-neutral-200 shadow-none">
        <CardContent className="py-8 text-center text-sm text-neutral-500">
          Aún no hay selección de moto.
        </CardContent>
      </Card>
    );
  }

  if (compra.estado !== "pendiente_pago" && compra.estado !== "lista_retiro") {
    return (
      <Card className="border-neutral-200 shadow-none">
        <CardContent className="py-8 text-center text-sm text-neutral-600">
          Pagos confirmados. Estado: {compra.estado.replace("_", " ")}.
        </CardContent>
      </Card>
    );
  }

  function toggle(field: "inicial" | "cuota", value: boolean) {
    startTransition(async () => {
      try {
        await confirmPayment({
          compraId: compra!.id,
          userId,
          field,
          value,
        });
        if (
          value &&
          ((field === "inicial" && compra!.pago_cuota_confirmado) ||
            (field === "cuota" && compra!.pago_inicial_confirmado))
        ) {
          toast.success(
            "Ambos pagos confirmados. La moto pasó a lista para retiro.",
          );
        } else {
          toast.success("Pago actualizado.");
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Error al confirmar.");
      }
    });
  }

  return (
    <Card className="border-neutral-200 shadow-none">
      <CardHeader>
        <CardTitle className="text-lg">Confirmar pagos</CardTitle>
        <p className="text-sm text-neutral-500">
          Marca cada pago cuando lo recibas en cuenta.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
          <p className="text-sm text-neutral-500">Total esperado</p>
          <p className="text-2xl font-semibold">
            {formatCop(compra.monto_total_primer_pago)}
          </p>
          <p className="mt-2 text-sm text-neutral-600">
            Inicial {formatCop(compra.cuota_inicial_monto)} + adelantada{" "}
            {formatCop(compra.monto_cuota_periodo)}
          </p>
        </div>

        <div className="space-y-4">
          <PaymentSwitch
            id="pago-inicial"
            label="Cuota inicial recibida"
            amount={compra.cuota_inicial_monto}
            checked={compra.pago_inicial_confirmado}
            disabled={pending}
            onCheckedChange={(v) => toggle("inicial", v)}
          />
          <PaymentSwitch
            id="pago-cuota"
            label="Cuota adelantada recibida"
            amount={compra.monto_cuota_periodo}
            checked={compra.pago_cuota_confirmado}
            disabled={pending}
            onCheckedChange={(v) => toggle("cuota", v)}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function PaymentSwitch({
  id,
  label,
  amount,
  checked,
  disabled,
  onCheckedChange,
}: {
  id: string;
  label: string;
  amount: number;
  checked: boolean;
  disabled: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-neutral-200 p-4">
      <div>
        <Label htmlFor={id} className="text-base font-medium">
          {label}
        </Label>
        <p className="text-sm text-neutral-500">{formatCop(amount)}</p>
      </div>
      <Switch
        id={id}
        checked={checked}
        disabled={disabled}
        onCheckedChange={onCheckedChange}
      />
    </div>
  );
}
