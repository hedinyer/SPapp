"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireVisitadorSession } from "@/lib/auth/visitador-session";
import { createAdminClient } from "@/lib/supabase/admin";
import { STORAGE_BUCKETS } from "@/lib/supabase/storage-buckets";
import { getStoragePublicUrl } from "@/lib/utils/storage-urls";
import type {
  VisitaEvidenciaFoto,
  VisitaEvidenciaVideo,
  VisitaUbicacionVerificada,
} from "@/lib/pipeline/types";

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
const PHOTO_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
const VIDEO_MIME = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
]);

function extensionForPhoto(mime: string): string {
  switch (mime) {
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    default:
      return "jpg";
  }
}

function extensionForVideo(mime: string): string {
  switch (mime) {
    case "video/webm":
      return "webm";
    case "video/quicktime":
      return "mov";
    default:
      return "mp4";
  }
}

export async function uploadVisitaPhoto(
  visitaId: string,
  formData: FormData,
): Promise<VisitaEvidenciaFoto> {
  const session = await requireVisitadorSession();
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Selecciona una foto.");
  }
  if (file.size > MAX_PHOTO_BYTES) {
    throw new Error("La foto no puede superar 5 MB.");
  }
  if (!PHOTO_MIME.has(file.type)) {
    throw new Error("Usa JPG, PNG o WebP.");
  }

  const path = `${session.visitadorId}/${visitaId}/fotos/${Date.now()}.${extensionForPhoto(file.type)}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  const supabase = createAdminClient();

  const { error } = await supabase.storage
    .from(STORAGE_BUCKETS.visitaEvidencias)
    .upload(path, bytes, { contentType: file.type, upsert: true });

  if (error) throw new Error(`No se pudo subir la foto: ${error.message}`);

  const url = getStoragePublicUrl(STORAGE_BUCKETS.visitaEvidencias, path);
  if (!url) throw new Error("No se pudo obtener la URL de la foto.");

  return { url, captured_at: new Date().toISOString() };
}

export async function uploadVisitaVideo(
  visitaId: string,
  formData: FormData,
): Promise<VisitaEvidenciaVideo> {
  const session = await requireVisitadorSession();
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Selecciona un video.");
  }
  if (file.size > MAX_VIDEO_BYTES) {
    throw new Error("El video no puede superar 50 MB.");
  }
  if (!VIDEO_MIME.has(file.type)) {
    throw new Error("Usa MP4, WebM o MOV.");
  }

  const path = `${session.visitadorId}/${visitaId}/videos/${Date.now()}.${extensionForVideo(file.type)}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  const supabase = createAdminClient();

  const { error } = await supabase.storage
    .from(STORAGE_BUCKETS.visitaEvidencias)
    .upload(path, bytes, { contentType: file.type, upsert: true });

  if (error) throw new Error(`No se pudo subir el video: ${error.message}`);

  const url = getStoragePublicUrl(STORAGE_BUCKETS.visitaEvidencias, path);
  if (!url) throw new Error("No se pudo obtener la URL del video.");

  return { url, captured_at: new Date().toISOString() };
}

const completeSchema = z.object({
  visitaId: z.string().uuid(),
  fotos: z
    .array(z.object({ url: z.string().url(), captured_at: z.string() }))
    .min(1),
  videos: z
    .array(z.object({ url: z.string().url(), captured_at: z.string() }))
    .min(1),
  ubicacion: z.object({
    lat: z.number(),
    lng: z.number(),
    accuracy: z.number().optional(),
    captured_at: z.string(),
  }),
  notas: z.string().optional(),
});

export async function completeVisitaVisitador(
  input: z.infer<typeof completeSchema>,
) {
  const session = await requireVisitadorSession();
  const parsed = completeSchema.parse(input);
  const supabase = createAdminClient();

  const { error } = await supabase.rpc("complete_visita_visitador", {
    p_visitador_id: session.visitadorId,
    p_visita_id: parsed.visitaId,
    p_evidencia_fotos: parsed.fotos,
    p_evidencia_videos: parsed.videos,
    p_ubicacion_verificada: parsed.ubicacion,
    p_notas_visita: parsed.notas?.trim() || null,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/visitador/mis-visitas");
  revalidatePath(`/visitador/visitas/${parsed.visitaId}`);
  return { ok: true };
}
