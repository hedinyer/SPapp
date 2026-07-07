"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ImageFileField } from "@/components/ui/image-file-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createBrowserClient } from "@/lib/supabase/browser";
import { STORAGE_BUCKETS } from "@/lib/supabase/storage-buckets";
import {
  CONDICION_LABELS,
  type MotoCondicion,
  type MotoRow,
} from "@/lib/motos/types";
import { duplicateMotoMessage, motoCreateSchema } from "@/lib/motos/validation";
import {
  placaUploadFolder,
  serieUploadFolder,
  uploadImageFromBrowser,
} from "@/lib/utils/upload-image-client";
import { cn } from "@/lib/utils";

type ModoIdentificador = "placa" | "serie";

const actionBtnClass =
  "inline-flex min-h-11 w-full touch-manipulation cursor-pointer items-center justify-center gap-2 rounded-lg bg-black px-4 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50";

const outlineBtnClass =
  "inline-flex min-h-11 w-full touch-manipulation cursor-pointer items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 text-sm font-medium text-neutral-900";

export function MotoForm({ moto }: { moto?: MotoRow }) {
  const router = useRouter();
  const isEdit = Boolean(moto);
  const [pending, startTransition] = useTransition();

  const initialModo: ModoIdentificador = moto?.placa?.trim() ? "placa" : "serie";

  const [modo, setModo] = useState<ModoIdentificador>(initialModo);
  const [placa, setPlaca] = useState(moto?.placa ?? "");
  const [numeroSerie, setNumeroSerie] = useState(moto?.numero_serie ?? "");
  const [condicion, setCondicion] = useState<MotoCondicion>(
    moto?.condicion ?? "nueva",
  );
  const [notas, setNotas] = useState(moto?.notas ?? "");
  const [imageFile, setImageFile] = useState<File | null>(null);

  function setModoIdentificador(next: ModoIdentificador) {
    if (isEdit) return;
    setModo(next);
  }

  async function handleSubmit() {
    const parsed = motoCreateSchema.safeParse({
      modo,
      placa: placa.trim().toUpperCase(),
      numero_serie: numeroSerie.trim(),
      condicion,
      notas: notas.trim(),
      tieneFoto: Boolean(imageFile) || Boolean(moto?.foto_url),
    });

    if (!parsed.success) {
      const first = parsed.error.issues[0];
      toast.error(first?.message ?? "Revisa los datos del formulario.");
      return;
    }

    startTransition(async () => {
      try {
        let fotoUrl = moto?.foto_url ?? "";

        if (imageFile) {
          const folder =
            modo === "placa"
              ? placaUploadFolder(parsed.data.placa)
              : serieUploadFolder(parsed.data.numero_serie);
          fotoUrl = await uploadImageFromBrowser(
            STORAGE_BUCKETS.motoFotos,
            folder,
            imageFile,
          );
        }

        const supabase = createBrowserClient();
        const payload = {
          placa: modo === "placa" ? parsed.data.placa : null,
          numero_serie: modo === "serie" ? parsed.data.numero_serie : null,
          condicion: parsed.data.condicion,
          foto_url: fotoUrl,
          notas: parsed.data.notas || null,
        };

        if (isEdit && moto) {
          const { error } = await supabase
            .from("motos")
            .update(payload)
            .eq("id", moto.id);

          if (error) {
            const dup = duplicateMotoMessage(error);
            toast.error(dup ?? error.message);
            return;
          }

          toast.success("Moto actualizada.");
          router.push("/");
          router.refresh();
          return;
        }

        const { error } = await supabase.from("motos").insert(payload);

        if (error) {
          const dup = duplicateMotoMessage(error);
          toast.error(dup ?? error.message);
          return;
        }

        toast.success("Moto registrada.");
        router.push("/");
        router.refresh();
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "No se pudo guardar la moto.",
        );
      }
    });
  }

  function handleDelete() {
    if (!moto) return;
    if (!confirm("¿Eliminar esta moto del inventario?")) return;

    startTransition(async () => {
      const supabase = createBrowserClient();
      const { error } = await supabase.from("motos").delete().eq("id", moto.id);

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success("Moto eliminada.");
      router.push("/");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/" className="text-sm text-neutral-500">
          ← Volver al inventario
        </Link>
        <h1 className="mt-2 text-xl font-semibold">
          {isEdit ? "Editar moto" : "Nueva moto"}
        </h1>
      </div>

      {!isEdit && (
        <div className="space-y-2">
          <Label>Identificación</Label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              className={cn(
                outlineBtnClass,
                modo === "placa" && "border-black bg-neutral-100",
              )}
              onClick={() => setModoIdentificador("placa")}
            >
              Tiene placa
            </button>
            <button
              type="button"
              className={cn(
                outlineBtnClass,
                modo === "serie" && "border-black bg-neutral-100",
              )}
              onClick={() => setModoIdentificador("serie")}
            >
              Sin placa (serie)
            </button>
          </div>
        </div>
      )}

      {modo === "placa" ? (
        <div className="space-y-2">
          <Label htmlFor="placa">Placa</Label>
          <Input
            id="placa"
            value={placa}
            disabled={isEdit}
            autoCapitalize="characters"
            placeholder="ABC12D"
            onChange={(e) => setPlaca(e.target.value.toUpperCase())}
          />
        </div>
      ) : (
        <div className="space-y-2">
          <Label htmlFor="numero-serie">Número de serie</Label>
          <Input
            id="numero-serie"
            value={numeroSerie}
            disabled={isEdit}
            placeholder="Serie del chasis o motor"
            onChange={(e) => setNumeroSerie(e.target.value)}
          />
        </div>
      )}

      <div className="space-y-2">
        <Label>Condición</Label>
        <div className="grid grid-cols-2 gap-2">
          {(["nueva", "usada"] as const).map((value) => (
            <button
              key={value}
              type="button"
              className={cn(
                outlineBtnClass,
                condicion === value && "border-black bg-neutral-100",
              )}
              onClick={() => setCondicion(value)}
            >
              {CONDICION_LABELS[value]}
            </button>
          ))}
        </div>
      </div>

      <ImageFileField
        label="Foto de la moto"
        existingUrl={moto?.foto_url}
        file={imageFile}
        onFileChange={setImageFile}
        disabled={pending}
        enableCamera
      />

      <div className="space-y-2">
        <Label htmlFor="notas">Notas (opcional)</Label>
        <Textarea
          id="notas"
          value={notas}
          rows={3}
          placeholder="Observaciones, ubicación, etc."
          onChange={(e) => setNotas(e.target.value)}
        />
      </div>

      <button
        type="button"
        className={actionBtnClass}
        disabled={pending}
        onClick={() => void handleSubmit()}
      >
        {pending ? "Guardando…" : isEdit ? "Guardar cambios" : "Registrar moto"}
      </button>

      {isEdit && (
        <button
          type="button"
          className={cn(outlineBtnClass, "text-red-600")}
          disabled={pending}
          onClick={handleDelete}
        >
          Eliminar moto
        </button>
      )}
    </div>
  );
}
