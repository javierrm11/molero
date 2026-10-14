import { TONES, type Tone } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function Badge({ tone = "grey", className, children }: { tone?: Tone; className?: string; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[10px] px-2.5 py-1 text-xs font-extrabold",
        TONES[tone].bg,
        TONES[tone].text,
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Dot({ tone = "grey", className }: { tone?: Tone; className?: string }) {
  return <span aria-hidden className={cn("inline-block size-2.5 shrink-0 rounded-full", TONES[tone].dot, className)} />;
}
