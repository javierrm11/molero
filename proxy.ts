import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // Todo menos estáticos, iconos y el service worker.
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon|.*\.(?:svg|png|jpg|jpeg|webp|ico)$).*)",
  ],
};
