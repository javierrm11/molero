import { ImageResponse } from "next/og";
import { NextResponse } from "next/server";

import { getBrandKit, kitColor, loadGoogleFont } from "@/lib/brand";
import { createClient } from "@/lib/supabase/server";
import type { BrandPiece, PieceFormat } from "@/lib/types";

// Renderiza una diapositiva de una pieza como PNG, con los colores y tipografías del kit de marca.

const SIZES: Record<PieceFormat, { width: number; height: number }> = {
  carousel: { width: 1080, height: 1350 },
  cover: { width: 1280, height: 720 },
  linkedin: { width: 1200, height: 1200 },
};

export async function GET(_: Request, { params }: { params: Promise<{ id: string; n: string }> }) {
  const { id, n } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Sesión caducada" }, { status: 401 });

  const { data } = await supabase.from("brand_pieces").select("*").eq("id", id).maybeSingle();
  const piece = data as BrandPiece | null;
  const index = Number(n) - 1;
  const slide = piece?.slides[index];
  if (!piece || !slide) return NextResponse.json({ error: "No existe" }, { status: 404 });

  const kit = await getBrandKit(supabase, auth.user.id);
  const [display, body] = await Promise.all([loadGoogleFont(kit.display_font, 800), loadGoogleFont(kit.body_font, 500)]);
  const fonts = [
    display && { name: "Display", data: display, weight: 800 as const, style: "normal" as const },
    body && { name: "Body", data: body, weight: 500 as const, style: "normal" as const },
  ].filter((f): f is NonNullable<typeof f> => !!f);

  const { width, height } = SIZES[piece.format];
  const scale = width / 1080;
  const primary = kitColor(kit, 0);
  const ink = kitColor(kit, 1);
  const ground = kitColor(kit, 2);
  const light = kitColor(kit, 3);
  const warm = kitColor(kit, 4);

  const theme =
    slide.kind === "hook"
      ? { bg: primary, fg: "#FFFFFF", accent: light, muted: "rgba(255,255,255,0.75)" }
      : slide.kind === "cta"
        ? { bg: warm, fg: ink, accent: primary, muted: ink }
        : { bg: index % 2 === 0 ? "#FFFFFF" : ground, fg: ink, accent: primary, muted: "#56635D" };

  const total = piece.slides.length;
  const lines = slide.kind === "list" && slide.body ? slide.body.split("\n").filter((l) => l.trim()) : [];
  const titleSize = Math.round((slide.kind === "hook" ? (piece.format === "cover" ? 96 : 92) : 64) * scale);

  return new ImageResponse(
    (
      <div
        style={{
          width,
          height,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 88 * scale,
          background: theme.bg,
          color: theme.fg,
          fontFamily: "Body",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 * scale, fontSize: 28 * scale, fontWeight: 800, fontFamily: "Display", color: theme.muted }}>
          <div
            style={{
              width: 56 * scale,
              height: 56 * scale,
              borderRadius: 16 * scale,
              background: slide.kind === "hook" ? "#FFFFFF" : primary,
              color: slide.kind === "hook" ? primary : "#FFFFFF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 30 * scale,
            }}
          >
            {kit.logo_text}
          </div>
          {total > 1 ? `MOLERO · ${index + 1}/${total}` : "MOLERO"}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 36 * scale }}>
          <div style={{ fontFamily: "Display", fontWeight: 800, fontSize: titleSize, lineHeight: 1.05, letterSpacing: -2 * scale }}>
            {slide.title}
          </div>
          {lines.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 22 * scale }}>
              {lines.map((line, i) => (
                <div key={i} style={{ display: "flex", gap: 22 * scale, fontSize: 40 * scale, lineHeight: 1.35 }}>
                  <div
                    style={{
                      width: 52 * scale,
                      height: 52 * scale,
                      flexShrink: 0,
                      borderRadius: 14 * scale,
                      background: theme.accent,
                      color: "#FFFFFF",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontFamily: "Display",
                      fontWeight: 800,
                      fontSize: 28 * scale,
                    }}
                  >
                    {i + 1}
                  </div>
                  <div style={{ display: "flex", flex: 1 }}>{line.replace(/^[-•\d.)\s]+/, "")}</div>
                </div>
              ))}
            </div>
          ) : slide.body ? (
            <div style={{ fontSize: 42 * scale, lineHeight: 1.4, color: theme.muted }}>{slide.body}</div>
          ) : null}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 28 * scale, color: theme.muted }}>
          <span>@molerodev</span>
          {index + 1 < total ? <span style={{ fontFamily: "Display", fontWeight: 800 }}>Desliza →</span> : <span />}
        </div>
      </div>
    ),
    { width, height, fonts: fonts.length > 0 ? fonts : undefined },
  );
}
