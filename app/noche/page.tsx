import { Moon } from "lucide-react";
import Link from "next/link";

import { requireUser } from "@/lib/auth";
import { dayStats } from "@/lib/coach";
import { formatShortDate, todayLocal } from "@/lib/dates";
import type { DailyCheckin } from "@/lib/types";

import { CheckinForm } from "./checkin-form";

export const metadata = { title: "Revisión de hoy" };

export default async function NightPage() {
  const { supabase, user } = await requireUser();
  const today = todayLocal();
  const [stats, { data }] = await Promise.all([
    dayStats({ client: supabase, userId: user.id }, today),
    supabase.from("daily_checkins").select("*").eq("date", today).maybeSingle(),
  ]);
  const existing = data as DailyCheckin | null;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col gap-3.5 bg-accent-dark px-[18px] pt-[max(env(safe-area-inset-top),20px)] pb-[max(env(safe-area-inset-bottom),24px)] text-white">
      <div className="flex items-center justify-between">
        <span className="flex h-[34px] items-center gap-2 rounded-full bg-white/15 px-3 text-xs font-bold first-letter:uppercase">
          <Moon className="size-3.5" aria-hidden />
          {formatShortDate(today)}
        </span>
        <div className="flex gap-1">
          <Link href="/semana" className="flex h-11 items-center px-2 text-[13px] font-bold text-accent-soft">
            Mi semana
          </Link>
          <Link href="/" className="flex h-11 items-center px-2 text-[13px] font-bold text-accent-soft">
            Luego
          </Link>
        </div>
      </div>

      <header className="flex flex-col gap-1">
        <h1 className="text-[28px] font-extrabold tracking-[-0.6px]">¿Cómo ha ido hoy?</h1>
        <span className="text-sm text-accent-soft">2 minutos. Ya sé lo que hiciste en la agenda.</span>
      </header>

      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          [`${stats.done}/${stats.total}`, "bloques hechos"],
          [String(stats.skipped), "saltados"],
          [String(stats.total - stats.done - stats.skipped), "sin cerrar"],
        ].map(([value, label]) => (
          <div key={label} className="flex flex-col gap-0.5 rounded-[18px] bg-white/10 px-1 py-2.5">
            <span className="text-xl font-extrabold">{value}</span>
            <span className="text-[11px] font-semibold text-accent-soft">{label}</span>
          </div>
        ))}
      </div>

      <CheckinForm existing={existing} />
    </main>
  );
}
