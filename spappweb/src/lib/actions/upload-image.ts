"use server";

import { requireAdminSession } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  STORAGE_BUCKETS,
  type AdminImageBucket,
} from "@/lib/supabase/storage-buckets";
import { getStoragePublicUrl } from "@/lib/utils/storage-urls";

const ALLOWED_BUCKETS: AdminImageBucket[] = [
  STORAGE_BUCKETS.visitadorFotos,
  STORAGE_BUCKETS.bikeImages,
  STORAGE_BUCKETS.inventarioImagenes,
];
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

function extensionFor(file: File): string {
  switch (file.type) {
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    default:
      return "jpg";
  }
}

function sanitizeFolder(folder: string): string {
  return folder
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9/_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^\/+|\/+$/g, "")
    .slice(0, 120);
}

export async function uploadAdminImage(formData: FormData): Promise<{
  path: string;
  publicUrl: string;
}> {
  await requireAdminSession();

  const bucket = String(formData.get("bucket") ?? "") as AdminImageBucket;
  const folder = sanitizeFolder(String(formData.get("folder") ?? "uploads"));
  const file = formData.get("file");

  if (!ALLOWED_BUCKETS.includes(bucket)) {
    throw new Error("Destino de imagen no válido.");
  }
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Selecciona una imagen de tu PC.");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("La imagen no puede superar 5 MB.");
  }
  if (!ALLOWED_MIME.has(file.type)) {
    throw new Error("Usa JPG, PNG o WebP.");
  }

  const path = `${folder}/${Date.now()}.${extensionFor(file)}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  const supabase = createAdminClient();

  const { error } = await supabase.storage.from(bucket).upload(path, bytes, {
    contentType: file.type,
    upsert: true,
  });

  if (error) {
    throw new Error(`No se pudo subir la imagen: ${error.message}`);
  }

  const publicUrl = getStoragePublicUrl(bucket, path);
  if (!publicUrl) {
    throw new Error("No se pudo obtener la URL de la imagen.");
  }

  return { path, publicUrl };
}
