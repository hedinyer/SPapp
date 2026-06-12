/** Credenciales embebidas para deploy sin variables en Vercel. */
const SUPABASE_URL = "https://iilgrapnrkwdcouielwz.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlpbGdyYXBucmt3ZGNvdWllbHd6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5NDEyODEsImV4cCI6MjA5NjUxNzI4MX0.82GJcFxinFQqxI8OSh40JdivYWK9hr1GRw6lyiqW_3E";
const SUPABASE_SERVICE_ROLE_KEY = "";
export const SESSION_SECRET = "spapp-admin-local-dev-secret-32chars-min";

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
