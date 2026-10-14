import Link from "next/link";

import { requireUser } from "@/lib/auth";
import { isValidDate, todayLocal } from "@/lib/dates";

import { Assistant } from "./assistant";

export const metadata = { title: "Asistente" };

export default async function AssistantPage({ searchParams }: { searchParams: Promise<{ plan?: string }> }) {
  const { plan } = await searchParams;
  await requireUser();

  return (
    <>
      <header className="flex items-center justify-between px-1">
        <h1 className="text-[26px] font-extrabold tracking-[-0.6px]">Asistente</h1>
        <Link href="/cerebro" className="flex items-center gap-1.5 text-xs font-bold text-muted">
          <span className="size-2 rounded-full bg-accent" />
          Cerebro Molero
        </Link>
      </header>
      <Assistant today={todayLocal()} autoPlanDate={isValidDate(plan) ? plan : null} />
      <div className="h-16" aria-hidden />
    </>
  );
}
