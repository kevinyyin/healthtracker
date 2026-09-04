export function CollapsibleSection({ summary, children }: { summary: string; children: React.ReactNode }) {
  return (
    <details className="group">
      <summary className="eyebrow flex cursor-pointer list-none items-center gap-1.5 select-none">
        {summary}
        <svg
          viewBox="0 0 12 12"
          className="h-3 w-3 transition-transform duration-200 group-open:rotate-90"
          aria-hidden="true"
        >
          <path d="M4 2l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </summary>
      <div className="mt-2">{children}</div>
    </details>
  );
}
