"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { Copy, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { approveCredit, rejectCredit } from "@/lib/actions/admin-actions";
import type { UserDocumentRow } from "@/lib/pipeline/types";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface CreditReviewPanelProps {
  document: UserDocumentRow;
  userId: number;
  contractId?: string | null;
  clienteCelular?: string | null;
  contractSigned?: boolean;
}

export function CreditReviewPanel({
  document,
  userId,
  contractId,
  clienteCelular,
  contractSigned,
}: CreditReviewPanelProps) {
  const [rejectOpen, setRejectOpen] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [betado, setBetado] = useState(false);
  const [pending, startTransition] = useTransition();

  function onApprove() {
    startTransition(async () => {
      try {
        await approveCredit(document.id, userId);
        toast.success("Crédito aprobado. El cliente puede diligenciar formatos.");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "No se pudo aprobar.");
      }
    });
  }

  function onReject() {
    startTransition(async () => {
      try {
        await rejectCredit({
          documentId: document.id,
          userId,
          motivo,
          betado,
        });
        toast.success("Solicitud rechazada.");
        setRejectOpen(false);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "No se pudo rechazar.");
      }
    });
  }

  if (document.estado_solicitud !== "pendiente") {
    return (
      <ReadonlyCredit
        document={document}
        contractId={contractId}
        clienteCelular={clienteCelular}
        contractSigned={contractSigned}
      />
    );
  }

  return (
    <Card className="border-neutral-200 shadow-none">
      <CardHeader>
        <CardTitle className="text-lg">Revisar solicitud de crédito</CardTitle>
        <p className="text-sm text-neutral-500">
          Verifica las fotos del documento y la selfie antes de decidir.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <PhotoGrid document={document} />
        <div className="flex flex-wrap gap-3">
          <Button
            size="lg"
            className="bg-black text-white hover:bg-neutral-800"
            disabled={pending}
            onClick={onApprove}
          >
            Aprobar crédito
          </Button>
          <Button
            size="lg"
            variant="outline"
            disabled={pending}
            onClick={() => setRejectOpen(true)}
          >
            Rechazar
          </Button>
        </div>
      </CardContent>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle>Rechazar solicitud</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="motivo">Motivo (visible para el cliente)</Label>
              <Textarea
                id="motivo"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Ej: Documento ilegible"
                rows={3}
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="betado"
                checked={betado}
                onCheckedChange={(v) => setBetado(v === true)}
              />
              <Label htmlFor="betado" className="font-normal">
                Bloquear reintentos (betado)
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={pending || motivo.trim().length < 3}
              onClick={onReject}
            >
              Confirmar rechazo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function ReadonlyCredit({
  document,
  contractId,
  clienteCelular,
  contractSigned,
}: {
  document: UserDocumentRow;
  contractId?: string | null;
  clienteCelular?: string | null;
  contractSigned?: boolean;
}) {
  return (
    <Card className="border-neutral-200 shadow-none">
      <CardHeader>
        <CardTitle className="text-lg">Solicitud de crédito</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm">
          Estado:{" "}
          <span className="font-medium capitalize">
            {document.estado_solicitud}
          </span>
        </p>
        {document.motivo_rechazo && (
          <p className="text-sm text-neutral-600">
            Motivo: {document.motivo_rechazo}
          </p>
        )}
        {document.estado_solicitud === "aceptada" &&
          contractId &&
          !contractSigned && (
            <ShareLinkCard contractId={contractId} celular={clienteCelular} />
          )}
        <PhotoGrid document={document} />
      </CardContent>
    </Card>
  );
}

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
  "https://s-papp-mauve.vercel.app";

function ShareLinkCard({
  contractId,
  celular,
}: {
  contractId: string;
  celular?: string | null;
}) {
  const link = `${SITE_URL}/contrato/${contractId}`;

  function copy() {
    navigator.clipboard
      .writeText(link)
      .then(() => toast.success("Link copiado."))
      .catch(() => toast.error("No se pudo copiar."));
  }

  const mensaje = `Hola, tu crédito fue aprobado. Firma tu contrato aquí: ${link}`;
  const digits = (celular ?? "").replace(/\D/g, "");
  const waBase = digits ? `https://wa.me/57${digits}` : "https://wa.me/";
  const waUrl = `${waBase}?text=${encodeURIComponent(mensaje)}`;

  return (
    <div className="space-y-3 rounded-lg border border-green-300 bg-green-50 p-4">
      <p className="text-sm font-medium text-green-900">
        Link de firma del contrato para el cliente
      </p>
      <p className="break-all rounded-md border border-green-200 bg-white px-3 py-2 text-xs text-neutral-700">
        {link}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={copy}>
          <Copy className="mr-1.5 h-4 w-4" />
          Copiar link
        </Button>
        <Button
          size="sm"
          className="bg-green-600 text-white hover:bg-green-700"
          asChild
        >
          <a href={waUrl} target="_blank" rel="noopener noreferrer">
            <MessageCircle className="mr-1.5 h-4 w-4" />
            Enviar por WhatsApp
          </a>
        </Button>
      </div>
    </div>
  );
}

function PhotoGrid({ document }: { document: UserDocumentRow }) {
  const photos = [
    { label: "Documento frontal", url: document.document_front_url },
    { label: "Documento trasero", url: document.document_back_url },
    { label: "Selfie", url: document.selfie_url },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {photos.map(({ label, url }) => (
        <div key={label} className="space-y-2">
          <p className="text-sm font-medium text-neutral-700">{label}</p>
          {url ? (
            <a href={url} target="_blank" rel="noopener noreferrer">
              <div className="relative aspect-[4/3] overflow-hidden rounded-lg border border-neutral-200 bg-neutral-50">
                <Image
                  src={url}
                  alt={label}
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
            </a>
          ) : (
            <div className="flex aspect-[4/3] items-center justify-center rounded-lg border border-dashed border-neutral-200 text-sm text-neutral-400">
              Sin foto
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
