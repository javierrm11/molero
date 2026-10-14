"use client";

import { useActionState, useEffect, useRef } from "react";

import { SubmitButton } from "@/components/submit-button";
import type { ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type State = { error?: string; ok?: boolean } | undefined;

/** Formulario con server action, mensajes de error/éxito y reseteo opcional al guardar. */
export function ActionForm({
  action,
  children,
  submitLabel,
  pendingText = "Guardando…",
  successText,
  resetOnSuccess = false,
  submitVariant,
  className,
}: {
  action: (state: State, form: FormData) => Promise<State>;
  children: React.ReactNode;
  submitLabel: string;
  pendingText?: string;
  successText?: string;
  resetOnSuccess?: boolean;
  submitVariant?: ButtonProps["variant"];
  className?: string;
}) {
  const [state, formAction] = useActionState(action, undefined);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok && resetOnSuccess) ref.current?.reset();
  }, [state, resetOnSuccess]);

  return (
    <form ref={ref} action={formAction} className={cn("flex flex-col gap-3", className)}>
      {children}
      {state?.error ? (
        <p role="alert" className="text-sm font-semibold text-danger">
          {state.error}
        </p>
      ) : null}
      {state?.ok && successText ? <p className="text-sm font-semibold text-accent">{successText}</p> : null}
      <SubmitButton variant={submitVariant} pendingText={pendingText}>
        {submitLabel}
      </SubmitButton>
    </form>
  );
}
