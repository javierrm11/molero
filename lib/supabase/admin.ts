import "server-only";

import { createClient } from "@supabase/supabase-js";

/**
 * Cliente con la service role. Salta RLS: úsalo solo en rutas que no tienen sesión
 * (p. ej. /api/focus/current, que llaman los Atajos de iOS con un token) y filtra siempre por user_id.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("Falta SUPABASE_SERVICE_ROLE_KEY");
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function hasAdminKey(): boolean {
  return !!process.env.SUPABASE_SERVICE_ROLE_KEY;
}
