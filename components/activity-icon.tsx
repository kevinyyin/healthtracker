type ActivityGlyph = "run" | "walk" | "bike" | "swim" | "strength" | "yoga" | "ball" | "generic";

function glyphFor(type: string | null): ActivityGlyph {
  if (!type) return "generic";
  const t = type.toLowerCase();
  if (/run/.test(t)) return "run";
  if (/walk|hik|stair|elliptical/.test(t)) return "walk";
  if (/bik|cycl|spin/.test(t)) return "bike";
  if (/swim/.test(t)) return "swim";
  if (/strength|weight|lift|training/.test(t)) return "strength";
  if (/yoga|pilates|stretch/.test(t)) return "yoga";
  if (/basketball|soccer|football|tennis|golf|volleyball|badminton/.test(t)) return "ball";
  return "generic";
}

const GLYPH_PATHS: Record<ActivityGlyph, React.ReactNode> = {
  run: (
    <>
      <circle cx="15" cy="5" r="1.75" />
      <path d="M13 8l-3 3 2 2.5-1 5" />
      <path d="M10 11l-3.5 1.5" />
      <path d="M12 13l3 1.5 1.5 4" />
      <path d="M9 20l3-4" />
    </>
  ),
  walk: (
    <>
      <path d="M4 16l4-3 4 2 4-8" />
      <path d="M16 7l3-2" />
      <circle cx="19" cy="4.5" r="1.5" />
    </>
  ),
  bike: (
    <>
      <circle cx="6" cy="16" r="3.25" />
      <circle cx="18" cy="16" r="3.25" />
      <path d="M6 16l4-8h4l3 8" />
      <path d="M10 8h3" />
      <path d="M13 8l3 4h2" />
    </>
  ),
  swim: (
    <>
      <path d="M3 15c1.5 1.3 3 1.3 4.5 0s3-1.3 4.5 0 3 1.3 4.5 0 3-1.3 4.5 0" />
      <path d="M3 19c1.5 1.3 3 1.3 4.5 0s3-1.3 4.5 0 3 1.3 4.5 0 3-1.3 4.5 0" />
      <circle cx="16" cy="6" r="1.75" />
      <path d="M6 11l4.5-3 3 2-2 3" />
    </>
  ),
  strength: (
    <>
      <path d="M4 12h16" />
      <rect x="2" y="9" width="3" height="6" rx="1" />
      <rect x="19" y="9" width="3" height="6" rx="1" />
      <rect x="6" y="7" width="2.5" height="10" rx="1" />
      <rect x="15.5" y="7" width="2.5" height="10" rx="1" />
    </>
  ),
  yoga: (
    <>
      <circle cx="12" cy="5" r="1.75" />
      <path d="M12 8v4" />
      <path d="M12 9l-5 4" />
      <path d="M12 9l5 4" />
      <path d="M12 12l-4 6" />
      <path d="M12 12l4 6" />
    </>
  ),
  ball: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 4v16" />
      <path d="M4 12h16" />
      <path d="M6.3 6.3c2.5 2.5 8.9 2.5 11.4 0" />
      <path d="M6.3 17.7c2.5-2.5 8.9-2.5 11.4 0" />
    </>
  ),
  generic: (
    <>
      <path d="M3 12h4l2 6 4-12 2 6h6" />
    </>
  ),
};

export function ActivityIcon({ type }: { type: string | null }) {
  const glyph = glyphFor(type);

  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-foreground/5 text-foreground/70">
      <svg
        viewBox="0 0 24 24"
        width={18}
        height={18}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {GLYPH_PATHS[glyph]}
      </svg>
    </span>
  );
}
