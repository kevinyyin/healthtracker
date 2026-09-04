import { DEFAULT_MAX_HR, hrZone } from "@/lib/analytics/day-strain";

export interface EnergyMinute {
  minute: string;
  bpm: number | null;
  activeCalories: number | null;
}

export interface BatteryPoint {
  minute: string;
  battery: number;
}

const ZONE_DRAIN_PER_MINUTE = 0.028;
const CALORIE_DRAIN_FACTOR = 0.01;
const REST_REGEN_PER_MINUTE = 0.01;
const DEFAULT_START_BATTERY = 70;

/**
 * Simulates battery level through the day: drains based on HR-zone intensity and
 * active calorie burn, with a small regen during low-HR rest periods. `startBattery`
 * should be the morning's Recovery Score, or the neutral default if none yet.
 */
export function computeEnergyBank(
  timeline: EnergyMinute[],
  startBattery: number = DEFAULT_START_BATTERY,
  maxHr: number = DEFAULT_MAX_HR,
): BatteryPoint[] {
  let battery = Math.min(100, Math.max(0, startBattery));
  const points: BatteryPoint[] = [];

  for (const minute of timeline) {
    const zone = minute.bpm != null ? hrZone(minute.bpm, maxHr) : 0;

    if (zone === 0) {
      battery += REST_REGEN_PER_MINUTE;
    } else {
      const zoneDrain = zone * ZONE_DRAIN_PER_MINUTE;
      const calorieDrain = (minute.activeCalories ?? 0) * CALORIE_DRAIN_FACTOR;
      battery -= zoneDrain + calorieDrain;
    }

    battery = Math.min(100, Math.max(0, battery));
    points.push({ minute: minute.minute, battery: Math.round(battery * 10) / 10 });
  }

  return points;
}
