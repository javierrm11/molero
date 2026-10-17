# Molero HQ

> Centro de mando personal de la marca **Molero**: agenda, contenido, ventas y crecimiento en una sola PWA, con una IA (Gemini) que conoce todo el contexto de la marca.

**Estado:** v1 implementada (M0–M5), agenda y modo foco (M6) y los módulos M7–M10: panel de vida, memoria y biblioteca, revisión nocturna y kit de marca. Diseño «Menta».
La especificación completa está en [molero.md](molero.md).

---

## Qué es

Molero HQ es el "sistema operativo" de la marca personal Molero (Full Stack + IA): el sitio donde se organiza el día, se planifica el contenido, se hace seguimiento de leads y clientes y se mide qué funciona, todo en **3–4 horas a la semana**.

Es una app **de uso personal**: un solo usuario, sin parte pública y sin multiusuario.

## Módulos

| Módulo | Ruta | Qué resuelve |
|---|---|---|
| **M0. Cerebro Molero** | `/cerebro` | Contexto de marca que la IA recibe en cada petición, con «Actualizar contexto» por IA |
| **M1. Captura rápida** | botón `+` · `/bandeja` | Ideas, leads, tareas o contexto por voz o texto; Gemini transcribe y clasifica |
| **M2. Pipeline de contenido** | `/contenido` | Estados `Idea → Guion → Grabado → Editado → Publicado`, calendario mensual, guion, hooks y adaptación con IA |
| **M3. CRM ligero** | `/crm` | Leads, interacciones, «Hoy toca», mensajes con IA, clientes, proyectos y servicios |
| **M4. Revisión semanal** | `/revision` | Métricas, bandeja, resultados, resumen con IA y plan con objetivos |
| **M5. Asistente IA** | `/asistente` | Chat con contexto completo y acciones rápidas («Organízame mañana» aplica bloques a la agenda) |
| **M6. Agenda y modo foco** | `/agenda` · `/foco/[id]` | Día en bloques, plantillas y modo foco a pantalla completa que activa la Concentración del iPhone |
| **M7. Panel de vida** | Inicio · `/resumen` | Google Calendar, Gmail y Tasks en el inicio, y resumen matinal con IA enviado por Telegram |
| **M8. Memoria y biblioteca** | `/memoria` · `/biblioteca` | PDFs, notas, webs y vídeos indexados con embeddings (pgvector); preguntas con fuentes citadas |
| **M9. Revisión nocturna** | `/noche` · `/semana` | Check-in de cada noche con feedback de la IA e informe semanal de hábitos con un solo cambio |
| **M10. Kit de marca** | `/marca` · `/marca/piezas` | Tono, colores y tipografías; generador de carruseles y portadas en PNG a partir de un guion |

## Stack

| Capa | Tecnología |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) + TypeScript strict |
| UI | Tailwind CSS 4 + componentes estilo shadcn/ui (`components/ui`) + lucide |
| Datos y auth | Supabase (Postgres + Auth + Storage, con RLS) |
| IA | Gemini API vía `@google/genai` (Flash para lo rápido, Pro para análisis) |
| PWA | Manifest + service worker con Serwist (`@serwist/turbopack`) |
| Hosting | Vercel o Hetzner (Docker + Traefik), por decidir |

## Puesta en marcha

1. **Instalar dependencias**

   ```bash
   npm install
   ```

2. **Crear el proyecto de Supabase** y ejecutar en el SQL Editor, en orden, [migrations/1.sql](migrations/1.sql) y [migrations/2.sql](migrations/2.sql). Crean las tablas, las políticas RLS, `pgvector` y los buckets privados `captures` (audios) y `memory` (PDFs).

3. **Crear tu usuario** en Supabase → Authentication → Users → *Add user* (email y contraseña). Después, desactiva los registros públicos (*Allow new users to sign up*), porque la app es de un solo usuario.

4. **Variables de entorno**: copia `.env.example` a `.env.local` y rellénalas.

   ```bash
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_ANON_KEY=
   SUPABASE_SERVICE_ROLE_KEY=   # solo servidor (endpoint de los Atajos de iOS)
   GEMINI_API_KEY=              # solo servidor, nunca en el cliente
   GEMINI_MODEL_FAST=gemini-flash-latest   # opcional
   GEMINI_MODEL_PRO=gemini-pro-latest      # opcional
   APP_URL=https://tu-dominio.com          # OAuth, Telegram y enlaces
   ```

   Los módulos M7–M10 usan más variables (Google, Telegram, cron); están todas explicadas en `.env.example`.

5. **Arrancar**

   ```bash
   npm run dev
   ```

   En el iPhone, abre la URL desplegada en Safari → Compartir → *Añadir a pantalla de inicio*. El service worker solo se activa en producción.

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción (genera también `serwist/sw.js`) |
| `npm start` | Sirve el build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript sin emitir |

## Integraciones (M7–M10)

