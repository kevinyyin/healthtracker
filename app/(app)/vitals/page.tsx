import { requireUser } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";
import { EmptyState } from "@/components/empty-state";

const METRIC_LABELS: Record<string, string> = {
  heart_rate: "Heart rate",
  hrv: "HRV",
  spo2: "SpO2",
  respiratory_rate: "Respiratory rate",
};

export default async function VitalsPage() {
  const { supabase, user } = await requireUser();

  const { data: readings } = await supabase
    .from("vitals_readings")
    .select("id, metric_type, recorded_at, value, unit")
    .eq("user_id", user.id)
    .order("recorded_at", { ascending: false })
    .limit(100);

  if (!readings || readings.length === 0) {
    return (
      <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-16">
        <h1 className="text-2xl font-semibold">Vitals</h1>
        <EmptyState
          title="No vitals data yet"
          hint="Once your Fitbit is connected and syncing, heart rate and other vitals will show up here."
        />
      </main>
    );
  }

  const latestByMetric = new Map<string, (typeof readings)[number]>();
  for (const reading of readings) {
    if (!latestByMetric.has(reading.metric_type)) {
      latestByMetric.set(reading.metric_type, reading);
    }
  }

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-8 px-4 py-16">
      <h1 className="text-2xl font-semibold">Vitals</h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {[...latestByMetric.values()].map((reading) => (
          <div key={reading.metric_type} className="rounded border border-black/[.08] p-4 dark:border-white/[.145]">
            <p className="text-sm text-foreground/60">{METRIC_LABELS[reading.metric_type] ?? reading.metric_type}</p>
            <p className="text-2xl font-semibold tabular-nums">
              {reading.value ?? "—"} <span className="text-sm font-normal">{reading.unit}</span>
            </p>
            <p className="text-xs text-foreground/60">{formatDateTime(reading.recorded_at)}</p>
          </div>
        ))}
      </div>

      <section>
        <h2 className="mb-2 font-medium">Recent readings</h2>
        <ul className="flex flex-col divide-y divide-black/[.08] dark:divide-white/[.145]">
          {readings.slice(0, 30).map((reading) => (
            <li key={reading.id} className="flex items-center justify-between py-2 text-sm">
              <span>{METRIC_LABELS[reading.metric_type] ?? reading.metric_type}</span>
              <span className="text-foreground/60">{formatDateTime(reading.recorded_at)}</span>
              <span className="tabular-nums">
                {reading.value ?? "—"} {reading.unit}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
