import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth";

import { AskMemory } from "../ask-memory";

export const metadata = { title: "Pregunta a tu memoria" };

export default async function AskPage() {
  const { supabase } = await requireUser();
  const { count } = await supabase.from("memory_sources").select("id", { count: "exact", head: true }).eq("status", "ready");

  return (
    <>
      <PageHeader title="Pregúntale a tu memoria" eyebrow={`Busca en ${count ?? 0} fuentes`} back="/memoria" />
      <AskMemory
        suggestions={["¿Qué pongo en mi CV para unas prácticas de IA?", "¿Qué aprendí sobre embeddings?", "Resume mis apuntes de bases de datos"]}
      />
      <div className="h-16" aria-hidden />
    </>
  );
}
