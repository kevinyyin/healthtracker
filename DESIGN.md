---
name: Health Tracker
description: A Swiss spa/clinic instrument system — warm stone surfaces, one disciplined accent, every reading rendered like a calibrated gauge.
colors:
  background: "#f7f5f1"
  surface: "#fffefc"
  foreground: "#1c1b19"
  border: "rgba(28, 27, 25, 0.1)"
  accent: "#3f5344"
  accent-foreground: "#f7f5f1"
  brass: "#a9834f"
  success: "#3f6b4a"
  success-bg: "#e7eee4"
  danger: "#9c4a3c"
  danger-bg: "#f5e9e4"
  basin-blue: "#5c7a8c"
  brass-gold: "#b8925a"
  clay: "#bf7a54"
  plum: "#8c6478"
  chrono-gray: "#a39a8c"
  metric-teal: "#52847c"
  sleep-deep: "#3d5d73"
  sleep-rem: "#5a85a0"
  sleep-light: "#9cc0ce"
  sleep-awake: "#b9afa1"
typography:
  body:
    fontFamily: "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif"
    fontWeight: 400
  numeric:
    fontFamily: "var(--font-geist-mono)"
    fontFeature: "tabular-nums"
rounded:
  field: "0.875rem"
  card: "1.25rem"
  sheet: "1.5rem"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
motion:
  ease: "cubic-bezier(0.22, 1, 0.36, 1)"
  duration-fast: "150ms"
  duration-base: "380ms"
components:
  button-primary:
    backgroundColor: "{colors.foreground}"
    textColor: "{colors.background}"
    rounded: "{rounded.full}"
    padding: "10px 22px"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.foreground}"
    border: "1px solid {colors.border}"
    rounded: "{rounded.full}"
    padding: "10px 22px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.foreground}"
    rounded: "{rounded.full}"
    padding: "8px 16px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.card}"
    padding: "16px"
    shadow: "0 1px 2px rgba(28,27,25,.05), 0 14px 32px -18px rgba(28,27,25,.22)"
  chip-toggle:
    backgroundColor: "transparent"
    textColor: "{colors.foreground}"
    rounded: "{rounded.full}"
    padding: "6px 14px"
---

# Design System: Health Tracker

## Overview

**Creative North Star: "The Instrument Room"**

Health Tracker reads like the reception room of a private Swiss spa/clinic — warm stone surfaces, a single restrained accent, every reading rendered like a calibrated instrument. This is a from-the-ground-up successor to the earlier "Quiet Instrument Panel" system: it keeps that system's core discipline (grayscale-first chrome, tabular numerals, one color per metric, restraint over decoration) but trades the bare, flat, cold-neutral first pass for warm materials, soft ambient elevation, and considered motion — the difference between a spec sheet and a room someone would pay a premium membership to sit in.

**Key Characteristics:**
- Warm stone/ivory surfaces, never cold gray or pure black/white — `--background`/`--surface`/`--foreground` all carry a warm cast in both themes.
- Cards are lifted off the page with a soft ambient shadow (`--shadow-card`) and a hairline border, not flat-bordered-only.
- One accent color (`--accent`, a deep pine/moss green) spent deliberately: the keyboard-focus ring, the ring signature's glow, and interactive-card/chip hover — never smeared across buttons or chrome.
- Primary actions still invert foreground/background (unchanged from the prior system) — buttons stay disciplined grayscale so the one accent color reads as a signal, not decoration.
- Every numeric reading renders in Geist Mono, tabular, letting a score read like a gauge digit rather than body prose.
- Motion is a first-class material: a "spa damper" ease (`cubic-bezier(0.22, 1, 0.36, 1)`) drives button lift/press, a sheen sweep on filled buttons, and a staggered rise-in on card grids.

## Colors

### Primary
- **Foreground/Background Invert** (`#1c1b19` on `#f7f5f1`, light / `#eee9e0` on `#15140f`, dark): still the only "primary action" color, per the inherited Invert-Don't-Tint Rule. Buttons, active nav items, and selected chips invert the page's own foreground/background.

### Accent
- **Pine** (`--accent`: `#3f5344` light / `#86ac82` dark): the system's one deliberate hue. Used for the keyboard-focus ring, the ring signature's ambient glow, and the hover state of interactive cards/chips/outline buttons. Never used for button fills or chart data — see Named Rules.
- **Brass** (`--brass`: `#a9834f` light / `#cba467` dark): a fine metallic accent for the ring signature's tick marks and header dividers only. Never a fill color.

