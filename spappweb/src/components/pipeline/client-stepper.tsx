import { Check, Circle, Lock, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PipelineStep } from "@/lib/pipeline/types";

interface ClientStepperProps {
  steps: PipelineStep[];
}

export function ClientStepper({ steps }: ClientStepperProps) {
  return (
    <>
      {/* Mobile: horizontal scroll with snap */}
      <ol className="flex gap-3 overflow-x-auto pb-2 lg:hidden snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {steps.map((step) => (
          <li
            key={step.id}
            className="flex min-w-[5.5rem] shrink-0 snap-start flex-col items-center gap-1.5 text-center"
          >
            <StepIcon step={step} compact />
            <p
              className={cn(
                "line-clamp-2 text-xs font-medium leading-tight",
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
              <p className="text-[10px] font-medium text-black">Tu turno</p>
            )}
          </li>
        ))}
      </ol>

      {/* Desktop: horizontal stepper */}
      <ol className="hidden gap-0 lg:flex lg:flex-row lg:items-start">
        {steps.map((step, index) => (
          <li
            key={step.id}
            className="flex flex-1 flex-col items-center text-center"
          >
            <div className="flex flex-col items-center">
              <StepIcon step={step} />
              {index < steps.length - 1 && (
                <div className="h-8 w-px bg-neutral-200" />
              )}
            </div>
            <div className="mt-2 min-w-0">
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
    </>
  );
}

function StepIcon({
  step,
  compact = false,
}: {
  step: PipelineStep;
  compact?: boolean;
}) {
  const size = compact ? "h-8 w-8" : "h-9 w-9";
  const base = cn(
    "flex items-center justify-center rounded-full border-2",
    size,
  );

  if (step.state === "completado") {
    return (
      <div className={cn(base, "border-black bg-black text-white")}>
        <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4" strokeWidth={2} />
      </div>
    );
  }
  if (step.state === "error") {
    return (
      <div className={cn(base, "border-red-500 bg-red-50 text-red-600")}>
        <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" strokeWidth={2} />
      </div>
    );
  }
  if (step.state === "actual") {
    return (
      <div className={cn(base, "border-black bg-white text-black")}>
        <Circle className="h-2.5 w-2.5 fill-black sm:h-3 sm:w-3" />
      </div>
    );
  }
  if (step.state === "bloqueado") {
    return (
      <div className={cn(base, "border-neutral-200 bg-neutral-50 text-neutral-400")}>
        <Lock className="h-3 w-3 sm:h-3.5 sm:w-3.5" strokeWidth={1.75} />
      </div>
    );
  }
  return (
    <div className={cn(base, "border-neutral-300 bg-white text-neutral-400")}>
      <Circle className="h-2.5 w-2.5 sm:h-3 sm:w-3" strokeWidth={1.5} />
    </div>
  );
}
