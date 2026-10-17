import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { decrypt, encrypt } from "@/lib/crypto";
import { addDays, dayRange } from "@/lib/dates";
import type { GoogleAccount } from "@/lib/types";

// Integración con Google (Calendar, Gmail y Tasks) por REST, sin SDK.
// Solo se piden permisos de lectura, salvo Tasks (para marcar tareas como hechas).

export const GOOGLE_SCOPES = [
  "openid",
  "email",
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/tasks",
];

export class GoogleAuthError extends Error {}

function credentials() {
  const id = process.env.GOOGLE_CLIENT_ID;
  const secret = process.env.GOOGLE_CLIENT_SECRET;
  if (!id || !secret) throw new GoogleAuthError("Faltan GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET.");
  return { id, secret };
}

export function isGoogleConfigured(): boolean {
  return !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET && !!process.env.TOKEN_ENCRYPTION_KEY;
}

export function googleAuthUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: credentials().id,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: GOOGLE_SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

interface TokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
  id_token?: string;
  error?: string;
}

async function tokenRequest(body: Record<string, string>): Promise<TokenResponse> {
  const { id, secret } = credentials();
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: id, client_secret: secret, ...body }),
    cache: "no-store",
  });
  const json = (await res.json()) as TokenResponse;
  if (!res.ok || json.error) throw new GoogleAuthError(json.error ?? `Google respondió ${res.status}`);
  return json;
}

/** Intercambia el código del callback y guarda la cuenta (tokens cifrados). */
export async function saveGoogleAccount(client: SupabaseClient, userId: string, code: string, redirectUri: string) {
  const token = await tokenRequest({ code, redirect_uri: redirectUri, grant_type: "authorization_code" });
  if (!token.refresh_token) throw new GoogleAuthError("Google no ha devuelto refresh token. Quita el acceso en tu cuenta y vuelve a conectar.");
  let email = "cuenta de Google";
  if (token.id_token) {
    const payload = JSON.parse(Buffer.from(token.id_token.split(".")[1] ?? "", "base64url").toString("utf8")) as { email?: string };
    email = payload.email ?? email;
  }
  const { error } = await client.from("google_accounts").upsert({
    user_id: userId,
    email,
    refresh_token: encrypt(token.refresh_token),
    access_token: encrypt(token.access_token),
    expires_at: new Date(Date.now() + token.expires_in * 1000).toISOString(),
    scopes: (token.scope ?? "").split(" ").filter(Boolean),
    connected_at: new Date().toISOString(),
  });
  if (error) throw error;
  return email;
}

export async function getGoogleAccount(client: SupabaseClient, userId: string): Promise<GoogleAccount | null> {
  const { data } = await client.from("google_accounts").select("*").eq("user_id", userId).maybeSingle();
  return (data as GoogleAccount | null) ?? null;
}

/** Access token válido, refrescándolo si ha caducado. */
export async function getAccessToken(client: SupabaseClient, account: GoogleAccount): Promise<string> {
  if (account.access_token && account.expires_at && new Date(account.expires_at).getTime() > Date.now() + 60_000) {
    return decrypt(account.access_token);
  }
  let token: TokenResponse;
  try {
    token = await tokenRequest({ refresh_token: decrypt(account.refresh_token), grant_type: "refresh_token" });
  } catch (error) {
    throw new GoogleAuthError(
      error instanceof GoogleAuthError && error.message === "invalid_grant"
        ? "Google ha revocado el acceso. Vuelve a conectar la cuenta en Ajustes."
        : "No se ha podido renovar el acceso a Google.",
    );
  }
  await client
    .from("google_accounts")
    .update({ access_token: encrypt(token.access_token), expires_at: new Date(Date.now() + token.expires_in * 1000).toISOString() })
    .eq("user_id", account.user_id);
  return token.access_token;
}

