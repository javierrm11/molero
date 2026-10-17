import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

import { appUrl } from "@/lib/app-url";
import { requireUser } from "@/lib/auth";
import { saveGoogleAccount } from "@/lib/integrations/google";

export async function GET(request: NextRequest) {
  const { supabase, user } = await requireUser();
  const base = await appUrl();
  const jar = await cookies();
  const expected = jar.get("google_oauth_state")?.value;
  jar.delete("google_oauth_state");

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  if (!code || !state || state !== expected) return NextResponse.redirect(`${base}/ajustes?google=error`);

  try {
    await saveGoogleAccount(supabase, user.id, code, `${base}/api/google/callback`);
    return NextResponse.redirect(`${base}/ajustes?google=ok`);
  } catch (error) {
    console.error("[google] callback", error);
    return NextResponse.redirect(`${base}/ajustes?google=error`);
  }
}