- **Google** (panel de vida y resumen): crea un cliente OAuth «Aplicación web» en Google Cloud con las APIs de Calendar, Gmail y Tasks activadas. Redirect URI: `$APP_URL/api/google/callback`. Pon la pantalla de consentimiento **en producción** aunque no esté verificada: en modo «Testing» Google caduca el acceso cada 7 días. Después, Ajustes → Conectar Google. Los tokens se guardan cifrados con `TOKEN_ENCRYPTION_KEY`.
- **Telegram**: crea un bot con @BotFather, rellena `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME` y `TELEGRAM_WEBHOOK_SECRET`, y en Ajustes pulsa «Activar webhook» y luego «Abrir el bot y vincular». Lo que le escribas al bot va a la bandeja.
- **Cron**: `vercel.json` programa `/api/cron/morning` a las 05:30 UTC y `/api/cron/night` a las 20:00 UTC (7:30 y 22:00 en horario de verano de Madrid; una hora antes en invierno). Fuera de Vercel, llama a esas rutas desde n8n con la cabecera `Authorization: Bearer $CRON_SECRET`.
- **Atajo «Guardar en Molero»**: desde el menú Compartir de iOS manda enlaces a `/api/library/save?token=…`. Los pasos están en Ajustes.
- **Procesado en segundo plano**: la memoria se indexa con `after()` y el cliente admin, así que necesita `SUPABASE_SERVICE_ROLE_KEY`. Sin ella, se procesa en el momento y la subida tarda más.

## Concentración del iPhone

Una PWA no puede bloquear otras apps, así que el modo foco se apoya en los modos de Concentración de iOS y en la app Atajos:

- **Al empezar un bloque** (`/foco/[id]`), la app abre `shortcuts://run-shortcut?name=Molero Foco <Tipo>`. Ese atajo activa el modo Concentración de ese tipo de bloque.
- **Al terminarlo**, la app abre el atajo `Molero Foco Off`, que desactiva la Concentración.
- **Bloqueo de distracciones**: con una automatización de Atajos del tipo *Al abrir una app* (Instagram, TikTok…), el atajo consulta `GET /api/focus/current?token=…`. Si toca otra cosa, te avisa con el mensaje y vuelve a la pantalla de inicio.

Los nombres de los atajos, el token y los pasos detallados están en **Ajustes** (`/ajustes`).

## Estructura

```
app/
  (app)/              → Pantallas con barra de navegación (requieren sesión)
    page.tsx          → Inicio: bloque actual, después, hoy toca, objetivos
    agenda/           → Día en bloques, plantillas, editar bloque
    contenido/        → Pipeline, calendario, ficha con IA
    crm/              → Leads, ficha de lead, clientes, servicios
    bandeja/          → Capturas sin procesar
    revision/         → Revisión semanal en 5 pasos
    asistente/        → Chat IA y planificación del día
    cerebro/          → Contexto de marca
    resumen/          → Resumen matinal
    memoria/          → Segundo cerebro: fuentes, preguntas y ficha
    biblioteca/       → Lo que ves y lees
    semana/           → Informe semanal de hábitos
    marca/            → Kit de marca y generador de piezas
    ajustes/          → Google, Telegram, atajos de iOS, token, uso de IA
  foco/[id]/          → Modo foco a pantalla completa
  noche/              → Revisión nocturna (pantalla completa)
  api/ai/capture/     → Captura por voz o texto → Gemini
  api/focus/current/  → Bloque actual para los Atajos de iOS (token)
  api/memory/upload/  → Alta de PDFs, notas y enlaces en la memoria
  api/library/save/   → Atajo «Guardar en Molero» (token)
  api/cron/           → Resumen matinal y revisión nocturna
  api/telegram/       → Webhook del bot
  api/google/         → OAuth de Google
  api/piezas/         → PNG de las piezas con el kit de marca
  serwist/[path]/     → Service worker
  login/
lib/
  ai/                 → gemini.ts (generate, generateJson, embed), context.ts (buildContext), prompts.ts
  integrations/       → google.ts (OAuth, Calendar, Gmail, Tasks), telegram.ts
  memory.ts, briefing.ts, coach.ts, brand.ts
  supabase/           → clientes de servidor, admin y proxy de sesión
  validations/        → esquemas zod de los formularios
  constants.ts, dates.ts, focus.ts, data.ts, types.ts
components/           → UI compartida (Menta)
migrations/           → 1.sql (v1 + agenda) y 2.sql (M7–M10)
vercel.json           → Crons del resumen matinal y la revisión nocturna
proxy.ts              → Refresca la sesión y protege las rutas
```

## Preguntas abiertas

- Hosting: ¿Vercel o Hetzner propio?
- Gemini: ¿capa gratuita o clave con facturación (privacidad de datos de clientes)?
- ¿Importar el histórico de contenido publicado para la IA desde el día 1?
- Nombre definitivo de la app.
- Rangos de precio del catálogo de servicios.

---

Autor: Javier Ruiz Molero