export async function revokeGoogle(client: SupabaseClient, userId: string) {
  const account = await getGoogleAccount(client, userId);
  if (account) {
    await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(decrypt(account.refresh_token))}`, {
      method: "POST",
    }).catch(() => {});
  }
  await client.from("google_accounts").delete().eq("user_id", userId);
}

async function gget<T>(token: string, url: string): Promise<T> {
  const res = await fetch(url, { headers: { authorization: `Bearer ${token}` }, cache: "no-store" });
  if (res.status === 401) throw new GoogleAuthError("Acceso a Google caducado.");
  if (!res.ok) throw new Error(`Google ${res.status}: ${await res.text()}`);
  return (await res.json()) as T;
}

// ── Calendar ────────────────────────────────────────────────

export interface CalendarEvent {
  id: string;
  title: string;
  start: string; // ISO, o fecha si es de todo el día
  end: string;
  allDay: boolean;
  location: string | null;
  meet: string | null;
}

export async function listEvents(token: string, date: string): Promise<CalendarEvent[]> {
  const range = dayRange(date);
  const params = new URLSearchParams({
    timeMin: range.start,
    timeMax: range.end,
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "25",
  });
  const data = await gget<{
    items?: {
      id: string;
      summary?: string;
      status?: string;
      start?: { dateTime?: string; date?: string };
      end?: { dateTime?: string; date?: string };
      location?: string;
      hangoutLink?: string;
    }[];
  }>(token, `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`);
  return (data.items ?? [])
    .filter((e) => e.status !== "cancelled")
    .map((e) => ({
      id: e.id,
      title: e.summary ?? "(Sin título)",
      start: e.start?.dateTime ?? e.start?.date ?? "",
      end: e.end?.dateTime ?? e.end?.date ?? addDays(date, 1),
      allDay: !e.start?.dateTime,
      location: e.location ?? null,
      meet: e.hangoutLink ?? null,
    }));
}

// ── Gmail ───────────────────────────────────────────────────

export interface EmailSummary {
  id: string;
  from: string;
  subject: string;
  snippet: string;
  date: string;
}

/** Correos sin leer de la bandeja principal de los últimos días (solo cabeceras y extracto). */
export async function listImportantEmails(token: string, max = 15): Promise<{ total: number; emails: EmailSummary[] }> {
  const params = new URLSearchParams({ q: "is:unread category:primary newer_than:2d", maxResults: String(max) });
  const list = await gget<{ messages?: { id: string }[]; resultSizeEstimate?: number }>(
    token,
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?${params}`,
  );
  const emails = await Promise.all(
    (list.messages ?? []).map(async ({ id }) => {
      const msg = await gget<{
        snippet?: string;
        internalDate?: string;
        payload?: { headers?: { name: string; value: string }[] };
      }>(token, `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject`);
      const header = (name: string) => msg.payload?.headers?.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? "";
      return {
        id,
        from: header("From").replace(/<[^>]+>/, "").replace(/"/g, "").trim() || "Desconocido",
        subject: header("Subject") || "(Sin asunto)",
        snippet: (msg.snippet ?? "").replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&"),
        date: msg.internalDate ? new Date(Number(msg.internalDate)).toISOString() : "",
      };
    }),
  );
  return { total: list.resultSizeEstimate ?? emails.length, emails };
}

// ── Tasks ───────────────────────────────────────────────────

export interface GoogleTask {
  id: string;
  title: string;
  due: string | null;
  notes: string | null;
}

export async function listTasks(token: string): Promise<GoogleTask[]> {
  const data = await gget<{ items?: { id: string; title?: string; due?: string; notes?: string; status?: string }[] }>(
    token,
    "https://tasks.googleapis.com/tasks/v1/lists/@default/tasks?showCompleted=false&maxResults=30",
  );
  return (data.items ?? [])
    .filter((t) => t.title?.trim())
    .map((t) => ({ id: t.id, title: t.title ?? "", due: t.due ? t.due.slice(0, 10) : null, notes: t.notes ?? null }))
    .sort((a, b) => (a.due ?? "9999").localeCompare(b.due ?? "9999"));
}

export async function completeTask(token: string, taskId: string) {
  const res = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/@default/tasks/${encodeURIComponent(taskId)}`, {
    method: "PATCH",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ status: "completed" }),
  });
  if (!res.ok) throw new Error(`Google Tasks ${res.status}`);
}

// ── Panel de vida ───────────────────────────────────────────

export interface LifePanel {
  connected: boolean;
  configured: boolean;
  email: string | null;
  events: CalendarEvent[];
  emails: EmailSummary[];
  unread: number;
  tasks: GoogleTask[];
  error: string | null;
}

/** Junta calendario, correo y tareas de hoy. Nunca lanza: los errores vuelven en `error`. */
export async function getLifePanel(client: SupabaseClient, userId: string, date: string): Promise<LifePanel> {
  const empty: LifePanel = {
    connected: false,
    configured: isGoogleConfigured(),
    email: null,
    events: [],
    emails: [],
    unread: 0,
    tasks: [],
    error: null,
  };
  if (!empty.configured) return empty;
  const account = await getGoogleAccount(client, userId);
  if (!account) return empty;
  try {
    const token = await getAccessToken(client, account);
    const [events, mail, tasks] = await Promise.all([
      listEvents(token, date).catch(() => [] as CalendarEvent[]),
      listImportantEmails(token).catch(() => ({ total: 0, emails: [] as EmailSummary[] })),
      listTasks(token).catch(() => [] as GoogleTask[]),
    ]);
    return { ...empty, connected: true, email: account.email, events, emails: mail.emails, unread: mail.total, tasks };
  } catch (error) {
    return {
      ...empty,
      connected: true,
      email: account.email,
      error: error instanceof GoogleAuthError ? error.message : "No se ha podido leer Google ahora mismo.",
    };
  }
}
