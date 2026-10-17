"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Refresca la página cada pocos segundos mientras haya algo procesándose. */
export function AutoRefresh({ active, every = 4000 }: { active: boolean; every?: number }) {
  const router = useRouter();
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => router.refresh(), every);
    return () => clearInterval(timer);
  }, [active, every, router]);
  return null;
}
