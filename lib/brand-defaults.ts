import type { BrandSection } from "@/lib/types";

// Contenido inicial del Cerebro Molero, sacado de molero.md. Se crea la primera vez que se abre la app
// y a partir de ahí se edita desde /cerebro.

export const BRAND_DEFAULTS: Record<BrandSection, string> = {
  quien_soy: `Javier Ruiz Molero (marca: **Molero**).
Estudiante de 1º de Ingeniería Informática en la UCO (Córdoba). Antes: CFGS DAW y especialización en IA y Big Data.
Construyo webs y meto IA en empresas reales mientras estudio: aprendo en la uni y a la vez cobro por construir.
Stack habitual: Next.js, TypeScript, Supabase, Tailwind, n8n, Docker.`,

  posicionamiento: `**Molero — Full Stack + IA.**
Historia: estudiante de Ingeniería Informática que ya construye webs y mete IA en empresas reales.

Públicos:
- Gente que aprende (estudiantes, juniors, curiosos de la IA): quieren aprender programación e IA fácil. Dan audiencia y alcance.
- Empresas y autónomos: quieren web a medida, automatizar o integrar IA. Dan ventas (ticket alto).

El mismo contenido educativo sirve a los dos: a los que aprenden les enseña, a las empresas les demuestra que sé.`,

  tono_y_estilo: `- Cercano, directo y sin postureo. Explico fácil, con ejemplos del día a día.
- Hooks cortos que plantean un problema o una contradicción.
- CTA claro al final (seguir, comentar o escribirme si tienes un negocio).
- [Añade aquí palabras que uso y que no, y reglas fijas por red, p. ej. hashtags en TikTok.]`,

  pilares: `1. **Enseñar**: programación e IA explicadas fácil (carruseles, shorts, vídeos largos).
2. **Construir en público**: proyectos de clientes, productos propios, lo que funciona y lo que falla.
3. **Vida de estudiante y dev**: vlogs de la carrera en la UCO y el día a día.`,

  servicios: `Fase 1 (ahora): servicios.
- Web a medida. Precio: [RANGO].
- Integración de IA y automatizaciones para empresas. Precio: [RANGO].
- Creativos publicitarios con IA. Precio: [RANGO].

Fase 2 (con audiencia): formación. Escalera: contenido gratis → comunidad o newsletter → producto barato → mentoría o curso.`,

  productos: `- CitasWassap: [estado]
- Prezu: [estado]
- Guionia: en pausa.`,

  redes: `- LinkedIn (~2.700): ventas y oportunidades. Prioridad para servicios B2B.
- TikTok @molerodev (~1.400): alcance.
- YouTube (~430): profundidad y confianza (vídeo largo + Shorts).
- Instagram (~130): reutilización, mínimo esfuerzo.`,

  objetivos: `Objetivos del trimestre:
- 5 contenidos por semana.
- 10 contactos nuevos por semana (LinkedIn y puerta fría).
- [Objetivo de ventas del trimestre]`,
};
