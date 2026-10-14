# Molero HQ — Documento de producto

> Centro de mando personal de la marca **Molero**: contenido, ventas y crecimiento en una sola PWA, con una IA (Gemini) que conoce todo el contexto de la marca.

- **Autor / único usuario:** Javier Ruiz Molero
- **Estado:** v1 implementada + M6 (agenda y modo foco)
- **Fecha:** 12/10/2026
- **Nombre de trabajo:** Molero HQ (provisional)

---

## 1. Visión

Molero HQ no es "una app de marca personal", es el **sistema operativo de Molero**: el sitio donde vive todo lo que hago para conseguir audiencia y convertirla en ventas.

**Objetivo:** que con **3–4 horas a la semana** pueda mantener un sistema de contenido constante, hacer seguimiento de leads y clientes, y saber qué funciona, sin perder tiempo organizándome.

**Principios de producto:**

1. **Ahorra tiempo, no lo consume.** Si algo tarda más de 30 segundos en registrarse desde el móvil, está mal diseñado.
2. **Mobile-first.** Capturar desde el móvil y trabajar en profundidad desde el PC.
3. **La IA tiene contexto.** Cada respuesta de la IA sabe quién soy, qué vendo, cómo hablo y qué he publicado ya.
4. **v1 pequeña y usada a diario.** Antes que perfecta, que funcione y se use desde la primera semana.
5. **Solo para mí.** Sin parte pública, sin multiusuario y sin permisos.

---

## 2. Estrategia de marca (lo que la app tiene que servir)

### 2.1 Posicionamiento

**Molero — Full Stack + IA.**
Historia: *estudiante de Ingeniería Informática que ya construye webs y mete IA en empresas reales.* Aprendo en la uni y a la vez cobro por construir.

### 2.2 Públicos

| Público | Qué buscan | Qué me dan |
|---|---|---|
| Gente que aprende (estudiantes, juniors, curiosos de la IA) | Aprender programación e IA fácil | Audiencia, alcance y, en el futuro, venta de formación |
| Empresas y autónomos | Web a medida, automatizar o integrar IA | Ventas (ticket alto) |

El mismo contenido educativo sirve a ambos: a los que aprenden les enseña, y a las empresas les demuestra que sé.

### 2.3 Pilares de contenido

1. **Enseñar:** programación e IA explicadas fácil (carruseles, shorts, vídeos largos).
2. **Construir en público:** proyectos de clientes, productos propios, lo que funciona y lo que falla.
3. **Vida de estudiante y dev:** vlogs de la carrera en la UCO y el día a día.

### 2.4 Rol de cada red

| Red | Seguidores (oct 2026) | Rol |
|---|---|---|
| LinkedIn | ~2.700 | **Ventas y oportunidades.** Prioridad para servicios B2B |
| TikTok (@molerodev) | ~1.400 | Alcance |
| YouTube | ~430 | Profundidad y confianza (vídeo largo + Shorts) |
| Instagram | ~130 | Reutilización, mínimo esfuerzo |

### 2.5 Monetización

**Fase 1 (ahora): servicios.**
- Webs a medida.
- Integración de IA y automatizaciones para empresas.
- Creativos publicitarios con IA.

**Fase 2 (con audiencia): formación.**
Escalera: contenido gratis → comunidad o newsletter → producto barato (plantillas, mini-curso) → mentoría o curso.

> La app se diseña para la Fase 1, pero el modelo de datos deja hueco para la Fase 2.

---

## 3. Alcance por versiones

### v1 — MVP (objetivo: usable en 3–4 semanas de desarrollo)

| Módulo | Qué resuelve |
|---|---|
| **M0. Contexto de marca (Cerebro Molero)** | La base de conocimiento que alimenta a la IA |
| **M1. Captura rápida** | Apuntar ideas en segundos desde el móvil (voz o texto) |
| **M2. Pipeline de contenido** | De idea a publicado, con calendario |
| **M3. CRM ligero** | Leads, clientes y seguimientos |
| **M4. Revisión semanal** | Métricas a mano, objetivos y resumen con IA |
| **M5. Asistente IA** | Generar, adaptar y analizar con contexto completo |
| **M6. Agenda y modo foco** | Organizar el día en bloques y hacer solo lo que toca (Concentración del iPhone) |

### v2

