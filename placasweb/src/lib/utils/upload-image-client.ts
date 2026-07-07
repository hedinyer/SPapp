import { createBrowserClient } from "@/lib/supabase/browser";
import type { MotoImageBucket } from "@/lib/supabase/storage-buckets";
import { getStoragePublicUrl } from "@/lib/utils/storage-urls";
import { compressImageFile } from "@/lib/utils/compress-image-file";

function sanitizeFolder(folder: string): string {
  return folder
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9/_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^\/+|\/+$/g, "")
    .slice(0, 120);
}

export async function uploadImageFromBrowser(
  bucket: MotoImageBucket,
  folder: string,
  file: File,
): Promise<string> {
  const compressed = await compressImageFile(file);
  const safeFolder = sanitizeFolder(folder);
  const path = `${safeFolder}/${Date.now()}.jpg`;
  const supabase = createBrowserClient();

  const { error } = await supabase.storage.from(bucket).upload(path, compressed, {
    contentType: "image/jpeg",
    upsert: true,
  });

  if (error) {
    throw new Error(`No se pudo subir la imagen: ${error.message}`);
  }

  const publicUrl = getStoragePublicUrl(bucket, path);
  if (!publicUrl) {
    throw new Error("No se pudo obtener la URL de la imagen.");
  }

  return publicUrl;
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function placaUploadFolder(placa: string): string {
  const slug = slugify(placa) || "sin-placa";
  return `placas/${slug}`;
}

export function serieUploadFolder(numeroSerie: string): string {
  const slug = slugify(numeroSerie) || "sin-serie";
  return `series/${slug}`;
}
