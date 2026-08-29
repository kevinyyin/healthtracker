interface AlarmWindow {
  wake_from: string;
  wake_to: string;
}

/**
 * Decides the exact wake time to fire the alarm within the user's wake window.
 * STUB: always returns wake_from (fire at the earliest possible moment). This is the
 * seam for a future pass that reads historical health_logs (see lib/analytics/) to
 * predict an optimal wake moment within [wake_from, wake_to] based on sleep-cycle
 * length. Callers must call only this function for the "which moment" decision —
 * never inline that logic elsewhere.
 */
export function pickWakeTime(alarm: AlarmWindow): string {
  return alarm.wake_from;
}
