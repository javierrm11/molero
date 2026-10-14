"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

import { Button, type ButtonProps } from "@/components/ui/button";

export function CopyButton({ text, label = "Copiar", ...props }: { text: string; label?: string } & ButtonProps) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="soft"
      size="sm"
      {...props}
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
      {copied ? "Copiado" : label}
    </Button>
  );
}
