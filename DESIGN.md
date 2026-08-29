---
name: Health Tracker
description: A grayscale-first personal recovery dashboard where color is reserved strictly for data.
colors:
  background: "#ffffff"
  foreground: "#171717"
  accent: "#2563eb"
  success: "#0f7a3d"
  success-bg: "#ecfdf3"
  danger: "#b3261e"
  danger-bg: "#fef3f2"
  gauge-blue: "#2563eb"
  alert-amber: "#f59e0b"
  trace-violet: "#7c3aed"
  chrono-gray: "#94a3b8"
  metric-teal: "#0d9488"
  sleep-deep: "#1d4ed8"
  sleep-rem: "#3b82f6"
  sleep-light: "#93c5fd"
  sleep-awake: "#94a3b8"
typography:
  body:
    fontFamily: "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif"
    fontWeight: 400
  numeric:
    fontFamily: "var(--font-geist-mono)"
    fontFeature: "tabular-nums"
rounded:
  sm: "4px"
  full: "9999px"
  sheet: "8px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.foreground}"
    textColor: "{colors.background}"
    rounded: "{rounded.sm}"
    padding: "8px 16px"
  button-primary-active:
    backgroundColor: "{colors.foreground}"
    textColor: "{colors.background}"
    rounded: "{rounded.sm}"
    padding: "8px 16px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.foreground}"
    rounded: "{rounded.sm}"
    padding: "8px 12px"
  card:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.sm}"
    padding: "16px"
  chip-toggle:
    backgroundColor: "transparent"
    textColor: "{colors.foreground}"
    rounded: "{rounded.full}"
    padding: "6px 12px"
---

# Design System: Health Tracker

## Overview

**Creative North Star: "The Quiet Instrument Panel"**

Health Tracker reads like a calibrated instrument panel, not a consumer wellness app: near-grayscale surfaces, hairline borders standing in for shadows, and color deployed only where it encodes a specific measurement (a sleep stage, a stress reading, a biological-age delta). Nothing on screen is decorative — every colored pixel is data, every border is a boundary between two pieces of information, and every number renders in tabular figures so a reading can be scanned and compared at a glance the way a dial would be.

The system is evolving from a bare-bones first pass toward a slightly warmer, still-minimal register: **precise and unhurried**. That means interactive states get a touch more tactile feedback than today's near-invisible hovers, and corners are allowed to soften a little beyond the current 4px default in new work — but the panel stays quiet. This is a personal daily-glance tool for one person checking their own recovery numbers, not a surface that needs to persuade or delight a stranger. Confidence comes from restraint, not embellishment.

**Key Characteristics:**
- Grayscale-first surfaces; color is reserved exclusively for data encoding, never decoration.
- Hairline borders (`black/[.08]` light, `white/[.145]` dark) instead of shadows for all resting surfaces.
- Every numeric reading uses tabular figures so values align in a fixed-width column.
- Primary actions invert foreground/background rather than reaching for a brand color.
- One flat grid of cards on mobile-first, centered single-column layouts on every page.

## Colors

The palette is almost entirely neutral; the only saturated colors in the system are functional and each is bound to exactly one measurement.

### Primary
- **Foreground/Background Invert** (`#171717` on `#ffffff`, light / `#ededed` on `#0a0a0a`, dark): the only "primary action" color in the system. Buttons, active nav items, and selected toggles invert the page's own foreground and background rather than introducing a brand hue — this **is** the primary color, expressed as inversion rather than pigment.

### Secondary
- **Gauge Blue** (`#2563eb`): the Sleep ring, Energy Bank metric, and stress-battery chart's "battery" series. Named for its resemblance to a panel gauge needle; this is the closest thing the system has to a brand accent, and it appears only on sleep/energy data, never as UI chrome.

### Tertiary
- **Alert Amber** (`#f59e0b`): the Strain ring and the stress-battery chart's "stress" series — the one warm color in the system, reserved for exertion/stress readings.
- **Trace Violet** (`#7c3aed`): biological-age readings exclusively (the Bio Age ring/teaser, the bio-age line in trend charts).

### Neutral
- **Panel White / Near-Black** (`--background`: `#ffffff` light, `#0a0a0a` dark): page and card background.
- **Ink / Paper** (`--foreground`: `#171717` light, `#ededed` dark): body text, borders derive their opacity from this value.
- **Hairline** (`black/[.08]` light, `white/[.145]` dark): the single border color used for every card, divider, and input outline in the system, at two fixed opacities per theme.
- **Muted Label** (`foreground/50` and `foreground/60`): secondary text — metric labels, sub-captions, helper copy. Two steps only; do not introduce a third opacity level.
- **Recovery Success Green** (`--success` `#0f7a3d` light / `#4ade80` dark, on `--success-bg` `#ecfdf3` / `#0f2e1c`): the Recovery ring, and confirmation banners (e.g. "Google Health connected").
- **Danger Red** (`--danger` `#b3261e` light / `#f87171` dark, on `--danger-bg` `#fef3f2` / `#3a1414`): error banners and validation text only.

