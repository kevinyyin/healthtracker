"use client";

export default function AppError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-16">
      <div className="card flex flex-col items-start gap-3 p-6">
        <p className="eyebrow">Reading Interrupted</p>
        <h1 className="text-xl font-semibold tracking-tight">Something didn&apos;t load</h1>
        <p className="text-sm text-foreground/70">
          This is usually a transient sync hiccup — your data is safe and will catch up on its own.
        </p>
        <button onClick={() => retry()} className="btn btn-primary btn-sm mt-2">
          Try again
        </button>
      </div>
    </main>
  );
}
