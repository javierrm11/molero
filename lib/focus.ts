import { BLOCK_TYPES } from "@/lib/constants";
import type { BlockType, Settings } from "@/lib/types";

// Integración con los modos de Concentración del iPhone a través de la app Atajos.
// Una PWA no puede activar la Concentración por sí sola, pero sí abrir un atajo con una URL
// `shortcuts://run-shortcut?name=…`; ese atajo activa el modo correspondiente.

export function shortcutUrl(name: string, input?: string): string {
  let url = `shortcuts://run-shortcut?name=${encodeURIComponent(name)}`;
  if (input) url += `&input=text&text=${encodeURIComponent(input)}`;
  return url;
}

export function focusShortcutName(settings: Pick<Settings, "focus_shortcuts"> | null, type: BlockType): string {
  return settings?.focus_shortcuts?.[type]?.trim() || BLOCK_TYPES[type].defaultShortcut;
}

export function focusOnUrl(settings: Settings | null, type: BlockType): string | null {
  if (!settings?.focus_enabled || type === "rest") return null;
  const name = focusShortcutName(settings, type);
  return name ? shortcutUrl(name) : null;
}

export function focusOffUrl(settings: Settings | null): string | null {
  if (!settings?.focus_enabled || !settings.focus_off_shortcut) return null;
  return shortcutUrl(settings.focus_off_shortcut);
}
