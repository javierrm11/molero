export function EmptyState({ title, text, children }: { title: string; text?: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-[26px] border-2 border-dashed border-line px-6 py-8 text-center">
      <p className="text-[15px] font-extrabold">{title}</p>
      {text ? <p className="text-sm text-muted">{text}</p> : null}
      {children}
    </div>
  );
}
