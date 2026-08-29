export function EmptyState({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded border border-dashed border-black/[.12] px-6 py-16 text-center dark:border-white/[.15]">
      <p className="font-medium">{title}</p>
      <p className="max-w-sm text-sm text-foreground/60">{hint}</p>
    </div>
  );
}
