import { requireUser } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";
import { EmptyState } from "@/components/empty-state";
import { MetricCard } from "@/components/metric-card";

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
        <div>
          <p className="eyebrow mb-1">Biometrics</p>
          <h1 className="text-3xl font-semibold tracking-tight">Vitals</h1>
        </div>
        <div className="divider -mt-4" />
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
      <div>
        <p className="eyebrow mb-1">Biometrics</p>
        <h1 className="text-3xl font-semibold tracking-tight">Vitals</h1>
      </div>
      <div className="divider -mt-4" />

      <div className="stagger-children grid grid-cols-2 gap-4 sm:grid-cols-3">
        {[...latestByMetric.values()].map((reading) => (
          <MetricCard
            key={reading.metric_type}
            label={METRIC_LABELS[reading.metric_type] ?? reading.metric_type}
            value={`${reading.value ?? "-"} ${reading.unit}`}
            sub={formatDateTime(reading.recorded_at)}
          />
        ))}
      </div>

      <section>
        <h2 className="eyebrow mb-2">Recent readings</h2>
        <ul className="flex flex-col divide-y divide-[var(--border)]">
          {readings.slice(0, 30).map((reading) => (
            <li key={reading.id} className="flex items-center justify-between py-2 text-sm">
              <span>{METRIC_LABELS[reading.metric_type] ?? reading.metric_type}</span>
              <span className="text-foreground/60">{formatDateTime(reading.recorded_at)}</span>
              <span className="figure">
                {reading.value ?? "-"} {reading.unit}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
