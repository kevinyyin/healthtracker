const SIZE = 96;
const STROKE = 8;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

interface ScoreRingProps {
  value: number | null;
  display: string;
  label: string;
  sub?: string;
  color: string;
}

export function ScoreRing({ value, display, label, sub, color }: ScoreRingProps) {
  const fraction = value == null ? 0 : Math.max(0, Math.min(1, value));
  const dash = CIRCUMFERENCE * fraction;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: SIZE, height: SIZE }}>
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="-rotate-90">
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            strokeWidth={STROKE}
            className="stroke-black/[.08] dark:stroke-white/[.145]"
          />
          {/* A zero-length dash still paints a round-cap dot, so skip the arc entirely at 0%. */}
          {dash > 0 && (
            <circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              strokeWidth={STROKE}
              strokeLinecap="round"
              strokeDasharray={`${dash} ${CIRCUMFERENCE}`}
              style={{ stroke: color }}
            />
          )}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center text-lg font-semibold tabular-nums">
          {display}
        </div>
      </div>
      <div className="flex flex-col items-center text-center">
        <p className="text-sm text-foreground/60">{label}</p>
        {sub && <p className="text-xs text-foreground/50">{sub}</p>}
      </div>
    </div>
  );
}
