import {
  SUPABASE_ANON_KEY,
  SUPABASE_URL,
} from "@/lib/supabase/public-env";

// ponytail: credenciales embebidas; ignora env de Vercel (service_role mal puesta rompía writes)
export const SESSION_SECRET = "spapp-admin-local-dev-secret-32chars-min";

export function getSupabaseUrl(): string {
  return SUPABASE_URL;
}

export function getSupabaseAnonKey(): string {
  return SUPABASE_ANON_KEY;
}

export function getConfigErrorMessage(): string | null {
  return null;
}
