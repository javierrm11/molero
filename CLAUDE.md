# CLAUDE.md

Guía para Claude Code en este repositorio.

## Proyecto

**Molero HQ**: PWA personal (un solo usuario) para gestionar la marca Molero: contenido, CRM ligero, revisión semanal y asistente IA con Gemini.

- **Fuente de verdad del producto:** [molero.md](molero.md). Ante cualquier duda de alcance, módulos, modelo de datos o estructura, consúltalo antes de decidir.
- **Estado actual:** v1 implementada (M0–M5) + M6 «Agenda y modo foco» + M7 panel de vida, M8 memoria y biblioteca, M9 revisión nocturna y M10 kit de marca. Diseño «Menta» (Manrope, gris salvia `#EDF2EF`, verde `#136F55`); los tokens están en `app/globals.css`.
- **Base de datos:** el esquema está en `migrations/1.sql` y `migrations/2.sql`. Los cambios de esquema van en una migración nueva (`migrations/2.sql`, …); no edites `1.sql` una vez aplicada.
- **Idioma:** la UI, los textos y la documentación van en **español**. El código (nombres de variables, funciones, tablas) en inglés, salvo las rutas de `app/(app)/`, que van en español (`contenido`, `crm`, `revision`, `asistente`, `cerebro`).

## Stack

- Next.js 16 (App Router, Turbopack) + TypeScript (strict). En Next 16 el middleware se llama `proxy.ts`, y `params`, `searchParams`, `cookies()` y `headers()` son asíncronos.
- Tailwind CSS 4 (tema en `@theme` de `app/globals.css`) + componentes estilo shadcn/ui en `components/ui/`
- Supabase: Postgres + Auth + Storage
- Gemini API (Flash para tareas rápidas, Pro para análisis)
- PWA con Serwist (`@serwist/turbopack`): `app/sw.ts` + ruta `app/serwist/[path]`, manifest en `app/manifest.ts`

## Reglas de arquitectura

- **Toda la IA pasa por `lib/ai/`** (`generate()`, `generateJson()`, `buildContext()`, prompts y esquemas). La transcripción de voz se hace en la misma llamada de la captura (audio adjunto). Ningún componente ni ruta llama a Gemini directamente; así cambiar de proveedor solo toca esa carpeta.
- **La API key de Gemini y la service role de Supabase nunca llegan al cliente.** Las llamadas a IA se hacen en *route handlers* (`app/api/ai/`) o *server actions*. Nada de `NEXT_PUBLIC_` para secretos.
- **`buildContext(tarea)`** junta el contexto estático (`brand_context`) con solo la parte del contexto dinámico relevante para la tarea (p. ej. un hook no necesita leads). Se envía como *system instruction*. En v1 no hay RAG: contexto completo inyectado.
- **Registrar cada llamada a la IA** en la tabla `ai_logs` (task, model, input_tokens, output_tokens).
- **RLS activado en todas las tablas** (`auth.uid()` = ID del usuario), aunque sea un solo usuario.
- Validar entradas con esquemas en `lib/validations/`.
- El modelo de datos de v1 está en §7 de molero.md. Respétalo; si hace falta cambiarlo, dilo explícitamente.
- Todas las tablas tienen `user_id` con default `auth.uid()`: en los inserts no hace falta pasarlo.
- Lectura de datos en Server Components con `requireUser()` (`lib/auth.ts`); escrituras con Server Actions en el `actions.ts` de cada ruta, validando con `lib/validations`.
- Fechas de la agenda: siempre con los helpers de `lib/dates.ts` (zona `Europe/Madrid`); los bloques se guardan en UTC (`timestamptz`).
- El cliente admin (service role, `lib/supabase/admin.ts`) solo se usa donde no hay sesión: `/api/focus/current`, `/api/library/save`, `/api/cron/*`, `/api/telegram/webhook` y el procesado en segundo plano de la memoria (`after()`). Ahí se filtra SIEMPRE por `user_id`.
- Las funciones compartidas entre la app y el cron reciben un `ServerScope` (`{ client, userId }`); en la app se obtiene con `sessionScope()` (`lib/auth.ts`). `buildContext(tarea, { scope })` y `generate*({ scope })` lo aceptan, y el uso de IA se registra con ese `user_id`.
- Embeddings con `embed()` (`gemini-embedding-2`, 768 dimensiones, prefijos de tarea en el texto); búsqueda con la función SQL `match_memory_chunks`.
- Integraciones externas en `lib/integrations/`, por REST y sin SDKs. Los tokens de Google van cifrados con `lib/crypto.ts`.

## Criterios de producto que afectan al código

- **Mobile-first.** Diseña primero para el móvil (iPhone con la PWA instalada) y luego amplía a escritorio.
- **Captura en menos de 30 segundos.** El botón de captura flotante está siempre visible; cualquier flujo de registro debe ser mínimo.
- **Modo foco e iPhone:** una PWA no puede bloquear apps. La integración va por URLs `shortcuts://run-shortcut` (`lib/focus.ts`) y el endpoint `/api/focus/current?token=` para las automatizaciones de Atajos. No prometas bloqueo real sin una app nativa.
- **No crezcas por crecer.** M7–M10 ya están; no implementes más de v2/v3 (push, webhook de ingesta de leads, métricas por API, formación) salvo que se pida. Sí deja hueco en el modelo de datos cuando molero.md lo indique.
- **Fuera de alcance:** parte pública, multiusuario, publicar automáticamente en redes, facturación.

## Privacidad

El contexto de la IA incluye datos de leads, correos de Gmail y documentos personales. Con estos módulos hace falta la clave de Gemini **con facturación**, porque en la capa gratuita Google puede usar los datos. Aun así, manda a la IA solo lo necesario: del correo, cabeceras y extracto, nunca el cuerpo completo.

## Comandos

```bash
npm run dev         # desarrollo
npm run build       # build de producción (incluye el service worker)
npm run lint        # ESLint (eslint-config-next)
npm run typecheck   # tsc --noEmit
npx next typegen    # regenera los tipos de rutas (.next/types)
```

Migraciones: ejecutar `migrations/N.sql` en el SQL Editor de Supabase. No hay tests todavía.

## Decisiones pendientes

No asumas una respuesta para estas; pregunta si bloquean el trabajo:

- Hosting: Vercel o Hetzner (Docker + Traefik).
- Gemini: capa gratuita o clave con facturación.
- Importar o no el histórico de contenido publicado.
- Nombre definitivo de la app.
- Rangos de precio del catálogo de servicios.
