"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  FlowProgress,
  PrimaryAction,
  SecondaryAction,
  StepCard,
  StickyActions,
} from "@/components/hojadevida/flow-shell";
import { selectMotoFromContract } from "@/lib/actions/moto-compra-actions";
import {
  calcMotoPayment,
  FRECUENCIA_PERIOD,
  montoCuotaPeriodo,
} from "@/lib/moto-payment";
import type { BikeRow, FrecuenciaPago } from "@/lib/pipeline/types";
import { FRECUENCIA_LABELS } from "@/lib/pipeline/types";
import { formatCop } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

const STEPS = ["Catálogo", "Frecuencia", "Confirmar"];
const FRECUENCIAS: FrecuenciaPago[] = [
  "diario",
  "semanal",
  "quincenal",
  "mensual",
];

interface MotoSelectionFlowProps {
  contractId: string;
  bikes: BikeRow[];
}

export function MotoSelectionFlow({ contractId, bikes }: MotoSelectionFlowProps) {
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<BikeRow | null>(null);
  const [frecuencia, setFrecuencia] = useState<FrecuenciaPago>("semanal");
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  const payment =
    selected != null ? calcMotoPayment(selected, frecuencia) : null;

  function next() {
    if (step === 0 && !selected) {
      toast.error("Selecciona una moto para continuar.");
      return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function back() {
    setStep((s) => Math.max(s - 1, 0));
  }

  function submit() {
    if (!selected) return;
    startTransition(async () => {
      try {
        await selectMotoFromContract({
          contractId,
          bikeId: selected.id,
          frecuencia,
        });
        setDone(true);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "No se pudo confirmar.");
      }
    });
  }

  if (done && selected && payment) {
    return (
      <div className="flex flex-col items-center rounded-2xl border-2 border-green-500 bg-green-50 p-8 text-center">
        <CheckCircle2 className="h-16 w-16 text-green-600" strokeWidth={1.5} />
        <h2 className="mt-4 text-2xl font-bold text-black">¡Moto elegida!</h2>
        <p className="mt-3 text-base leading-relaxed text-neutral-700">
          {selected.modelo} · {selected.color}
        </p>
        <p className="mt-2 text-sm text-neutral-600">
          Frecuencia {FRECUENCIA_LABELS[frecuencia].toLowerCase()} · Total primer
          pago: {formatCop(payment.monto_total_primer_pago)}
        </p>
        <p className="mt-4 text-sm text-neutral-600">
          Tu asesor te indicará cómo realizar el pago.
        </p>
      </div>
    );
  }

  const grouped = bikes.reduce<Record<string, BikeRow[]>>((acc, bike) => {
    (acc[bike.modelo] ??= []).push(bike);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <FlowProgress step={step + 1} total={STEPS.length} title="Elige tu moto" />

      {step === 0 && (
        <StepCard
          title="Selecciona modelo y color"
          instruction="Solo se muestran motos con stock disponible."
        >
          {bikes.length === 0 ? (
            <p className="text-center text-sm text-neutral-500">
              No hay motos disponibles en este momento.
            </p>
          ) : (
            Object.entries(grouped).map(([modelo, variants]) => (
              <div key={modelo}>
                <p className="mb-2 text-sm font-semibold">{modelo}</p>
                <div className="flex flex-wrap gap-2">
                  {variants.map((bike) => (
                    <button
                      key={bike.id}
                      type="button"
                      onClick={() => setSelected(bike)}
                      className={cn(
                        "w-[calc(50%-0.25rem)] min-w-[140px] rounded-xl border p-2 text-left transition-colors",
                        selected?.id === bike.id
                          ? "border-black ring-2 ring-black/15"
                          : "border-neutral-200",
                      )}
                    >
                      <div className="relative mb-2 h-20 w-full overflow-hidden rounded-lg bg-neutral-100">
                        {bike.imagen_url ? (
                          <Image
                            src={bike.imagen_url}
                            alt={`${bike.modelo} ${bike.color}`}
                            fill
                            className="object-cover"
                            sizes="160px"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-xs text-neutral-400">
                            Sin foto
                          </div>
                        )}
                      </div>
                      <p className="text-sm font-semibold">{bike.color}</p>
                      <p className="text-xs text-neutral-500">
                        Stock: {bike.stock}
                      </p>
                      <p className="text-xs font-medium text-black">
                        Inicial {formatCop(bike.cuota_inicial)}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </StepCard>
      )}

      {step === 1 && selected && (
        <StepCard
          title="Frecuencia de pago"
          instruction={`${selected.modelo} · ${selected.color}`}
          help="Los pagos semanal, quincenal y mensual se cancelan por adelantado. Tu primer pago incluye la cuota inicial más el periodo adelantado que elijas."
        >
          {FRECUENCIAS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFrecuencia(f)}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left",
                frecuencia === f
                  ? "border-black bg-neutral-50"
                  : "border-neutral-200",
              )}
            >
              <span
                className={cn(
                  "h-4 w-4 shrink-0 rounded-full border-2",
                  frecuencia === f ? "border-black bg-black" : "border-neutral-300",
                )}
              />
              <div className="min-w-0 flex-1">
                <p className="font-medium">{FRECUENCIA_LABELS[f]}</p>
                <p className="text-sm text-neutral-500">{FRECUENCIA_PERIOD[f]}</p>
              </div>
              <p className="shrink-0 font-semibold">
                {formatCop(montoCuotaPeriodo(selected.cuota_diaria, f))}
              </p>
            </button>
          ))}
        </StepCard>
      )}

      {step === 2 && selected && payment && (
        <StepCard title="Resumen de tu selección">
          <SummaryRow label="Modelo" value={selected.modelo} />
          <SummaryRow label="Color" value={selected.color} />
          <SummaryRow label="Frecuencia" value={FRECUENCIA_LABELS[frecuencia]} />
          <SummaryRow
            label="Cuota inicial"
            value={formatCop(payment.cuota_inicial_monto)}
          />
          <SummaryRow
            label={`Cuota ${FRECUENCIA_LABELS[frecuencia].toLowerCase()} (adelantada)`}
            value={formatCop(payment.monto_cuota_periodo)}
          />
          <div className="rounded-xl bg-black px-4 py-4 text-white">
            <p className="text-sm opacity-85">Total a pagar ahora</p>
            <p className="text-2xl font-bold">
              {formatCop(payment.monto_total_primer_pago)}
            </p>
          </div>
        </StepCard>
      )}

      <StickyActions
        primary={
          step === STEPS.length - 1 ? (
            <PrimaryAction onClick={submit} disabled={pending}>
              {pending ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" /> Confirmando…
                </span>
              ) : (
                "Confirmar selección"
              )}
            </PrimaryAction>
          ) : (
            <PrimaryAction
              onClick={next}
              disabled={step === 0 && bikes.length === 0}
            >
              Continuar
            </PrimaryAction>
          )
        }
        secondary={
          step > 0 && !pending ? (
            <SecondaryAction onClick={back}>Atrás</SecondaryAction>
          ) : undefined
        }
      />
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span className="text-neutral-500">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
