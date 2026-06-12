import { Check, Circle, Lock, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PipelineStep } from "@/lib/pipeline/types";

interface ClientStepperProps {
  steps: PipelineStep[];
}

export function ClientStepper({ steps }: ClientStepperProps) {
  return (
    <ol className="flex flex-col gap-3 md:flex-row md:items-start md:gap-0">
      {steps.map((step, index) => (
        <li
          key={step.id}
          className="flex flex-1 items-start gap-3 md:flex-col md:items-center md:text-center"
        >
          <div className="flex items-center gap-3 md:flex-col">
            <StepIcon step={step} />
            {index < steps.length - 1 && (
              <div className="hidden h-px flex-1 bg-neutral-200 md:block md:h-8 md:w-px md:flex-none" />
            )}
          </div>
          <div className="min-w-0 flex-1 md:mt-2">
            <p
              className={cn(
                "text-sm font-medium",
                step.state === "actual" && "text-black",
                step.state === "completado" && "text-neutral-700",
                step.state === "bloqueado" && "text-neutral-400",
                step.state === "pendiente" && "text-neutral-600",
                step.state === "error" && "text-red-600",
              )}
            >
              {step.label}
            </p>
            {step.adminActionRequired && (
              <p className="mt-0.5 text-xs font-medium text-black">
                Tu turno
              </p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

function StepIcon({ step }: { step: PipelineStep }) {
  const base =
    "flex h-9 w-9 items-center justify-center rounded-full border-2";

  if (step.state === "completado") {
    return (
      <div className={cn(base, "border-black bg-black text-white")}>
        <Check className="h-4 w-4" strokeWidth={2} />
      </div>
    );
  }
  if (step.state === "error") {
    return (
      <div className={cn(base, "border-red-500 bg-red-50 text-red-600")}>
        <X className="h-4 w-4" strokeWidth={2} />
      </div>
    );
  }
  if (step.state === "actual") {
    return (
      <div className={cn(base, "border-black bg-white text-black")}>
        <Circle className="h-3 w-3 fill-black" />
      </div>
    );
  }
  if (step.state === "bloqueado") {
    return (
      <div className={cn(base, "border-neutral-200 bg-neutral-50 text-neutral-400")}>
        <Lock className="h-3.5 w-3.5" strokeWidth={1.75} />
      </div>
    );
  }
  return (
    <div className={cn(base, "border-neutral-300 bg-white text-neutral-400")}>
      <Circle className="h-3 w-3" strokeWidth={1.5} />
    </div>
  );
}
