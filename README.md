# Molero HQ

> Centro de mando personal de la marca **Molero**: agenda, contenido, ventas y crecimiento en una sola PWA, con una IA (Gemini) que conoce todo el contexto de la marca.

**Estado:** v1 implementada (M0–M5) más el módulo de agenda y modo foco (M6). Diseño «Menta».
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

2. **Crear el proyecto de Supabase** y ejecutar la migración [migrations/1.sql](migrations/1.sql) en el SQL Editor. Crea las tablas, las políticas RLS y el bucket privado `captures` para los audios.

3. **Crear tu usuario** en Supabase → Authentication → Users → *Add user* (email y contraseña). Después, desactiva los registros públicos (*Allow new users to sign up*), porque la app es de un solo usuario.

4. **Variables de entorno**: copia `.env.example` a `.env.local` y rellénalas.

   ```bash
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_ANON_KEY=
   SUPABASE_SERVICE_ROLE_KEY=   # solo servidor (endpoint de los Atajos de iOS)
   GEMINI_API_KEY=              # solo servidor, nunca en el cliente
   GEMINI_MODEL_FAST=gemini-flash-latest   # opcional
   GEMINI_MODEL_PRO=gemini-pro-latest      # opcional
   ```

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
    ajustes/          → Atajos de iOS, token, uso de IA
  foco/[id]/          → Modo foco a pantalla completa
  api/ai/capture/     → Captura por voz o texto → Gemini
  api/focus/current/  → Bloque actual para los Atajos de iOS (token)
  serwist/[path]/     → Service worker
  login/
lib/
  ai/                 → gemini.ts (generate, generateJson), context.ts (buildContext), prompts.ts
  supabase/           → clientes de servidor, admin y proxy de sesión
  validations/        → esquemas zod de los formularios
  constants.ts, dates.ts, focus.ts, data.ts, types.ts
components/           → UI compartida (Menta)
migrations/1.sql      → Esquema completo de Supabase
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