### System Chrome
- **Accent Blue** (`--accent`: `#2563eb` light / `#5b8def` dark): the global `:focus-visible` keyboard-focus ring (`app/globals.css`), and nothing else. This is `--accent`'s one deliberate use — it marks focus as a distinct system signal, separate from both the invert-based primary-action treatment and the data colors above. It is still not a general-purpose brand/UI color: don't reach for it for buttons, links, or chip chrome — the invert pattern owns "primary," and this token owns keyboard focus.

### Named Rules
**The Invert-Don't-Tint Rule.** Primary actions signal importance by inverting foreground/background, never by introducing a brand color. If something needs to look "primary," make it the opposite of the page, not a different hue.

**The One Reading, One Color Rule.** Gauge Blue, Alert Amber, Trace Violet, and the sleep-stage blues each belong to exactly one metric family. Never reuse a data color for a second, unrelated metric — a reader should be able to identify what's being measured from color alone.

## Typography

**Body Font:** Geist Sans (with `ui-sans-serif, system-ui, sans-serif` fallback)
**Numeric Font:** Geist Mono is loaded but current numeric display actually uses Geist Sans set to `tabular-nums` (not a monospace switch) — treat tabular-nums as the operative rule, and reserve Geist Mono itself for a future dedicated data-readout context if one arises.

**Character:** A single, quiet sans throughout — no display face, no serif accent. All emphasis comes from size and weight steps, not font changes. This keeps the instrument-panel read: one typeface, calibrated markings.

### Hierarchy
- **Title** (semibold, `text-2xl`/24px): page headers only — one per page (e.g. "Sleep", "Settings", the formatted date on Today).
- **Section Label** (medium, `text-lg`/18px or default 16px): card/section headings within a page (e.g. "Google Health", "Energy Bank & Stress").
- **Body** (regular, `text-sm`/14px): all standard copy, form labels, list items.
- **Metric Display** (semibold, `text-lg` to `text-3xl` depending on prominence, `tabular-nums`): the actual numbers — ring center values, MetricCard values. Always tabular so digits don't shift width as they update.
- **Caption** (regular, `text-xs`/12px, `foreground/50`): sub-labels under metrics, helper text, fine print.

### Named Rules
**The Tabular Numbers Rule.** Any rendered measurement (score, HRV, heart rate, minutes, percentage) sets `tabular-nums`. A reading must never shift the layout around it as its value changes.

## Layout

Single-column, centered, mobile-first. Every page body is `mx-auto max-w-2xl` (Today, with its widget grid, is the one exception at `max-w-3xl`) with `px-4 py-16` and a vertical rhythm of `gap-6` to `gap-8` between sections — there is no sidebar and no multi-column desktop layout beyond the widget grid itself.

The Today dashboard's widget grid is `grid-cols-2` (mobile) → `sm:grid-cols-3` (desktop), with wide widgets (charts) spanning the full row via `col-span-2`/`col-span-3`. Because the widget set is user-customizable (add/remove/reorder), every widget must render correctly at both the standard single-cell size and the full-width wide size — never assume a fixed neighbor.

Navigation is dual-mode by breakpoint: a top bar with inline text links + the status/theme toggles on desktop (`md:` and up), and a fixed bottom tab bar with icon+label on mobile — both read the same active route. Bottom tab bar reserves `env(safe-area-inset-bottom)` and the page body reserves matching padding, since the installed iOS home-screen app is a first-class target, not a responsive afterthought.

### Named Rules
**The Fixed-Width Reading Rule.** No page exceeds `max-w-3xl`. This is a personal dashboard read at arm's length, not a document meant to fill a monitor.

## Elevation & Depth

Flat by default. Every resting surface (card, section, input) uses a 1px hairline border instead of a shadow — there is no ambient elevation system, no `box-shadow` token used anywhere for structural depth. The one exception is transient overlays: the customize drawer and journal drawer use `shadow-lg` plus a `bg-black/40` backdrop scrim, because an overlay floating above the whole page is the one moment true elevation is warranted.

### Shadow Vocabulary
- **Overlay** (`shadow-lg`, paired with `bg-black/40` backdrop): drawers and modal sheets only. Never applied to a resting card.

### Named Rules
**The Flat-by-Default Rule.** If it's part of the page, it's flat and bordered. If it's floating above the page (drawer, modal), it gets a shadow and a backdrop. There is no third state.

## Shapes