### Data (one reading, one color — inherited rule, retinted warm)
- **Basin Blue** (`#5c7a8c`): the Sleep ring, Energy Bank metric, and stress-battery chart's "battery" series.
- **Brass Gold** (`#b8925a`): the Strain ring and the stress-battery chart's "stress" series.
- **Plum** (`#8c6478`): biological-age readings exclusively.
- **Clay / Metric Teal / Chrono Gray**: reserved for future single-metric trend lines; Metric Teal (`#52847c`) is the generic Trends-page line color, Chrono Gray (`#a39a8c`) is the dashed chronological-age reference line.
- **Sleep stages**: `sleep-deep` `#3d5d73` → `sleep-awake` `#b9afa1`, one tonal family from deep basin-blue to warm stone gray.

### Neutral
- **Stone / Ink-black** (`--background`: `#f7f5f1` light, `#15140f` dark): page background.
- **Surface** (`--surface`: `#fffefc` light, `#1d1b16` dark): card/section background, one step lighter (light mode) or lighter-still (dark mode) than the page, so cards read as lifted material rather than flush-with-page.
- **Ink / Ivory** (`--foreground`: `#1c1b19` light, `#eee9e0` dark): body text.
- **Hairline** (`--border`, warm-tinted rgba of the foreground at low opacity): the border color for every card, divider, and input outline.
- **Muted Label** (`foreground/50` and `foreground/60`, plus the new `.eyebrow` utility for tracked-out uppercase labels): secondary text.
- **Recovery Success Green** (`--success` `#3f6b4a` light / `#7bb37f` dark, on `--success-bg`): the Recovery ring, and confirmation banners.
- **Danger Terracotta** (`--danger` `#9c4a3c` light / `#d98a72` dark, on `--danger-bg`): error banners and validation text — retinted from the old system's red to a warm brick tone that fits the stone/clay palette.

### Named Rules
**The Invert-Don't-Tint Rule.** Unchanged from the prior system: primary actions invert foreground/background rather than reaching for a brand color.

**The One Reading, One Color Rule.** Unchanged: each data color belongs to exactly one metric family.

**The One Accent, Three Jobs Rule** *(new)*: `--accent` (Pine) does exactly three things system-wide — keyboard focus, the ring signature's glow, and the hover accent on interactive cards/chips/outline buttons. It is still not a general button-fill or chrome color; that restraint is what keeps a warm, elevated system from reading as a generic SaaS product.

## Typography

**Body Font:** Geist Sans.
**Numeric Font:** Geist Mono, tabular — **now actually used**, not deferred. Every rendered measurement (ring center value, MetricCard value, chart axis ticks, tooltip figures) sets the `.figure` utility (`font-mono`, `tabular-nums`, tight tracking), reinforcing the instrument-gauge read the old system aspired to but stopped short of.

**Labels:** Section/eyebrow labels use the new `.eyebrow` utility — `0.6875rem`, uppercase, `0.14em` tracking — for a masthead/engraved-plate quality above page titles and card groups.

### Hierarchy
- **Title** (semibold–light, `text-2xl`–`text-3xl`): page headers, tight tracking.
- **Eyebrow** (`.eyebrow`): optional small tracked-out label above a title or section.
- **Section Label** (medium, 16–18px): card/section headings.
- **Body** (regular, 14px): standard copy, form labels, list items.
- **Metric Display** (`.figure`, semibold, scales with prominence): ring values, MetricCard values.
- **Caption** (regular, 12px, `foreground/50`): sub-labels, helper text.

### Named Rules
**The Tabular Numbers Rule.** Unchanged, now implemented via `.figure` (Geist Mono) rather than `tabular-nums` on the body face.

## Layout

Unchanged from the prior system: single-column, centered, mobile-first, `mx-auto max-w-2xl` (Today at `max-w-3xl`), `px-4 py-16`. See The Fixed-Width Reading Rule below.

## Elevation & Depth

**This is the system's biggest departure from its predecessor.** Resting cards now carry a soft ambient shadow (`--shadow-card`, warm-tinted, low-contrast) in addition to their hairline border — the old "Flat-by-Default Rule" is retired. The shadow is deliberately quiet: a 1px contact shadow plus a soft 14–32px spread at low opacity, meant to read as material lifted slightly off the stone background, not a UI-kit drop shadow. Interactive cards (`.card-interactive`) add a hover lift (`translateY(-2px)`) and a deeper shadow (`--shadow-card-hover`).

