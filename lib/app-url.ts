import "server-only";

import { headers } from "next/headers";

/** URL pública de la app: APP_URL si está definida, si no la del request actual. */
export async function appUrl(): Promise<string> {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    if (host) return `${h.get("x-forwarded-proto") ?? "https"}://${host}`;
  } catch {
    // Fuera de un request (no debería pasar sin APP_URL).
  }
  return "http://localhost:3000";
}

/** Comprueba la cabecera de los cron (Vercel manda `Authorization: Bearer $CRON_SECRET`). */
export function isCronAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}
