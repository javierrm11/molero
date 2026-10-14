"use client";

import { Check, Loader2, Plus, Sparkles } from "lucide-react";
import { useState, useTransition } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FORMATS, PILLARS, PLATFORMS } from "@/lib/constants";

import { addIdea, suggestTopics, type TopicIdea } from "./actions";

export function TopicSuggestions() {
  const [ideas, setIdeas] = useState<TopicIdea[]>([]);
  const [added, setAdded] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function load() {
    setError(null);
    startTransition(async () => {
      const res = await suggestTopics();
      if (res.error) setError(res.error);
      setIdeas(res.data ?? []);
      setAdded(new Set());
    });
  }

  function add(index: number, idea: TopicIdea) {
    startTransition(async () => {
      await addIdea(idea);
      setAdded((prev) => new Set(prev).add(index));
    });
  }

  return (
    <section className="flex flex-col gap-3">
      <Button variant="tint" size="lg" onClick={load} disabled={pending}>
        {pending && ideas.length === 0 ? <Loader2 className="size-[18px] animate-spin" aria-hidden /> : <Sparkles className="size-[18px]" aria-hidden />}
        {ideas.length > 0 ? "Sugerir otras" : "Sugerir temas con IA"}
      </Button>
      {error ? (
        <p role="alert" className="text-sm font-semibold text-danger">
          {error}
        </p>
      ) : null}
      {ideas.map((idea, i) => (
        <article key={`${idea.title}-${i}`} className="flex flex-col gap-2 rounded-[22px] bg-card p-4">
          <div className="flex items-start justify-between gap-2">
            <Badge tone={PILLARS[idea.pillar].tone}>{PILLARS[idea.pillar].label}</Badge>
            <Button
              size="sm"
              variant={added.has(i) ? "soft" : "primary"}
              disabled={added.has(i) || pending}
              onClick={() => add(i, idea)}
              aria-label={added.has(i) ? "Añadida" : `Añadir «${idea.title}» a ideas`}
            >
              {added.has(i) ? <Check className="size-4" aria-hidden /> : <Plus className="size-4" aria-hidden />}
              {added.has(i) ? "Añadida" : "Añadir"}
            </Button>
          </div>
          <p className="text-base font-extrabold leading-snug">{idea.title}</p>
          <p className="text-sm">“{idea.hook}”</p>
          <p className="text-[13px] text-muted">
            {FORMATS[idea.format]} · {idea.platforms.map((p) => PLATFORMS[p]).join(", ")} · {idea.why}
          </p>
        </article>
      ))}
    </section>
  );
}
