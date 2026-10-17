import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { appUrl } from "@/lib/app-url";
import { requireUser } from "@/lib/auth";
import { googleAuthUrl, isGoogleConfigured } from "@/lib/integrations/google";

export async function GET() {
  await requireUser();
  const base = await appUrl();
  if (!isGoogleConfigured()) return NextResponse.redirect(`${base}/ajustes?google=sin-configurar`);
  const state = crypto.randomUUID();
  (await cookies()).set("google_oauth_state", state, { httpOnly: true, secure: true, sameSite: "lax", maxAge: 600, path: "/" });
  return NextResponse.redirect(googleAuthUrl(`${base}/api/google/callback`, state));
}
