import { SUPABASE_URL } from "@/lib/supabase/public-env";

export function getStoragePublicUrl(
  bucket: string,
  path: string | null,
): string | null {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  const base = SUPABASE_URL.replace(/\/$/, "");
  return `${base}/storage/v1/object/public/${bucket}/${path}`;
}

export function getContractPublicUrl(path: string | null): string | null {
  return getStoragePublicUrl("contract-documents", path);
}