Corners are small and consistent: the default Tailwind `rounded` (4px) on cards, buttons, inputs, and list rows. Pills (`rounded-full`) appear only for toggleable chip-style controls — the "add a widget" chips and the activity-status option list use the sharp `rounded` default, while selectable filter-style chips use full pill radius, so radius itself signals "chip you tap to toggle" versus "container." Drawer sheets get a slightly larger radius (`rounded-lg`/8px, `rounded-t-lg` on mobile's bottom-sheet edge) to read as a distinct floating layer rather than a flush card.

As the system warms up per the Overview direction, new components may use a marginally larger radius (6–8px) than the historical 4px default — this is a permitted evolution, not a retroactive rule to reapply everywhere existing 4px corners already ship.

## Components

### Buttons
- **Shape:** `rounded` (4px), full-width or `w-fit` depending on context.
- **Primary:** `bg-foreground text-background`, `px-4 py-2`, `text-sm` — the invert pattern (see Colors → Named Rules). Used for the single primary action per section (Save, Connect Google Health).
- **Ghost:** transparent background, `text-foreground/70`, hover `bg-black/[.04]` (dark: `bg-white/[.08]`) — used for icon buttons (theme toggle, close, reorder arrows) and secondary nav links.
- **Bordered:** `border border-black/[.08]` (dark: `white/[.145]`), transparent fill — used for the "Customize" trigger and toggle-style buttons (biological-sex selector) in their unselected state.
- **Press feedback:** every interactive button applies `active:scale-[0.98]` — the one universal motion cue in the system. Preserve it on every new button; it's the system's only press affordance today.
- **Focus feedback:** every focusable element (buttons, links, chips, inputs) gets the same global `2px solid var(--accent)` ring with `2px` offset on `:focus-visible`, defined once in `app/globals.css` — never styled per-component. It only fires for keyboard/programmatic focus, so it never competes with the mouse-driven press-scale above.

### Chips (toggles)
- **Selectable pill** (`rounded-full`, bordered when unselected): "add a widget" catalog chips.
- **Selected state:** `bg-foreground text-background`, same invert rule as buttons — a selected chip is visually identical to a primary button.

### Cards / Containers
- **Corner Style:** `rounded` (4px).
- **Background:** `bg-background` (transparent-on-page for most cards, since the page background already matches).
- **Shadow Strategy:** none — see Elevation & Depth. Depth comes entirely from the border.
- **Border:** `border border-black/[.08]` dark: `border-white/[.145]`, on all four sides.
- **Internal Padding:** `p-4` (16px) is the standard; sections on Settings use the same.

### Inputs / Fields
- **Style:** `border border-black/[.08]` (dark: `white/[.145]`), `bg-transparent`, `rounded`, `px-3 py-2`, `text-sm`.
- **Focus:** the global keyboard-focus ring (see Buttons → Focus feedback) — `2px solid var(--accent)`, `2px` offset, applied once via `:focus-visible` in `app/globals.css` rather than per-component.
- **Disabled:** `opacity-50` on buttons; no distinct disabled input style yet observed.

### Navigation
- **Desktop top bar:** inline text links, `rounded px-3 py-1.5 text-sm font-medium`; active route gets the invert treatment (`bg-foreground text-background`), inactive gets `text-foreground/70` with ghost hover.
- **Mobile bottom tab bar:** fixed, `Phosphor` icons at 22px, `weight="fill"` when active vs `"regular"` when inactive, 11px label beneath, active tint is full-opacity foreground vs `foreground/50` inactive. Safe-area-aware.
- **Status/theme toggles:** live in the top bar only; small icon-first controls following the ghost-button treatment, with the activity-status control switching to the "selected chip" invert look when a non-default status is active.

### Score Ring (signature component)
The system's one true signature element: an SVG ring (96px, 8px stroke) with a `black/[.08]`-track and a colored progress arc in the metric's own data color (Gauge Blue for Sleep, Alert Amber for Strain, Success Green for Recovery, Trace Violet for Bio Age), rounded line-cap, center value in tabular-nums, label and optional sub-caption beneath. This is the closest the system has to a "brand mark" — any new metric that deserves top-level dashboard prominence should be expressed as a Score Ring using its own bound data color, not a new visual form.

## Do's and Don'ts

### Do:
- **Do** bind every new data color to exactly one metric family and never reuse it elsewhere (see The One Reading, One Color Rule).
- **Do** set `tabular-nums` on every rendered measurement, no exceptions.
- **Do** use the foreground/background invert for any new primary action instead of reaching for `--accent` or a new hue.
- **Do** keep every page body within `max-w-2xl` (or `max-w-3xl` for widget-grid pages) and centered.
- **Do** treat the installed iOS home-screen context as first-class: respect `env(safe-area-inset-*)` in any new fixed-position chrome.
- **Do** allow slightly larger radius (6–8px) and a touch more tactile hover/press feedback in new components, per the "precise and unhurried" direction — without introducing shadows on resting surfaces or new brand colors.

### Don't:
- **Don't** add a `box-shadow` to any resting card, section, or input — shadows are reserved for floating overlays only.
- **Don't** introduce a new accent color for UI chrome (buttons, nav, chips); `--accent` is spoken for by the keyboard-focus ring, and general "primary" styling should invert instead.
- **Don't** widen any page past `max-w-3xl` or introduce a desktop sidebar/multi-column layout — this is a single-reader instrument panel, not a document surface.
- **Don't** style a widget assuming a specific neighbor or fixed grid position; the dashboard widget set is user-reorderable and any widget can end up full-width or single-cell.
- **Don't** invent decorative color, illustration, or marketing-style imagery anywhere — every color must trace back to a specific measurement.