- Reutilización automática: un contenido genera sus versiones (carrusel, post de LinkedIn, guion de short, caption de Instagram).
- Ingesta automática de leads desde la automatización semanal (n8n o tarea programada) vía webhook.
- Notificaciones push: recordatorios de publicar, seguimientos de leads pendientes y revisión semanal.
- Propuestas y presupuestos generados con IA a partir del catálogo de servicios.
- Atribución: de qué red viene cada lead o cliente.

### v3

- Integraciones de métricas vía API donde se pueda (YouTube Data API primero; TikTok e Instagram si las APIs lo permiten).
- Módulo de formación: productos, mentorías y lead magnets.
- RAG con embeddings (pgvector) si el contexto crece demasiado.
- Reactivar o conectar con Guionia si vuelve a moverse.

**Fuera de alcance (de momento):** parte pública, multiusuario, publicar automáticamente en redes, facturación.

---

## 4. Módulos en detalle

### M0. Contexto de marca — "Cerebro Molero"

El corazón de la app. Es un conjunto de **documentos de contexto editables** que la IA recibe en cada petición.

**Contexto estático** (lo edito yo, cambia poco):

| Sección | Contenido |
|---|---|
| `quien_soy` | Bio, historia, formación (CFGS DAW, especialización en IA y Big Data, 1º de Ingeniería Informática en la UCO), stack |
| `posicionamiento` | Propuesta de valor, públicos, diferenciación |
| `tono_y_estilo` | Cómo hablo, palabras que uso y que no, formato de hooks y CTAs, reglas fijas (p. ej. hashtags en TikTok) |
| `pilares` | Pilares de contenido y series activas |
| `servicios` | Catálogo, qué incluye cada servicio, rangos de precio, casos de éxito |
| `productos` | Productos propios y su estado (CitasWassap, Prezu, Guionia en pausa…) |
| `redes` | Handles, rol de cada red, seguidores actuales |
| `objetivos` | Objetivos del trimestre |

**Contexto dinámico** (lo genera la app desde la base de datos):

- Últimos N contenidos publicados, con su tema, plataforma y rendimiento.
- Temas ya tratados, para no repetirlos.
- Leads y clientes activos, con su estado.
- Última revisión semanal.

**Funcionamiento:**

1. Cada petición a la IA llama a `buildContext(tarea)`.
2. Esa función junta el contexto estático con la parte del contexto dinámico relevante para esa tarea. Por ejemplo, para un hook no hacen falta los leads.
3. El resultado se envía a Gemini como *system instruction*, junto con la petición.
4. La ventana de contexto de Gemini es grande, así que en la v1 basta con **inyectar contexto completo**, sin RAG. Si en algún momento no cabe o sale caro, se pasa a embeddings (v3).

**Extra:** botón **"Actualizar contexto"**. Le pegas texto suelto (una nota, una conversación, un cambio de precios) y la IA te propone qué sección actualizar. Tú confirmas.

### M1. Captura rápida

- Botón flotante siempre visible, también como atajo de la PWA en la pantalla de inicio.
- **Voz:** se graba con `MediaRecorder` y se envía el audio a Gemini, que es multimodal. Gemini transcribe y estructura en un solo paso: título, pilar sugerido, plataforma sugerida y borrador del hook.
- **Texto:** campo único y la IA clasifica.
- **Tipos de captura:** idea de contenido, lead o contacto, tarea, o nota de contexto para el Cerebro.
- Todo cae en una **bandeja de entrada** que se procesa en la revisión semanal.

### M2. Pipeline de contenido

- **Tablero kanban:** `Idea → Guion → Grabado → Editado → Publicado`.
- Cada contenido tiene: título, pilar, serie, formato (carrusel, short, vídeo largo, post), plataformas, guion, hook, CTA, fecha prevista, fecha publicada, links y métricas.
- **Calendario** semanal y mensual.
- **Registro de temas usados:** evita repetir y alimenta a la IA.
- **Acciones con IA:**
  - Idea → guion con hook, desarrollo y CTA.
  - 10 hooks alternativos.
  - Adaptar a LinkedIn, TikTok, YouTube o Instagram.
  - Sugerir temas nuevos según pilares, temas usados y lo que mejor ha funcionado.

### M3. CRM ligero

