"use client";

import { Check, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const PHASES = [
  { id: "fotos", label: "Fotos" },
  { id: "datos", label: "Tus datos" },
  { id: "listo", label: "Listo" },
] as const;

export type FlowPhase = (typeof PHASES)[number]["id"];

export function FlowPhaseBar({ active }: { active: FlowPhase }) {
  const activeIdx = PHASES.findIndex((p) => p.id === active);

  return (
    <nav aria-label="Progreso del trámite" className="mb-6">
      <ol className="flex items-center justify-between gap-1">
        {PHASES.map((phase, i) => {
          const done = i < activeIdx;
          const current = i === activeIdx;
          return (
            <li key={phase.id} className="flex flex-1 flex-col items-center gap-1">
              <div
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold",
                  done && "bg-black text-white",
                  current && "bg-black text-white ring-4 ring-black/15",
                  !done && !current && "bg-neutral-100 text-neutral-400",
                )}
                aria-current={current ? "step" : undefined}
              >
                {done ? <Check className="h-5 w-5" strokeWidth={2.5} /> : i + 1}
              </div>
              <span
                className={cn(
                  "text-center text-xs font-medium",
                  current ? "text-black" : "text-neutral-500",
                )}
              >
                {phase.label}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function FlowProgress({
  step,
  total,
  title,
}: {
  step: number;
  total: number;
  title: string;
}) {
  const pct = Math.round((step / total) * 100);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold text-black">
          Paso {step} de {total}
        </span>
        <span className="text-neutral-500">{pct}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-neutral-100">
        <div
          className="h-full rounded-full bg-black transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-base font-medium text-neutral-800">{title}</p>
    </div>
  );
}

export function StepCard({
  title,
  instruction,
  help,
  children,
}: {
  title: string;
  instruction?: string;
  help?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border-2 border-neutral-200 bg-white p-5 shadow-sm">
      <h2 className="text-xl font-bold leading-snug text-black">{title}</h2>
      {instruction && (
        <p className="mt-2 text-base leading-relaxed text-neutral-700">
          {instruction}
        </p>
      )}
      {help && (
        <div className="mt-4 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm leading-relaxed text-neutral-700">
          {help}
        </div>
      )}
      <div className="mt-5 space-y-4">{children}</div>
    </div>
  );
}

export function FieldBlock({
  label,
  hint,
  example,
  children,
}: {
  label: string;
  hint?: string;
  example?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label className="block text-base font-semibold text-black">{label}</label>
      {hint && (
        <p className="text-sm leading-relaxed text-neutral-600">{hint}</p>
      )}
      {example && (
        <p className="text-sm text-neutral-500">
          Ejemplo: <span className="font-medium text-neutral-700">{example}</span>
        </p>
      )}
      {children}
    </div>
  );
}

export function StickyActions({
  primary,
  secondary,
}: {
  primary: React.ReactNode;
  secondary?: React.ReactNode;
}) {
  return (
    <div className="sticky bottom-0 -mx-4 mt-6 space-y-3 border-t border-neutral-200 bg-white px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      {primary}
      {secondary}
    </div>
  );
}

export function PrimaryAction({
  children,
  disabled,
  onClick,
  type = "button",
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  type?: "button" | "submit";
}) {
  return (
    <Button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className="min-h-14 w-full touch-manipulation text-base font-semibold bg-black text-white hover:bg-neutral-800 active:bg-neutral-900 disabled:opacity-50"
    >
      {children}
    </Button>
  );
}

export function SecondaryAction({
  children,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      disabled={disabled}
      onClick={onClick}
      className="min-h-12 w-full touch-manipulation text-base font-medium"
    >
      <ChevronLeft className="mr-1 h-5 w-5" />
      {children}
    </Button>
  );
}

export function ChoiceButton({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "min-h-14 w-full touch-manipulation rounded-xl border-2 px-4 text-base font-semibold transition-colors",
        selected
          ? "border-black bg-black text-white"
          : "border-neutral-200 bg-white text-black active:bg-neutral-50",
      )}
    >
      {children}
    </button>
  );
}

export const fieldInputClass =
  "min-h-12 text-base touch-manipulation";
