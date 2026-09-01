export function DailyGuidance({
  recovery,
  sleep,
  strain,
}: {
  recovery: string;
  sleep: string;
  strain: string;
}) {
  return (
    <div className="card flex flex-col gap-2 p-4" role="group" aria-label={`Daily guidance: ${recovery} ${sleep} ${strain}`}>
      <p className="eyebrow" aria-hidden="true">
        Today&apos;s Guidance
      </p>
      <ul className="flex flex-col gap-1.5 text-sm text-foreground/80" aria-hidden="true">
        <li>{recovery}</li>
        <li>{sleep}</li>
        <li>{strain}</li>
      </ul>
    </div>
  );
}
