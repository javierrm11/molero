"use client";

import { useActionState } from "react";

import { SubmitButton } from "@/components/submit-button";
import { Field, Input } from "@/components/ui/input";

import { signIn } from "./actions";

export function LoginForm() {
  const [state, action] = useActionState(signIn, undefined);
  return (
    <form action={action} className="flex flex-col gap-4 rounded-[26px] bg-card p-5">
      <Field label="Email" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>
      <Field label="Contraseña" htmlFor="password">
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </Field>
      {state?.error ? (
        <p role="alert" className="text-sm font-semibold text-danger">
          {state.error}
        </p>
      ) : null}
      <SubmitButton size="lg" pendingText="Entrando…">
        Entrar
      </SubmitButton>
    </form>
  );
}
