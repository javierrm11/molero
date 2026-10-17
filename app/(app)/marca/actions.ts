"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { buildContext } from "@/lib/ai/context";
import { aiErrorMessage, generateJson } from "@/lib/ai/gemini";
import { BRAND_FONTS, BRAND_KIT_PROMPT, brandKitSchema, piecePrompt, pieceSchema, type BrandKitAi } from "@/lib/ai/prompts";
import { sessionScope } from "@/lib/auth";
import { FORMATS, PILLARS, PLATFORMS } from "@/lib/constants";
import type { Content, PieceFormat, Slide } from "@/lib/types";

const list = (value: FormDataEntryValue | null) =>
  String(value ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 6);

export async function saveKit(_: unknown, form: FormData): Promise<{ ok?: boolean; error?: string }> {
  const colors = [0, 1, 2, 3, 4].map((i) => ({
    name: String(form.get(`color_name_${i}`) ?? "").trim().slice(0, 30) || `Color ${i + 1}`,
    hex: String(form.get(`color_hex_${i}`) ?? "#000000"),
  }));
  if (colors.some((c) => !/^#[0-9A-Fa-f]{6}$/.test(c.hex))) return { error: "Algún color no es válido." };
  const display = String(form.get("display_font"));
  const body = String(form.get("body_font"));
  const fonts = BRAND_FONTS as readonly string[];
  if (!fonts.includes(display) || !fonts.includes(body)) return { error: "Tipografía no válida." };

  const { client, userId } = await sessionScope();
  const { error } = await client.from("brand_kit").upsert({
    user_id: userId,
    tone: list(form.get("tone")),
    brand_values: list(form.get("brand_values")),
    voice: String(form.get("voice") ?? "").trim().slice(0, 500) || null,
    colors,
    display_font: display,
    body_font: body,
    logo_text: String(form.get("logo_text") ?? "M").trim().slice(0, 3) || "M",
  });
  if (error) return { error: "No se ha podido guardar el kit." };
  revalidatePath("/marca");
  return { ok: true };
}

export async function proposeKit(): Promise<{ data?: BrandKitAi; error?: string }> {
  try {
    const scope = await sessionScope();
    const kit = await generateJson({
      task: "brand_kit",
      tier: "pro",
      scope,
      system: await buildContext("brand_kit", { scope }),
      prompt: BRAND_KIT_PROMPT,
      schema: brandKitSchema,
    });
    return { data: kit };
  } catch (error) {
    return { error: aiErrorMessage(error) };
  }
}

export async function applyKitProposal(kit: BrandKitAi): Promise<{ error?: string }> {
  const parsed = brandKitSchema.safeParse(kit);
  if (!parsed.success) return { error: "Propuesta no válida." };
  const { client, userId } = await sessionScope();
  const { error } = await client.from("brand_kit").upsert({ user_id: userId, ...parsed.data });
  if (error) return { error: "No se ha podido guardar." };
  revalidatePath("/marca");
  return {};
}

const PIECE_FORMATS: PieceFormat[] = ["carousel", "cover", "linkedin"];

export async function createPiece(_: unknown, form: FormData): Promise<{ error?: string }> {
  const contentId = String(form.get("content_id") ?? "");
  const format = String(form.get("format")) as PieceFormat;
  if (!PIECE_FORMATS.includes(format)) return { error: "Formato no válido." };
  const scope = await sessionScope();
  const { data } = await scope.client.from("contents").select("*").eq("id", contentId).maybeSingle();
  const content = data as Content | null;
  if (!content) return { error: "Elige un contenido." };

  let pieceId: string;
  try {
    const result = await generateJson({
      task: "piece",
      tier: "fast",
      scope,
      system: await buildContext("piece", { scope }),
      prompt: piecePrompt(format, {
        title: content.title,
        pillar: content.pillar ? PILLARS[content.pillar].label : null,
        format: content.format ? FORMATS[content.format] : null,
        platforms: content.platforms.map((p) => PLATFORMS[p]),
        hook: content.hook,
        script: content.script,
        cta: content.cta,
      }),
      schema: pieceSchema,
    });
    const slides = format === "carousel" ? result.slides : result.slides.slice(0, 1);
    const { data: piece, error } = await scope.client
      .from("brand_pieces")
      .insert({ content_id: content.id, format, title: result.title || content.title, slides })
      .select("id")
      .single();
    if (error || !piece) return { error: "No se ha podido guardar la pieza." };
    pieceId = piece.id;
  } catch (error) {
    return { error: aiErrorMessage(error) };
  }
  revalidatePath("/marca/piezas");
  redirect(`/marca/piezas/${pieceId}`);
}

export async function updateSlides(id: string, _: unknown, form: FormData): Promise<{ ok?: boolean; error?: string }> {
  const { client } = await sessionScope();
  const { data } = await client.from("brand_pieces").select("slides").eq("id", id).single();
  const slides = ((data?.slides ?? []) as Slide[]).map((s, i) => ({
    ...s,
    title: String(form.get(`title_${i}`) ?? s.title).slice(0, 200),
    body: String(form.get(`body_${i}`) ?? s.body ?? "").slice(0, 600) || null,
  }));
  const { error } = await client.from("brand_pieces").update({ slides }).eq("id", id);
  if (error) return { error: "No se ha podido guardar." };
  revalidatePath(`/marca/piezas/${id}`);
  return { ok: true };
}

export async function deletePiece(id: string) {
  const { client } = await sessionScope();
  await client.from("brand_pieces").delete().eq("id", id);
  revalidatePath("/marca/piezas");
  redirect("/marca/piezas");
}
