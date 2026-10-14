import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export function PageHeader({
  title,
  eyebrow,
  back,
  action,
}: {
  title: string;
  eyebrow?: string;
  back?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="flex items-center gap-3 px-1">
      {back ? (
        <Link
          href={back}
          aria-label="Volver"
          className="flex size-11 shrink-0 items-center justify-center rounded-[16px] bg-card text-ink"
        >
          <ChevronLeft className="size-5" aria-hidden />
        </Link>
      ) : null}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        {eyebrow ? <span className="text-[13px] font-semibold text-muted">{eyebrow}</span> : null}
        <h1 className="truncate text-[26px] font-extrabold tracking-[-0.6px]">{title}</h1>
      </div>
      {action}
    </header>
  );
}
