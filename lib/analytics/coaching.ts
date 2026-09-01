import type { RecoveryResult } from "@/lib/analytics/recovery-score";
import type { SleepScoreResult } from "@/lib/analytics/sleep-score";
import type { SleepTargetResult } from "@/lib/analytics/sleep-debt";

const DEBT_ATTENTION_MINUTES = 60;

/**
 * One-sentence recovery guidance, tiered by score — same shape as
 * recommendTargetStrain (lib/analytics/day-strain.ts), just for the recovery number
 * rather than a strain range.
 */
export function recoveryGuidance(recovery: RecoveryResult): string {
  if (recovery.score == null) {
    return "Still building your recovery baseline — guidance will show up after a few more nights of data.";
  }
  if (recovery.score < 34) {
    return "Recovery is low today — favor rest or light movement over a hard effort.";
  }
  if (recovery.score < 67) {
    return "Recovery is moderate — a normal day of activity should feel fine.";
  }
  return "Recovery is high — your body looks well-primed for a harder effort today.";
}

/**
 * One-sentence sleep guidance, weighing both last night's Sleep Score and the
 * rolling sleep-debt figure (lib/analytics/sleep-debt.ts) — debt gets priority over a
 * middling score since it's the more actionable signal ("go to bed earlier tonight").
 */
export function sleepGuidance(sleepScore: SleepScoreResult, sleepTarget: SleepTargetResult): string {
  if (sleepScore.score == null) {
    return "Not enough sleep data yet for guidance — keep syncing.";
  }
  if (sleepTarget.debtMinutes > DEBT_ATTENTION_MINUTES) {
    const hours = (sleepTarget.debtMinutes / 60).toFixed(1);
    return `You're carrying about ${hours}h of sleep debt — try to get to bed earlier tonight.`;
  }
  if (sleepScore.score < 50) {
    return "Last night's sleep quality was low — it may show up in today's recovery.";
  }
  if (sleepScore.score < 75) {
    return "Last night's sleep was decent, with some room to improve.";
  }
  return "Last night's sleep was solid — a good foundation for today.";
}
