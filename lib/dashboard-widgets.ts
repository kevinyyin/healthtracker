export const WIDGET_CATALOG = [
  { key: "strain_ring", label: "Strain" },
  { key: "recovery_ring", label: "Recovery" },
  { key: "sleep_ring", label: "Sleep" },
  { key: "energy_bank", label: "Energy Bank" },
  { key: "workout_recommendation", label: "Target Strain" },
  { key: "bio_age", label: "Biological Age" },
  { key: "hrv", label: "HRV" },
  { key: "resting_hr", label: "Resting Heart Rate" },
  { key: "sleep_debt", label: "Sleep Debt" },
  { key: "energy_stress_chart", label: "Energy Bank & Stress Chart" },
] as const;

export type WidgetKey = (typeof WIDGET_CATALOG)[number]["key"];

/** Lean starting set for a first-run dashboard — the readings that matter for a daily
 * glance. The rest of WIDGET_CATALOG is available as an opt-in via Customize. */
export const DEFAULT_WIDGET_KEYS: WidgetKey[] = ["recovery_ring", "strain_ring", "sleep_ring", "workout_recommendation"];

export function isWidgetKey(value: string): value is WidgetKey {
  return WIDGET_CATALOG.some((w) => w.key === value);
}

export function widgetLabel(key: WidgetKey): string {
  return WIDGET_CATALOG.find((w) => w.key === key)?.label ?? key;
}
