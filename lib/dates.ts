// Fechas de la agenda. Todo se calcula en la zona horaria de Javier, aunque el servidor esté en UTC.
// Las fechas "de calendario" se manejan como texto "YYYY-MM-DD"; los bloques se guardan como timestamptz.

export const TIME_ZONE = "Europe/Madrid";
const LOCALE = "es-ES";

function parts(date: Date): Record<string, string> {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  return Object.fromEntries(formatter.formatToParts(date).map((p) => [p.type, p.value]));
}

/** Diferencia en ms entre la hora local de TIME_ZONE y UTC en ese instante. */
function zoneOffset(date: Date): number {
  const p = parts(date);
  const asUtc = Date.UTC(
    Number(p.year),
    Number(p.month) - 1,
    Number(p.day),
    Number(p.hour),
    Number(p.minute),
    Number(p.second),
  );
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/** Convierte una fecha y hora locales ("2026-10-14", "16:00") al instante UTC correspondiente. */
export function zonedToUtc(date: string, time: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const guess = Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0);
  const first = guess - zoneOffset(new Date(guess));
  const second = guess - zoneOffset(new Date(first));
  return new Date(second);
}

export function toLocalDate(date: Date): string {
  const p = parts(date);
  return `${p.year}-${p.month}-${p.day}`;
}

export function todayLocal(): string {
  return toLocalDate(new Date());
}

export function isValidDate(value: string | undefined): value is string {
  return !!value && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Lunes de la semana de `date`. */
export function weekStart(date: string): string {
  const d = new Date(`${date}T12:00:00Z`);
  const weekday = (d.getUTCDay() + 6) % 7; // lunes = 0
  return addDays(date, -weekday);
}

export function weekDays(date: string): string[] {
  const start = weekStart(date);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

/** Número de semana ISO. */
export function isoWeek(date: string): number {
  const d = new Date(`${date}T12:00:00Z`);
  const day = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - day + 3);
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  return 1 + Math.round(((d.getTime() - firstThursday.getTime()) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
}

/** Rango UTC [inicio, fin) de un día local. */
export function dayRange(date: string): { start: string; end: string } {
  return {
    start: zonedToUtc(date, "00:00").toISOString(),
    end: zonedToUtc(addDays(date, 1), "00:00").toISOString(),
  };
}

export function formatTime(iso: string): string {
  return new Intl.DateTimeFormat(LOCALE, {
    timeZone: TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(iso));
}

function calendar(date: string, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat(LOCALE, { timeZone: "UTC", ...options }).format(new Date(`${date}T12:00:00Z`));
}

/** "miércoles, 14 de octubre" */
export function formatLongDate(date: string): string {
  return calendar(date, { weekday: "long", day: "numeric", month: "long" });
}

/** "mié 14 oct" */
export function formatShortDate(date: string): string {
  return calendar(date, { weekday: "short", day: "numeric", month: "short" }).replace(/\./g, "");
}

/** "L", "M", "X"… */
export function weekdayLetter(date: string): string {
  const letters = ["L", "M", "X", "J", "V", "S", "D"];
  const d = new Date(`${date}T12:00:00Z`);
  return letters[(d.getUTCDay() + 6) % 7] ?? "";
}

export function dayNumber(date: string): number {
  return Number(date.slice(8, 10));
}

/** Instante actual en ms (para componentes de servidor). */
export function nowMs(): number {
  return Date.now();
}

export function minutesBetween(fromIso: string, toIso: string): number {
  return Math.round((new Date(toIso).getTime() - new Date(fromIso).getTime()) / 60000);
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

/** Saludo según la hora local. */
export function greeting(now = new Date()): string {
  const hour = Number(parts(now).hour);
  if (hour < 14) return "Buenos días";
  if (hour < 21) return "Buenas tardes";
  return "Buenas noches";
}