Overlays (drawers/modals) keep their own stronger elevation (`shadow-lg` + `bg-black/40` scrim) — now a difference of *degree* from resting cards rather than the only elevated surfaces in the system.

### Named Rules
**The Quiet Shadow Rule** *(replaces the old Flat-by-Default Rule)*: every resting surface gets `--shadow-card`; every floating overlay gets something stronger. There is no more shadow-less flat state — the softest shadow tier is the new floor, not zero.

## Shapes

Corners are now generous and warm rather than sharp: cards and sheets use `1.25rem`/`1.5rem` radius (`.card`, drawer sheets), buttons and chips are full pills, inputs use `0.875rem` (`.field`). This replaces the old 4px-default scale system-wide — there is no remaining 4px corner in the redesigned system.

## Components

### Buttons (`.btn` + modifier)
- **Shape:** full pill (`border-radius: 999px`), via the `.btn` base class in `app/globals.css`.
- **Primary** (`.btn.btn-primary`): `bg-foreground`/`text-background`, the invert pattern, plus a diagonal sheen sweep on hover (`::before` gradient translate) and a 1px lift.
- **Outline** (`.btn.btn-outline`): hairline border, hover fills faintly with the accent and lifts.
- **Ghost** (`.btn.btn-ghost`): transparent, hover gets a faint foreground-tinted fill. Used for icon buttons and secondary chrome.
- **Sizing:** `.btn-sm` for compact contexts, `.btn-icon` for square icon-only buttons.
- **Press feedback:** `active:scale(0.96)` at a fast 90ms, defined once in `.btn:not(:disabled):active` — replaces the old per-className `active:scale-[0.98]` convention.
- **Focus feedback:** unchanged global `2px solid var(--accent)` ring on `:focus-visible`.

### Chips (`.chip` / `.chip-active`)
- Full pill, hairline border when unselected, invert fill when selected — same selected-state rule as buttons.

### Cards / Containers (`.card`, `.card-interactive`)
- **Corner Style:** `1.25rem`.
- **Background:** `var(--surface)` — one step off the page background, unlike the old system's flush `bg-background`.
- **Shadow:** `var(--shadow-card)` always; `.card-interactive` adds hover lift + deeper shadow.
- **Border:** `1px solid var(--border)`.
- **Internal Padding:** `p-4`–`p-6` depending on density.

### Inputs / Fields (`.field`)
- `0.875rem` radius, hairline border, hover darkens the border slightly, focus uses the global accent ring.

### Navigation
- Unchanged structurally from the prior system (desktop top bar / mobile bottom tab bar); restyled with the new pill/invert button language and warm palette.

### Score Ring (signature component — retained and extended)
Still the system's one true brand mark, now built out as a proper **instrument dial**: SVG ring (112px, 6px stroke), a `var(--border)`-tinted track, a colored progress arc in the metric's own data color with rounded line-cap, four fine brass tick marks at the compass points, a soft radial glow behind the ring tinted to the metric's own color, and the center value set in `.figure` (Geist Mono). Label uses `.eyebrow`. Any new metric earning dashboard prominence should extend this component, not invent a new visual form.

## Do's and Don'ts

### Do:
- Bind every new data color to exactly one metric family (unchanged).
- Set the `.figure` utility on every rendered measurement — the mono/tabular rule now has one canonical class rather than an ad hoc `tabular-nums`.
- Use the foreground/background invert (`.btn-primary`) for primary actions; reach for `--accent` only in its three named jobs.
- Keep every page body within `max-w-2xl`/`max-w-3xl`, centered.
- Respect `env(safe-area-inset-*)` in fixed-position chrome.
- Give every resting card `var(--shadow-card)` and every overlay something stronger — there's no shadow-less tier anymore.

### Don't:
- Don't introduce a second accent color for UI chrome — Pine's three jobs are the ceiling, Brass is decoration-only (ticks/dividers), never a fill.
- Don't widen any page past `max-w-3xl` or add a desktop sidebar/multi-column layout.
- Don't style a widget assuming a specific neighbor or fixed grid position — the dashboard widget set is user-reorderable.
- Don't invent decorative color, illustration, or marketing-style imagery — every color must still trace back to a specific measurement or the accent's three named jobs.
- Don't reach back for the old 4px radius or flat-bordered-only card style in new work — the warm/elevated system is the current baseline, not an optional variant.