- **Leads:** nombre o empresa, sector, ciudad, origen (LinkedIn, TikTok, puerta fría, referido…), servicio de interés, estado, próximo paso y fecha de seguimiento.
- **Estados:** `Nuevo → Contactado → Interesado → Propuesta → Ganado / Perdido`.
- **Interacciones:** registro rápido de cada contacto (llamada, mensaje, reunión).
- **Clientes y proyectos:** cliente, servicio, importe, estado y fechas.
- **Catálogo de servicios**, que se comparte con el Cerebro.
- **"Hoy toca":** lista de seguimientos pendientes en la pantalla de inicio.
- **IA:** redactar el mensaje de primer contacto o de seguimiento, con el contexto del lead y de mis servicios.

### M4. Revisión semanal (15 minutos)

Un flujo guiado cada domingo o lunes:

1. **Métricas:** seguidores y alcance por red, apuntados a mano en un formulario rápido.
2. **Bandeja de entrada:** procesar las capturas de la semana.
3. **Resultados:** contenido publicado frente a lo planificado, y leads contactados frente al objetivo.
4. **Resumen IA:** qué funcionó, qué no y qué repetir.
5. **Plan:** objetivos y contenidos de la semana siguiente.

### M5. Asistente IA

- Chat con el contexto completo de Molero.
- **Acciones rápidas predefinidas** (prompts guardados): "post de LinkedIn de este proyecto", "ideas para la semana", "mensaje de seguimiento", "resume mi mes".
- Registro de uso (tokens por petición) para controlar el gasto.

### M6. Agenda y modo foco

- **Agenda por bloques (time blocking):** cada bloque tiene tipo (`estudiar`, `clase`, `grabar`, `editar`, `directo`, `subir`, `ventas`, `gestión`, `descanso`), horario y, opcionalmente, un contenido o un lead enlazado.
- **Plantillas de día:** «Día de clase», «Día de grabación», «Día de ventas»…
- **Organízame el día con IA:** Gemini propone los bloques a partir del pipeline, los seguimientos y lo que ya hay en la agenda; Javier los aplica con un toque.
- **Modo foco:** pantalla completa con solo la tarea actual, cuenta atrás, checklist del tipo de bloque y la pantalla siempre encendida. Al terminar un bloque enlazado, el contenido avanza en el pipeline (grabar → Grabado, editar → Editado, subir → Publicado).
- **Concentración del iPhone:** al empezar un bloque se abre el atajo `Molero Foco <Tipo>` (`shortcuts://run-shortcut`), que activa ese modo de Concentración. Al terminarlo se abre `Molero Foco Off`. Una automatización de Atajos «Al abrir Instagram/TikTok» consulta `/api/focus/current?token=…` y avisa de lo que toca. Es lo más cerca de «solo poder hacer eso» que permite una PWA; el bloqueo real necesitaría una app nativa con la API de Screen Time.

---

## 5. Pantalla de inicio (móvil)

1. **Hoy:** contenido que toca publicar y seguimientos de leads pendientes.
2. **Objetivos de la semana:** progreso (p. ej. 3/5 contenidos, 4/10 contactos).
3. **Bandeja de entrada:** número de capturas sin procesar.
4. **Botón de captura** flotante.

---

## 6. Stack técnico

| Capa | Elección | Motivo |
|---|---|---|
| Framework | **Next.js (App Router) + TypeScript** | Mi stack habitual |
| UI | Tailwind + shadcn/ui | Rapidez |
| Base de datos y auth | **Supabase** (Postgres + Auth + Storage) | Ya lo he usado; RLS sencillo para un solo usuario |
| IA | **Gemini API** (modelo Flash para lo rápido, Pro para análisis) | Multimodal (audio), contexto largo, coste bajo |
| PWA | Manifest + service worker (Serwist) | Instalable en iPhone, offline básico |
| Push | Web Push (iOS 16.4+ con la PWA instalada) | Recordatorios (v2) |
| Hosting | Vercel o el servidor Hetzner (Docker + Traefik) | A elegir |
| Automatizaciones | n8n (Hetzner) → webhook `/api/ingest` | Ingesta de leads (v2) |

### Notas sobre la IA

- **Capa de abstracción:** toda la IA pasa por `lib/ai/` (`generate()`, `transcribe()`, `buildContext()`). Si mañana se cambia de proveedor, solo se toca ahí.
- **La API key nunca va al cliente:** las llamadas se hacen desde *route handlers* o *server actions*.
- **Privacidad:** el contexto incluye datos de leads y clientes. Hay que revisar los términos de la capa gratuita de Gemini, porque Google puede usar los datos de los servicios no de pago para mejorar sus productos. Para datos de clientes, mejor una clave con facturación activa o no enviar datos personales de leads.
- **Control de gasto:** registrar los tokens en la tabla `ai_logs` y fijar un límite de presupuesto en Google Cloud.

