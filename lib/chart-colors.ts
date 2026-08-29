export const SLEEP_STAGE_COLORS = {
  deep: "#1d4ed8",
  rem: "#3b82f6",
  light: "#93c5fd",
  awake: "#94a3b8",
} as const;

export const BATTERY_COLOR = "#2563eb";
export const STRESS_COLOR = "#f59e0b";

export const RING_COLORS = {
  strain: STRESS_COLOR,
  recovery: "var(--color-success)",
  sleep: BATTERY_COLOR,
} as const;
