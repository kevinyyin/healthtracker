export function EmptyState({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-[1.25rem] border border-dashed border-[var(--border)] px-6 py-16 text-center">
      <p className="font-medium">{title}</p>
      <p className="max-w-sm text-sm text-foreground/60">{hint}</p>
    </div>
  );
}
