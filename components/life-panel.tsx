import { Mail, Video } from "lucide-react";
import Link from "next/link";

import { TaskCheck } from "@/components/task-check";
import { formatTime } from "@/lib/dates";
import type { LifePanel } from "@/lib/integrations/google";
import type { Briefing } from "@/lib/types";

/** Tarjeta del resumen de la mañana en Inicio. */
export function BriefingCard({ briefing }: { briefing: Briefing | null }) {
  if (!briefing) {
    return (
      <Link href="/resumen" className="flex items-center justify-between gap-3 rounded-[22px] bg-card px-4 py-3.5">
        <span className="flex flex-col">
          <span className="text-[15px] font-extrabold">Resumen de hoy</span>
          <span className="text-[13px] text-muted">Agenda, correo y tareas en 20 segundos</span>
        </span>
        <span className="rounded-[12px] bg-accent-tint px-3 py-2 text-[13px] font-extrabold text-accent-dark">Generar</span>
      </Link>
    );
  }
  return (
    <section aria-labelledby="resumen" className="flex flex-col gap-2.5 rounded-[28px] bg-card p-[18px]">
      <div className="flex items-center justify-between">
        <h2 id="resumen" className="text-xs font-bold tracking-[0.6px] text-accent">
          RESUMEN DE LA MAÑANA{briefing.sent_at ? ` · ${formatTime(briefing.sent_at)}` : ""}
        </h2>
        {briefing.sent_at ? <span className="text-xs font-semibold text-muted">Telegram ✓</span> : null}
      </div>
      <p className="text-base leading-snug font-bold">{briefing.focus}</p>
      <Link href="/resumen" className="self-start text-[13px] font-extrabold text-accent">
        Leer resumen completo
      </Link>
    </section>
  );
}

/** Calendario, correo y tareas de Google en Inicio. */
export function LifePanelSections({ panel }: { panel: LifePanel }) {
  if (!panel.configured) return null;
  if (!panel.connected) {
    return (
      <Link href="/ajustes#google" className="flex items-center justify-between rounded-[22px] border-2 border-dashed border-line px-4 py-3.5">
        <span className="flex flex-col">
          <span className="text-[15px] font-extrabold">Conecta Google</span>
          <span className="text-[13px] text-muted">Calendario, Gmail y Tareas en tu inicio</span>
        </span>
        <span className="text-[13px] font-extrabold text-accent">Conectar</span>
      </Link>
    );
  }
  if (panel.error) {
    return (
      <Link href="/ajustes#google" className="rounded-[22px] bg-peach-tint px-4 py-3.5 text-sm font-semibold text-peach-ink">
        {panel.error}
      </Link>
    );
  }

  return (
    <>
      {panel.events.length > 0 ? (
        <section aria-labelledby="calendario" className="flex flex-col gap-2.5 rounded-[26px] bg-card px-[18px] py-4">
          <div className="flex items-center justify-between">
            <h2 id="calendario" className="text-[15px] font-extrabold">
              Calendario
            </h2>
            <span className="text-xs font-semibold text-muted">{panel.email}</span>
          </div>
          {panel.events.slice(0, 5).map((e) => (
            <div key={e.id} className="flex items-center gap-2.5">
              <span className="w-12 shrink-0 text-[13px] font-bold text-muted">{e.allDay ? "Todo" : formatTime(e.start)}</span>
              <span aria-hidden className="h-[30px] w-1 shrink-0 rounded-full bg-sky-ink" />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-bold">{e.title}</span>
                {e.location || e.meet ? (
                  <span className="flex items-center gap-1 truncate text-xs text-muted">
                    {e.meet ? <Video className="size-3" aria-hidden /> : null}
                    {e.meet ? "Meet" : e.location}
                  </span>
                ) : null}
              </span>
            </div>
          ))}
        </section>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <a
          href="https://mail.google.com/mail/u/0/#inbox"
          target="_blank"
          rel="noreferrer"
          className="flex flex-col gap-2 rounded-[26px] bg-card p-4"
        >
          <span className="flex items-center gap-1.5 text-[15px] font-extrabold">
            <Mail className="size-4 text-accent" aria-hidden />
            Correo
          </span>
          <span className="text-[28px] leading-none font-extrabold tracking-[-0.6px]">
            {panel.unread} <span className="text-[13px] font-bold text-muted">sin leer</span>
          </span>
          <span className="line-clamp-2 text-xs leading-snug text-muted">
            {panel.emails
              .slice(0, 2)
              .map((m) => m.from.split(" ")[0])
              .join(" · ") || "Bandeja al día"}
          </span>
        </a>
        <section aria-labelledby="tareas" className="flex flex-col gap-2 rounded-[26px] bg-card p-4">
          <h2 id="tareas" className="text-[15px] font-extrabold">
            Tareas
          </h2>
          {panel.tasks.length === 0 ? <span className="text-xs text-muted">Nada pendiente</span> : null}
          {panel.tasks.slice(0, 3).map((t) => (
            <TaskCheck key={t.id} id={t.id} title={t.title} />
          ))}
        </section>
      </div>
    </>
  );
}
