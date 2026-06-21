import {
  SUPABASE_ANON_KEY,
  SUPABASE_URL,
} from "@/lib/supabase/public-env";

/** Credenciales embebidas para deploy sin variables en Vercel. */
// ponytail: service_role solo servidor; anon queda para browser/storage
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
export const SESSION_SECRET =
  process.env.SESSION_SECRET ?? "spapp-admin-local-dev-secret-32chars-min";

export function getSupabaseUrl(): string {
  return SUPABASE_URL;
}

export function getSupabaseAnonKey(): string {
  return SUPABASE_ANON_KEY;
}

export function hasServiceRoleKey(): boolean {
  return Boolean(SUPABASE_SERVICE_ROLE_KEY.trim());
}

export function getSupabaseServiceRoleKey(): string {
  if (!hasServiceRoleKey()) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
  }
  return SUPABASE_SERVICE_ROLE_KEY;
}

export function getConfigErrorMessage(): string | null {
  return null;
}
