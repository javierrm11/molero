import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";

import { createClient } from "@/lib/supabase/server";

/** Devuelve el cliente de Supabase y el usuario; redirige a /login si no hay sesión. */
export const requireUser = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");
  return { supabase, user: data.user };
});

/** Ámbito de IA/datos con la sesión del usuario (para funciones compartidas con el cron). */
export async function sessionScope() {
  const { supabase, user } = await requireUser();
  return { client: supabase, userId: user.id };
}
