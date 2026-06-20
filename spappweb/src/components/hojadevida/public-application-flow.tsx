"use client";

import { useEffect, useId, useMemo, useState, useTransition } from "react";
import {
  CheckCircle2,
  Camera,
  ClipboardList,
  Loader2,
  MessageCircle,
} from "lucide-react";
import { toast } from "sonner";
import { submitPublicApplication } from "@/lib/actions/client-actions";
import type { HojaVidaFormData } from "@/lib/contracts/hoja-vida-schema";
import { uploadDocumentPhotoFromBrowser } from "@/lib/utils/upload-document-client";
import {
  IdentityUploadFlow,
  type IdentityPhotoFiles,
} from "@/components/hojadevida/identity-upload-flow";
import { HojaVidaForm } from "@/components/hojadevida/hoja-vida-form";
import {
  FlowPhaseBar,
  PrimaryAction,
  StepCard,
  type FlowPhase,
} from "@/components/hojadevida/flow-shell";

type Step = "welcome" | "photos" | "hoja" | "sending" | "success";

export function PublicApplicationFlow() {
  const reactId = useId();
  const uploadFolder = useMemo(
    () => `pending/${reactId.replace(/:/g, "")}`,
    [reactId],
  );
  const [step, setStep] = useState<Step>("welcome");
  const [photos, setPhotos] = useState<IdentityPhotoFiles | null>(null);
  const [pending, startTransition] = useTransition();

  const phase: FlowPhase =
    step === "welcome" || step === "photos"
      ? "fotos"
      : step === "hoja" || step === "sending"
        ? "datos"
        : "listo";

  useEffect(() => {
    if (step !== "success") return;

    const url = window.location.href;
    window.history.replaceState({ hojadevida: "welcome" }, "", url);
    window.history.pushState({ hojadevida: "success" }, "", url);

    function onPopState(event: PopStateEvent) {
      const marker = (event.state as { hojadevida?: string } | null)?.hojadevida;
      if (marker === "success") {
        setStep("success");
        return;
      }
      setStep("welcome");
      setPhotos(null);
    }

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [step]);

  function resetToWelcome() {
    setStep("welcome");
    setPhotos(null);
    window.history.replaceState(
      { hojadevida: "welcome" },
      "",
      window.location.href,
    );
  }

  function onHojaComplete(form: HojaVidaFormData) {
    if (!photos) return;

    setStep("sending");
    startTransition(async () => {
      try {
        const [front, back, selfie] = await Promise.all([
          uploadDocumentPhotoFromBrowser(
            uploadFolder,
            "document_front",
            photos.document_front,
          ),
          uploadDocumentPhotoFromBrowser(
            uploadFolder,
            "document_back",
            photos.document_back,
          ),
          uploadDocumentPhotoFromBrowser(
            uploadFolder,
            "selfie",
            photos.selfie,
          ),
        ]);

        await submitPublicApplication({
          documentFrontUrl: front,
          documentBackUrl: back,
          selfieUrl: selfie,
          hojaVida: form,
        });

        setStep("success");
      } catch (e) {
        setStep("hoja");
        toast.error(e instanceof Error ? e.message : "No se pudo enviar.");
      }
    });
  }

  if (step !== "welcome") {
    return (
      <div>
        {step !== "success" && <FlowPhaseBar active={phase} />}
        {step === "sending" && (
          <StepCard
            title="Enviando tu solicitud"
            instruction="No cierres esta página. Espera un momento."
          >
            <div className="flex flex-col items-center gap-4 py-8">
              <Loader2 className="h-12 w-12 animate-spin text-black" />
              <p className="text-center text-base text-neutral-600">
                Subiendo fotos y guardando tus datos…
              </p>
            </div>
          </StepCard>
        )}

        {step === "success" && (
          <div className="space-y-6">
            <div className="flex flex-col items-center rounded-2xl border-2 border-green-500 bg-green-50 p-8 text-center">
              <CheckCircle2 className="h-16 w-16 text-green-600" strokeWidth={1.5} />
              <h2 className="mt-4 text-2xl font-bold text-black">
                ¡Solicitud enviada con éxito!
              </h2>
              <p className="mt-3 text-base leading-relaxed text-neutral-700">
                Recibimos tus fotos y datos. Todo quedó registrado correctamente.
              </p>
              <div className="mt-5 flex w-full items-start gap-3 rounded-xl bg-white px-4 py-4 text-left">
                <MessageCircle className="mt-0.5 h-8 w-8 shrink-0 text-green-600" />
                <div>
                  <p className="text-base font-semibold text-black">
                    Te escribiremos por WhatsApp
                  </p>
                  <p className="mt-1 text-base leading-relaxed text-neutral-700">
                    En aproximadamente{" "}
                    <span className="font-semibold text-black">2 horas</span>{" "}
                    recibirás la respuesta a tu solicitud de crédito al número
                    que indicaste.
                  </p>
                </div>
              </div>
            </div>
            <p className="text-center text-sm text-neutral-500">
              Ya puedes cerrar esta página.
            </p>
            <PrimaryAction onClick={resetToWelcome}>
              Volver al inicio
            </PrimaryAction>
          </div>
        )}

        {step === "hoja" && (
          <HojaVidaForm
            onComplete={onHojaComplete}
            onBack={() => setStep("photos")}
            pending={pending}
            submitLabel="Enviar mi solicitud ✓"
          />
        )}

        {step === "photos" && (
          <IdentityUploadFlow
            onComplete={(files) => {
              setPhotos(files);
              setStep("hoja");
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <StepCard
        title="Solicitud de crédito para moto"
        instruction="Te guiamos paso a paso. Solo necesitas tu celular y tu cédula."
      >
        <ol className="space-y-4">
          <li className="flex gap-4 rounded-xl border-2 border-neutral-200 p-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-black text-lg font-bold text-white">
              1
            </div>
            <div>
              <p className="text-base font-bold text-black">Tomar 3 fotos</p>
              <p className="mt-1 text-sm text-neutral-600">
                Frente y reverso de la cédula, y una selfie.
              </p>
            </div>
            <Camera className="ml-auto h-8 w-8 shrink-0 text-neutral-400" />
          </li>
          <li className="flex gap-4 rounded-xl border-2 border-neutral-200 p-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-black text-lg font-bold text-white">
              2
            </div>
            <div>
              <p className="text-base font-bold text-black">Llenar tus datos</p>
              <p className="mt-1 text-sm text-neutral-600">
                Una pregunta a la vez, fácil de entender.
              </p>
            </div>
            <ClipboardList className="ml-auto h-8 w-8 shrink-0 text-neutral-400" />
          </li>
          <li className="flex gap-4 rounded-xl border-2 border-neutral-200 p-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-black text-lg font-bold text-white">
              3
            </div>
            <div>
              <p className="text-base font-bold text-black">Enviar solicitud</p>
              <p className="mt-1 text-sm text-neutral-600">
                Nosotros te avisamos por WhatsApp si eres aprobado.
              </p>
            </div>
            <CheckCircle2 className="ml-auto h-8 w-8 shrink-0 text-neutral-400" />
          </li>
        </ol>
      </StepCard>

      <PrimaryAction onClick={() => setStep("photos")}>
        Empezar →
      </PrimaryAction>
    </div>
  );
}