---

## 7. Modelo de datos (v1)

```
brand_context        id, section, content (markdown), updated_at
captures             id, type (idea|lead|task|context), raw_text, audio_url,
                     processed (bool), result_ref, created_at
contents             id, title, pillar, series, format, platforms[], status,
                     hook, script, cta, planned_at, published_at, links (jsonb),
                     metrics (jsonb), created_at
leads                id, name, company, sector, city, source, service_interest,
                     status, next_step, follow_up_at, notes, created_at
interactions         id, lead_id, type (call|message|meeting|email), summary, date
clients              id, lead_id (nullable), name, company, contact, created_at
projects             id, client_id, service_id, title, amount, status, start_at, end_at
services             id, name, description, price_from, price_to, active
goals                id, week_start, metric, target, actual
weekly_reviews       id, week_start, metrics (jsonb), wins, losses, ai_summary, plan
ai_logs              id, task, model, input_tokens, output_tokens, created_at
time_blocks          id, start_at, end_at, type, title, content_id, lead_id, status,
                     checklist (jsonb), notes, started_at, finished_at        (M6)
block_templates      id, name, blocks (jsonb)                                 (M6)
settings             user_id, focus_token, focus_shortcuts (jsonb),
                     focus_off_shortcut, focus_enabled                         (M6)
```

Un solo usuario, pero con RLS activado en todas las tablas (`auth.uid()` = mi ID) por seguridad.
Todas las tablas llevan `user_id` (default `auth.uid()`) para las políticas, y `captures` añade `title` y `ai` (jsonb). SQL completo en `migrations/1.sql`.

---

## 8. Estructura de carpetas (orientativa)

```
app/
  (app)/
    page.tsx              → Inicio
    contenido/            → Pipeline + calendario
    crm/                  → Leads, clientes, proyectos
    revision/             → Revisión semanal
    asistente/            → Chat IA
    cerebro/              → Contexto de marca
  api/
    ai/                   → Endpoints de IA
    ingest/               → Webhook de automatizaciones (v2)
lib/
  ai/                     → generate, transcribe, buildContext, prompts
  supabase/
  validations/
components/
public/
  manifest.json
  icons/
```

---

## 9. Rutina semanal con la app (3–4 h)

| Momento | Tiempo | Qué |
|---|---|---|
| Domingo o lunes | 15 min | Revisión semanal + plan |
| Bloque de creación | 2 h | Guiones con IA, grabación y edición en lote |
| Bloque de ventas | 45 min | Seguimientos del CRM + contactos nuevos (LinkedIn y puerta fría) |
| Día a día | 1–2 min | Capturas desde el móvil |

---

## 10. Plan de desarrollo v1

| Semana | Entregable |
|---|---|
| 1 | Setup (Next.js, Supabase, auth, PWA instalable), modelo de datos, **Cerebro** (M0) con `buildContext` |
| 2 | **Captura rápida** (texto + voz con Gemini) y bandeja de entrada, **Pipeline** (kanban + calendario) |
| 3 | **CRM** (leads, interacciones, clientes, servicios) + pantalla de inicio |
| 4 | **Revisión semanal**, **Asistente IA** con acciones rápidas, pulido móvil |

**Criterio de "v1 terminada":** la uso durante dos semanas seguidas para planificar el contenido y llevar los leads, sin volver a notas sueltas.

---

## 11. Decisiones tomadas

- [x] App solo para uso personal, sin parte pública.
- [x] Marca: **Molero**.
- [x] Tiempo disponible: 3–4 h por semana.
- [x] Usuario único (de momento).
- [x] IA: **Gemini API**, con contexto completo de la marca.
- [x] Guionia en pausa; la app cubre lo básico de contenido.
- [x] Prioridad de venta: **servicios primero** (asumido; formación en fase 2).

## 12. Preguntas abiertas

- [ ] ¿Hosting en Vercel o en el Hetzner propio?
- [ ] ¿Capa gratuita de Gemini o clave con facturación (por la privacidad de los datos de clientes)?
- [ ] ¿Importar el histórico de contenido ya publicado (carruseles, vídeos) para que la IA lo tenga desde el día 1?
- [ ] Nombre definitivo de la app.
- [ ] Rangos de precio de cada servicio para el catálogo.