import { requireUser } from "@/lib/supabase/server";
import { formatDateTime, formatDate } from "@/lib/format";
import { daysBefore, localDayEndIso, localDayStartIso, todayLocalDateString } from "@/lib/date";
import { getUserTimezone } from "@/lib/timezone";
import { getUserUnitSystem, formatWeight, fromKg } from "@/lib/units";
import { toNum } from "@/lib/numeric";
import { EmptyState } from "@/components/empty-state";
import { CollapsibleSection } from "@/components/collapsible-section";
import { MetricCard } from "@/components/metric-card";
import { HrHistoryChart } from "@/components/charts/hr-history-chart";
import { MetricTrendChart, type TrendPoint } from "@/components/charts/metric-trend-chart";
import { WeightDrawer } from "@/components/vitals/weight-drawer";

const METRIC_LABELS: Record<string, string> = {
  heart_rate: "Heart rate",
  hrv: "HRV",
  spo2: "SpO2",
  respiratory_rate: "Respiratory rate",
  weight: "Weight",
};

const WEIGHT_HISTORY_DAYS = 365;

const HR_HISTORY_DAY_COUNT = 7;

export default async function VitalsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date: dateParam } = await searchParams;
  const { supabase, user } = await requireUser();
  const timezone = await getUserTimezone(supabase, user.id);
  const today = todayLocalDateString(timezone);

  const dayOptions = Array.from({ length: HR_HISTORY_DAY_COUNT }, (_, i) => daysBefore(today, i));
  const selectedDate = dateParam && dayOptions.includes(dateParam) ? dateParam : today;

  const [{ data: readings }, { data: hrRows }, { data: weightRows }, unitSystem] = await Promise.all([
    supabase
      .from("vitals_readings")
      .select("id, metric_type, recorded_at, value, unit")
      .eq("user_id", user.id)
      .order("recorded_at", { ascending: false })
      .limit(100),
    supabase
      .from("intraday_hr")
      .select("recorded_at, bpm")
      .eq("user_id", user.id)
      .gte("recorded_at", localDayStartIso(selectedDate, timezone))
      .lt("recorded_at", localDayEndIso(selectedDate, timezone))
      .order("recorded_at", { ascending: true }),
    supabase
      .from("vitals_readings")
      .select("recorded_at, value")
      .eq("user_id", user.id)
      .eq("metric_type", "weight")
      .gte("recorded_at", localDayStartIso(daysBefore(today, WEIGHT_HISTORY_DAYS), timezone))
      .order("recorded_at", { ascending: true }),
    getUserUnitSystem(supabase, user.id),
  ]);

  const weightPoints = (weightRows ?? [])
    .map((r) => ({ recorded_at: r.recorded_at, kg: toNum(r.value) }))
    .filter((r): r is { recorded_at: string; kg: number } => r.kg != null);

  const hrPoints = (hrRows ?? [])
    .map((r) => ({ recorded_at: r.recorded_at, bpm: toNum(r.bpm) }))
    .filter((r): r is { recorded_at: string; bpm: number } => r.bpm != null);

  if ((!readings || readings.length === 0) && hrPoints.length === 0 && weightPoints.length === 0) {
    return (
      <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-16">
        <div>
          <p className="eyebrow mb-1">Biometrics</p>
          <h1 className="text-3xl font-semibold tracking-tight">Vitals</h1>
        </div>
        <div className="divider -mt-4" />
        <EmptyState
          title="No vitals data yet"
          hint="Once your Google Health account is connected and syncing, heart rate and other vitals will show up here."
        />
      </main>
    );
  }

  // Weight is excluded from this generic per-metric grid: its raw `unit` column is
  // always 'kg' (see lib/actions/body-metrics.ts), so the generic "${value} ${unit}"
  // rendering below would ignore the user's imperial preference. It gets its own
  // section instead, using formatWeight.
  const latestByMetric = new Map<string, NonNullable<typeof readings>[number]>();
  for (const reading of readings ?? []) {
    if (reading.metric_type === "weight") continue;
    if (!latestByMetric.has(reading.metric_type)) {
      latestByMetric.set(reading.metric_type, reading);
    }
  }

  const latestWeightKg = weightPoints.length > 0 ? weightPoints[weightPoints.length - 1].kg : null;
  const weightTrendPoints: TrendPoint[] = weightPoints.map((p) => ({
    date: formatDate(p.recorded_at),
    value: Number(fromKg(p.kg, unitSystem).toFixed(1)),
  }));

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-8 px-4 py-16">
      <div>
        <p className="eyebrow mb-1">Biometrics</p>
        <h1 className="text-3xl font-semibold tracking-tight">Vitals</h1>
      </div>
      <div className="divider -mt-4" />

      {latestByMetric.size > 0 && (
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
      )}

      <section className="card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="eyebrow">Body Weight</h2>
          <WeightDrawer today={today} unitSystem={unitSystem} />
        </div>
        {latestWeightKg == null ? (
          <p className="text-sm text-foreground/70">No weight logged yet.</p>
        ) : (
          <>
            <p className="figure mb-3 text-2xl font-semibold">{formatWeight(latestWeightKg, unitSystem)}</p>
            {weightTrendPoints.length > 1 && <MetricTrendChart data={weightTrendPoints} label="Weight" />}
          </>
        )}
      </section>

      <section className="card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="eyebrow">Heart Rate History</h2>
        </div>
        <div className="mb-3 flex flex-wrap gap-1">
          {dayOptions.map((date) => (
            <a
              key={date}
              href={`/vitals?date=${date}`}
              className={`chip ${date === selectedDate ? "chip-active" : ""}`}
            >
              {date === today ? "Today" : formatDayChipLabel(date)}
            </a>
          ))}
        </div>
        {hrPoints.length === 0 ? (
          <p className="text-sm text-foreground/70">No intraday heart rate data for this day.</p>
        ) : (
          <HrHistoryChart points={hrPoints} />
        )}
      </section>

      {readings && readings.filter((r) => r.metric_type !== "weight").length > 0 && (
        <CollapsibleSection
          summary={`Recent readings (${readings.filter((r) => r.metric_type !== "weight").length})`}
        >
          <ul className="flex flex-col divide-y divide-[var(--border)]">
            {readings
              .filter((r) => r.metric_type !== "weight")
              .slice(0, 30)
              .map((reading) => (
                <li key={reading.id} className="flex items-center justify-between py-2 text-sm">
                  <span>{METRIC_LABELS[reading.metric_type] ?? reading.metric_type}</span>
                  <span className="text-foreground/60">{formatDateTime(reading.recorded_at)}</span>
                  <span className="figure">
                    {reading.value ?? "-"} {reading.unit}
                  </span>
                </li>
              ))}
          </ul>
        </CollapsibleSection>
      )}
    </main>
  );
}

function formatDayChipLabel(dateString: string): string {
  return new Date(`${dateString}T12:00:00`).toLocaleDateString(undefined, { weekday: "short" });
}
