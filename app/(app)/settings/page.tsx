import { requireUser } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>;
}) {
  const { connected, error } = await searchParams;
  const { supabase, user } = await requireUser();

  const [{ data: tokenRow }, { data: lastSync }] = await Promise.all([
    supabase.from("google_oauth_tokens").select("updated_at").eq("user_id", user.id).maybeSingle(),
    supabase
      .from("sync_log")
      .select("started_at, finished_at, status, domains, error")
      .eq("user_id", user.id)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  return (
    <main className="mx-auto flex max-w-md flex-col gap-6 px-4 py-16">
      <h1 className="text-2xl font-semibold">Settings</h1>

      {connected === "1" && (
        <p className="rounded bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-950 dark:text-green-400">
          Google Health connected.
        </p>
      )}
      {error && (
        <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
          Connection failed ({error}). Please try again.
        </p>
      )}

      <section className="flex flex-col gap-2 rounded border border-black/[.08] p-4 dark:border-white/[.145]">
        <h2 className="font-medium">Google Health</h2>
        {tokenRow ? (
          <p className="text-sm text-foreground/60">
            Connected. Last token refresh {formatDateTime(tokenRow.updated_at)}.
          </p>
        ) : (
          <p className="text-sm text-foreground/60">Not connected yet.</p>
        )}
        <a
          href="/api/auth/google"
          className="mt-2 inline-block w-fit rounded bg-foreground px-4 py-2 text-sm text-background"
        >
          {tokenRow ? "Reconnect" : "Connect Google Health"}
        </a>
      </section>

      <section className="flex flex-col gap-2 rounded border border-black/[.08] p-4 dark:border-white/[.145]">
        <h2 className="font-medium">Last sync</h2>
        {lastSync ? (
          <div className="flex flex-col gap-1 text-sm text-foreground/60">
            <p>
              {formatDateTime(lastSync.started_at)} — {lastSync.status}
            </p>
            {lastSync.domains ? <p>{JSON.stringify(lastSync.domains)}</p> : null}
            {lastSync.error ? <p className="text-red-600 dark:text-red-400">{lastSync.error}</p> : null}
          </div>
        ) : (
          <p className="text-sm text-foreground/60">No syncs have run yet.</p>
        )}
      </section>
    </main>
  );
}
