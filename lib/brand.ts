import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { BrandKit } from "@/lib/types";

// Kit de marca: por defecto, el diseño Menta de la app.

export const DEFAULT_KIT: Omit<BrandKit, "user_id"> = {
  tone: ["Cercano", "Directo", "Sin postureo"],
  brand_values: ["Enseñar fácil", "Construir en público"],
  voice: "Explico como se lo contaría a un amigo de clase, con ejemplos reales de clientes.",
  colors: [
    { name: "Verde", hex: "#136F55" },
    { name: "Tinta", hex: "#14201B" },
    { name: "Salvia", hex: "#EDF2EF" },
    { name: "Menta", hex: "#9BE7C8" },
    { name: "Melocotón", hex: "#FDE7D7" },
  ],
  display_font: "Manrope",
  body_font: "Manrope",
  logo_text: "M",
};

export async function getBrandKit(client: SupabaseClient, userId: string): Promise<BrandKit> {
  const { data } = await client.from("brand_kit").select("*").eq("user_id", userId).maybeSingle();
  if (data) return data as BrandKit;
  return { user_id: userId, ...DEFAULT_KIT };
}

/** Color del kit por posición (0 principal, 1 oscuro, 2 fondo, 3 acento claro, 4 acento cálido). */
export function kitColor(kit: Pick<BrandKit, "colors">, index: number): string {
  return kit.colors[index]?.hex ?? DEFAULT_KIT.colors[index]?.hex ?? "#136F55";
}

const fontCache = new Map<string, ArrayBuffer>();

/** Descarga una fuente de Google Fonts en TTF (lo que necesita next/og). Devuelve null si falla. */
export async function loadGoogleFont(family: string, weight: number): Promise<ArrayBuffer | null> {
  const key = `${family}:${weight}`;
  const cached = fontCache.get(key);
  if (cached) return cached;
  try {
    const css = await (
      await fetch(`https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weight}`, {
        // Sin user-agent de navegador moderno, Google sirve TTF.
        headers: { "user-agent": "Mozilla/5.0 (compatible; MoleroHQ)" },
      })
    ).text();
    const url = /src:\s*url\(([^)]+)\)\s*format\('(?:truetype|opentype)'\)/.exec(css)?.[1];
    if (!url) return null;
    const font = await (await fetch(url)).arrayBuffer();
    fontCache.set(key, font);
    return font;
  } catch {
    return null;
  }
}
