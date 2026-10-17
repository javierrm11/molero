import { ExternalLink } from "lucide-react";
import { headers } from "next/headers";

import { signOut } from "@/app/login/actions";
import { ActionForm } from "@/components/action-form";
import { CopyButton } from "@/components/copy-button";
import { PageHeader } from "@/components/page-header";
import { SubmitButton } from "@/components/submit-button";
import { Field, Input } from "@/components/ui/input";
import { requireUser } from "@/lib/auth";
import { BLOCK_TYPE_ORDER, BLOCK_TYPES } from "@/lib/constants";
import { getSettings } from "@/lib/data";
import { focusShortcutName, shortcutUrl } from "@/lib/focus";

import { regenerateToken, saveFocusSettings } from "./actions";
import { Connections } from "./connections";

export const metadata = { title: "Ajustes" };

const thousands = new Intl.NumberFormat("es-ES");

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ google?: string }> }) {
  const { google } = await searchParams;
  const { supabase, user } = await requireUser();
  const settings = await getSettings(supabase);
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("x-forwarded-host") ?? h.get("host")}`;
  const automationUrl = `${origin}/api/focus/current?token=${settings.focus_token}`;

  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const { data: logs } = await supabase.from("ai_logs").select("task, input_tokens, output_tokens").gte("created_at", monthStart.toISOString());
  const usage = new Map<string, { calls: number; tokens: number }>();
  for (const log of (logs ?? []) as { task: string; input_tokens: number; output_tokens: number }[]) {
    const current = usage.get(log.task) ?? { calls: 0, tokens: 0 };
    usage.set(log.task, { calls: current.calls + 1, tokens: current.tokens + log.input_tokens + log.output_tokens });
  }
  const totalTokens = [...usage.values()].reduce((sum, u) => sum + u.tokens, 0);

  const focusTypes = BLOCK_TYPE_ORDER.filter((t) => t !== "rest");

  return (
    <>
      <PageHeader title="Ajustes" eyebrow={user.email} back="/" />

      <Connections supabase={supabase} userId={user.id} settings={settings} origin={origin} googleStatus={google} />

      <section aria-labelledby="concentracion" className="flex flex-col gap-3 rounded-[26px] bg-card p-[18px]">
        <h2 id="concentracion" className="text-base font-extrabold">
          Concentración del iPhone
        </h2>
        <p className="text-sm text-muted">
          Al empezar un bloque, Molero HQ abre el atajo de su tipo para activar el modo Concentración. Al terminarlo, abre el atajo de
          desactivar.
        </p>
        <ActionForm action={saveFocusSettings} submitLabel="Guardar atajos" successText="Guardado." submitVariant="tint">
          <label className="flex min-h-11 items-center gap-3 text-[15px] font-bold">
            <input type="checkbox" name="focus_enabled" defaultChecked={settings.focus_enabled} className="size-[22px]" />
            Activar la Concentración al empezar un bloque
          </label>
          {focusTypes.map((type) => (
            <Field key={type} label={`Atajo para «${BLOCK_TYPES[type].label}»`} htmlFor={`sc-${type}`}>
              <div className="flex gap-2">
                <Input
                  id={`sc-${type}`}
                  name={`shortcut_${type}`}
                  defaultValue={settings.focus_shortcuts[type] ?? ""}
                  placeholder={BLOCK_TYPES[type].defaultShortcut}
                />
                <a
                  href={shortcutUrl(focusShortcutName(settings, type))}
                  aria-label={`Probar el atajo de ${BLOCK_TYPES[type].label}`}
                  className="flex size-12 shrink-0 items-center justify-center rounded-[16px] bg-bg"
                >
                  <ExternalLink className="size-4" aria-hidden />
                </a>
              </div>
            </Field>
          ))}
          <Field label="Atajo para desactivar" htmlFor="sc-off">
            <Input id="sc-off" name="focus_off_shortcut" defaultValue={settings.focus_off_shortcut} />
          </Field>
        </ActionForm>
      </section>

      <section aria-labelledby="como" className="flex flex-col gap-3 rounded-[26px] bg-card p-[18px]">
        <h2 id="como" className="text-base font-extrabold">
          Cómo configurarlo (una vez)
        </h2>
        <ol className="flex list-decimal flex-col gap-2.5 pl-5 text-sm leading-relaxed">
          <li>
            En <strong>Ajustes → Concentración</strong>, crea un modo por tipo de bloque (Estudiar, Grabar, Editar…). En cada uno, permite
            solo las apps que necesitas y oculta las páginas de inicio con distracciones.
          </li>
          <li>
            En la app <strong>Atajos</strong>, crea un atajo por modo con la acción de Concentración (<em>Set Focus</em>): <em>Activar «Grabar»
            hasta que se desactive</em>. Ponle el nombre exacto de arriba (p. ej. «Molero Foco Grabar»).
          </li>
          <li>
            Crea el atajo <strong>«{settings.focus_off_shortcut || "Molero Foco Off"}»</strong> con la acción <em>Desactivar
            Concentración</em>.
          </li>
          <li>Pulsa el botón de prueba junto a cada atajo para comprobar que se abre.</li>
        </ol>
      </section>

      <section aria-labelledby="bloqueo" className="flex flex-col gap-3 rounded-[26px] bg-accent p-[18px] text-white">
        <h2 id="bloqueo" className="text-base font-extrabold">
          Que solo puedas hacer lo que toca
        </h2>
        <p className="text-sm text-[#e1f5ec]">
          Crea una automatización en Atajos: <strong>Al abrir una app</strong> (Instagram, TikTok, YouTube…) → <em>Obtener contenido de URL</em>{" "}
          con esta dirección → <em>Obtener valor de diccionario</em> «message» y «focus» → si «focus» es verdadero, <em>Mostrar notificación</em>{" "}
          con el mensaje y <em>Ir a la pantalla de inicio</em>.
        </p>
        <div className="flex flex-col gap-2 rounded-[18px] bg-card p-3 text-ink">
          <code className="text-xs break-all">{automationUrl}</code>
          <div className="flex gap-2">
            <CopyButton text={automationUrl} label="Copiar URL" className="flex-1" />
            <form action={regenerateToken} className="flex-1">
              <SubmitButton variant="soft" size="sm" className="w-full" pendingText="…">
                Nuevo token
              </SubmitButton>
            </form>
          </div>
        </div>
        <p className="text-xs text-accent-soft">El token da acceso de solo lectura a tu bloque actual. Si se filtra, genera uno nuevo.</p>
      </section>

      <section aria-labelledby="uso" className="flex flex-col gap-2 rounded-[26px] bg-card p-[18px]">
        <h2 id="uso" className="text-base font-extrabold">
          Uso de la IA este mes
        </h2>
        <p className="text-sm text-muted">{thousands.format(totalTokens)} tokens en total. Fija también un límite de presupuesto en Google Cloud.</p>
        {[...usage.entries()].map(([task, u]) => (
          <div key={task} className="flex justify-between border-t border-line pt-2 text-sm">
            <span>{task}</span>
            <span className="text-muted">
              {u.calls} llamadas · {thousands.format(u.tokens)} tokens
            </span>
          </div>
        ))}
      </section>

      <form action={signOut}>
        <SubmitButton variant="danger" className="w-full" pendingText="Saliendo…">
          Cerrar sesión
        </SubmitButton>
      </form>
    </>
  );
}
