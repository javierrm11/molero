import { ActionForm } from "@/components/action-form";
import { CopyButton } from "@/components/copy-button";
import { SubmitButton } from "@/components/submit-button";
import { getGoogleAccount, isGoogleConfigured } from "@/lib/integrations/google";
import { isTelegramConfigured, telegramBotUsername } from "@/lib/integrations/telegram";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Settings } from "@/lib/types";

import { disconnectGoogle, saveNotifications, setupTelegram, unlinkTelegram } from "./actions";

const GOOGLE_MESSAGES: Record<string, { text: string; ok: boolean }> = {
  ok: { text: "Google conectado.", ok: true },
  error: { text: "No se ha podido conectar Google. Inténtalo de nuevo.", ok: false },
  "sin-configurar": { text: "Faltan GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET o TOKEN_ENCRYPTION_KEY en el servidor.", ok: false },
};

/** Secciones de Ajustes para Google, Telegram, avisos y el atajo «Guardar en Molero». */
export async function Connections({
  supabase,
  userId,
  settings,
  origin,
  googleStatus,
}: {
  supabase: SupabaseClient;
  userId: string;
  settings: Settings;
  origin: string;
  googleStatus?: string;
}) {
  const account = isGoogleConfigured() ? await getGoogleAccount(supabase, userId) : null;
  const bot = telegramBotUsername();
  const telegramReady = isTelegramConfigured() && !!bot;
  const shareUrl = `${origin}/api/library/save?token=${settings.focus_token}`;
  const notice = googleStatus ? GOOGLE_MESSAGES[googleStatus] : undefined;

  return (
    <>
      <section id="google" aria-labelledby="google-title" className="flex scroll-mt-6 flex-col gap-3 rounded-[26px] bg-card p-[18px]">
        <h2 id="google-title" className="text-base font-extrabold">
          Google: Calendario, Gmail y Tareas
        </h2>
        {notice ? (
          <p role="status" className={notice.ok ? "text-sm font-semibold text-accent" : "text-sm font-semibold text-danger"}>
            {notice.text}
          </p>
        ) : null}
        {account ? (
          <>
            <p className="text-sm">
              Conectado como <strong>{account.email}</strong>. Solo lectura de calendario y correo; las tareas se pueden marcar como hechas.
            </p>
            <form action={disconnectGoogle}>
              <SubmitButton variant="soft" size="sm" pendingText="Desconectando…">
                Desconectar
              </SubmitButton>
            </form>
          </>
        ) : (
          <>
            <p className="text-sm text-muted">Para el panel de vida y el resumen matinal. Los tokens se guardan cifrados.</p>
            {/* Ruta de servidor (redirige a Google), por eso es un <a> y no un Link. */}
            <a href="/api/google/connect" className="flex h-12 items-center justify-center rounded-[16px] bg-accent text-sm font-bold text-white">
              Conectar Google
            </a>
          </>
        )}
      </section>

      <section aria-labelledby="telegram-title" className="flex flex-col gap-3 rounded-[26px] bg-card p-[18px]">
        <h2 id="telegram-title" className="text-base font-extrabold">
          Avisos por Telegram
        </h2>
        {!telegramReady ? (
          <p className="text-sm text-muted">
            Crea un bot con @BotFather y define TELEGRAM_BOT_TOKEN, TELEGRAM_BOT_USERNAME y TELEGRAM_WEBHOOK_SECRET en el servidor.
          </p>
        ) : settings.telegram_chat_id ? (
          <>
            <p className="text-sm">
              Vinculado con <strong>@{bot}</strong>. Además, lo que le escribas al bot irá a tu bandeja.
            </p>
            <form action={unlinkTelegram}>
              <SubmitButton variant="soft" size="sm">
                Desvincular
              </SubmitButton>
            </form>
          </>
        ) : (
          <>
            <ol className="flex list-decimal flex-col gap-1.5 pl-5 text-sm">
              <li>Activa el webhook del bot (una vez).</li>
              <li>Abre el bot y pulsa «Iniciar» para vincular este chat.</li>
            </ol>
            <form action={setupTelegram}>
              <SubmitButton variant="soft" size="sm" className="w-full" pendingText="Configurando…">
                Activar webhook
              </SubmitButton>
            </form>
            {settings.telegram_link_code ? (
              <a
                href={`https://t.me/${bot}?start=${settings.telegram_link_code}`}
                target="_blank"
                rel="noreferrer"
                className="flex h-12 items-center justify-center rounded-[16px] bg-accent text-sm font-bold text-white"
              >
                Abrir @{bot} y vincular
              </a>
            ) : (
              <p className="text-sm text-danger">Aplica migrations/2.sql para poder vincular Telegram.</p>
            )}
          </>
        )}

        <ActionForm action={saveNotifications} submitLabel="Guardar avisos" successText="Guardado." submitVariant="tint">
          <label className="flex min-h-11 items-center gap-3 text-[15px] font-bold">
            <input type="checkbox" name="morning_brief" defaultChecked={settings.morning_brief ?? true} className="size-[22px]" />
            Resumen cada mañana
          </label>
          <label className="flex min-h-11 items-center gap-3 text-[15px] font-bold">
            <input type="checkbox" name="night_checkin" defaultChecked={settings.night_checkin ?? true} className="size-[22px]" />
            Revisión cada noche (y el informe del domingo)
          </label>
        </ActionForm>
      </section>

      <section id="compartir" aria-labelledby="compartir-title" className="flex scroll-mt-6 flex-col gap-3 rounded-[26px] bg-card p-[18px]">
        <h2 id="compartir-title" className="text-base font-extrabold">
          Atajo «Guardar en Molero»
        </h2>
        <ol className="flex list-decimal flex-col gap-2 pl-5 text-sm leading-relaxed">
          <li>
            En Atajos, crea un atajo nuevo y activa <strong>Mostrar en hoja de compartir</strong> (acepta URL y texto).
          </li>
          <li>
            Añade <em>Obtener contenido de URL</em> con esta dirección, método <strong>POST</strong> y cuerpo <em>Texto</em> = la entrada del atajo.
          </li>
          <li>
            Añade <em>Mostrar notificación</em> con el resultado. Llámalo «Guardar en Molero».
          </li>
        </ol>
        <div className="flex flex-col gap-2 rounded-[16px] bg-bg p-3">
          <code className="text-xs break-all">{shareUrl}</code>
          <CopyButton text={shareUrl} label="Copiar URL" variant="white" />
        </div>
      </section>
    </>
  );
}
