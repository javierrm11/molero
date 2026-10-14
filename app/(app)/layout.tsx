import { Suspense } from "react";

import { BottomNav } from "@/components/bottom-nav";
import { CaptureSheet } from "@/components/capture-sheet";
import { requireUser } from "@/lib/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  return (
    <>
      <main className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col gap-3.5 px-[18px] pt-[max(env(safe-area-inset-top),24px)] pb-[150px]">
        {children}
      </main>
      <Suspense>
        <CaptureSheet />
      </Suspense>
      <BottomNav />
    </>
  );
}
