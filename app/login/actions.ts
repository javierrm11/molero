"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { formText } from "@/lib/utils";

export async function signIn(_: { error?: string } | undefined, form: FormData) {
  const email = formText(form, "email");
  const password = formText(form, "password");
  if (!email || !password) return { error: "Escribe tu email y tu contraseña." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "Email o contraseña incorrectos." };
  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
