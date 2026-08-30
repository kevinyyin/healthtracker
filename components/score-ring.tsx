const SIZE = 112;
const STROKE = 6;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const TICK_RADIUS = SIZE / 2 - 1;
const TICK_LENGTH = 4;
// Four fine brass ticks at the compass points — the ring's "instrument dial" detail.
const TICK_ANGLES = [0, 90, 180, 270];

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

  const accessibleName = `${label}: ${display}${sub ? `, ${sub}` : ""}`;

  return (
    <div className="flex flex-col items-center gap-3" role="group" aria-label={accessibleName}>
      <div
        className="relative"
        aria-hidden="true"
        style={{
          width: SIZE,
          height: SIZE,
          background: `radial-gradient(circle at 50% 50%, color-mix(in oklab, ${color} 22%, transparent) 0%, transparent 72%)`,
        }}
      >
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="-rotate-90">
          <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" strokeWidth={STROKE} stroke="var(--border)" />
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
          {TICK_ANGLES.map((deg) => {
            const rad = (deg * Math.PI) / 180;
            const cx = SIZE / 2 + TICK_RADIUS * Math.cos(rad);
            const cy = SIZE / 2 + TICK_RADIUS * Math.sin(rad);
            const x2 = SIZE / 2 + (TICK_RADIUS - TICK_LENGTH) * Math.cos(rad);
            const y2 = SIZE / 2 + (TICK_RADIUS - TICK_LENGTH) * Math.sin(rad);
            return (
              <line
                key={deg}
                x1={cx}
                y1={cy}
                x2={x2}
                y2={y2}
                stroke="var(--brass)"
                strokeWidth={1}
                strokeLinecap="round"
                opacity={0.55}
              />
            );
          })}
        </svg>
        <div className="figure absolute inset-0 flex items-center justify-center text-xl font-semibold">
          {display}
        </div>
      </div>
      <div className="flex flex-col items-center gap-0.5 text-center" aria-hidden="true">
        <p className="eyebrow">{label}</p>
        {sub && <p className="text-xs text-foreground/70">{sub}</p>}
      </div>
    </div>
  );
}
