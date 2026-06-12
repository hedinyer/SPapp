import "server-only";

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import {
  getSupabaseAnonKey,
  getSupabaseServiceRoleKey,
  getSupabaseUrl,
  hasServiceRoleKey,
} from "@/lib/supabase/env";

/**
 * Cliente Supabase para operaciones del panel admin (solo servidor).
 * Usa service_role si está configurada; si no, anon key (este proyecto
 * ya tiene GRANTs amplios para anon en tablas admin).
 */
export function createAdminClient(): SupabaseClient {
  const url = getSupabaseUrl();
  const key = hasServiceRoleKey()
    ? getSupabaseServiceRoleKey()
    : getSupabaseAnonKey();

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
