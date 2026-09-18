# Data Center Map — design system

This document describes the visual identity and the component system introduced in the UI redesign (issue #3). Everything here maps 1:1 to `src/styles/` and `src/ui/`.

## Identity

- **Tone**: a refined data product — calm, dense where it needs to be, never a generic admin dashboard. The map is the hero; chrome stays quiet so the dataset is what you see.
- **Mark**: a rounded square with three horizontal lines (server rack) and a single accent node (`icons.logo`, `public/favicon.svg`).
- **Typography**: Inter for UI (strong weights for headings, tight tracking), IBM Plex Mono for record IDs and keyboard hints. Numbers everywhere use tabular figures (`.num`) so tables and KPIs align.
- **Color**: near-black blue-grey surfaces in dark mode, cool off-white in light mode, one interactive accent (ice blue). **Tier colors are data colors** — emerald / amber / violet — and are never used for buttons, links or chrome.

## Tokens (`src/styles/tokens.css`)

| Group | Tokens |
|---|---|
| Type | `--font-sans`, `--font-mono`, `--text-xs … --text-3xl`, `--leading-*`, `--tracking-*` |
| Space | `--sp-1 … --sp-16` (4 px base) |
| Radius | `--r-sm 6`, `--r-md 10`, `--r-lg 14`, `--r-xl 20`, `--r-pill` |
| Layout | `--topbar-h`, `--tabbar-h`, `--sidebar-w 336`, `--drawer-w 400`, `--content-max 1200`, z-index scale |
| Motion | `--ease`, `--dur-fast 120`, `--dur 200`, `--dur-slow 320` (all `0ms` under `prefers-reduced-motion`) |
| Surfaces | `--bg`, `--bg-elev`, `--bg-elev-2`, `--bg-hover`, `--bg-active`, `--bg-scrim` |
| Text | `--fg`, `--fg-muted`, `--fg-faint` |
| Lines | `--border`, `--border-strong`, `--focus` |
| Accent | `--accent`, `--accent-strong`, `--accent-ink`, `--accent-soft`, `--danger` |
| Data | `--tier-confirmed`, `--tier-probable`, `--tier-theorized`, `--chart-bar`, `--chart-bar-strong`, `--map-*` |

Themes: dark is the default; `[data-theme="light"]` overrides the surface/text/accent/tier tokens. The theme follows `prefers-color-scheme` until the user toggles it, then persists in `localStorage` (`dcm.theme`). An inline script in `index.html` applies it before first paint.

## Components (`src/styles/components.css`, `src/ui/components.ts`)

| Component | Classes / helper | Notes |
|---|---|---|
| Button | `.btn`, `--primary`, `--ghost`, `--sm`, `--icon`, `--block` | hover, active (translateY 1px), disabled (opacity .45), focus-visible ring |
| Segmented tabs | `.segmented`, `.segmented__item[aria-selected]` | primary navigation; `role="tablist"`, arrow-key navigation |
| Inputs | `.input`, `.select`, `.input-group`, `.search-wrap`, `.kbd` | focus ring via `box-shadow`, `aria-invalid` state, custom select chevron |
| Check row | `.check` | custom checkbox, live count, dimmed label when unchecked |
| Dot / badge / chip | `.dot--{tier}`, `.badge--{tier}`, `.chip` (+ `chip()` helper) | chips carry a remove button with an accessible label |
| Card / KPI / metric | `.card`, `.kpi` (`kpi()`), `.metric` (`metric()`) | KPI value uses `--text-2xl`, empty metrics render "—" in faint text |
| Bar list | `barList()` | scaled to the max entry; optional `total` adds share % to the tooltip; tier variants color the fill |
| Column chart | `columnChart()` | pure SVG, keyboard-focusable bars with `<title>` tooltips |
| Table | `.table`, `--interactive`, `th()` helper | sticky header, `aria-sort`, numeric alignment, in-cell bars, selected row |
| Definition list | `.deflist` | detail drawer facts |
| States | `.state`, `--error`, `emptyState()`, `errorState()`, `.skeleton`, `.spinner`, `.loader` | loading, empty, error and unavailable (no WebGL) |
| Toast | `toast()` | bottom-center, `aria-live="polite"`, auto-dismiss |
| Map tooltip | `.dcm-tip` | MapLibre popup restyled with tokens |

## Layout (`src/styles/layout.css`)

- **Shell**: 56 px top bar (brand · segmented nav · theme + GitHub) over a `views` area; one `.view` is active at a time.
- **Map workspace**: 336 px docked filter sidebar (collapsible) + map stage. Overlays: filter toggle and active-filter chips (top-left), legend with live tier counts and size scale (bottom-left), MapLibre controls (top-right). The detail **drawer** slides in from the right (400 px).
- **Content pages**: centered `max-width: 1200px`, section header with eyebrow + title + lede, `kpi-grid` / `card-grid` auto-fit grids, `split` two-column layout for the countries page.
- **Mobile (≤ 760 px)**: top nav hides, a 5-item **bottom tab bar** appears; the sidebar and the drawer become **bottom sheets**; compare rows stack; grids collapse to one column. No horizontal page scrolling.

## Map styling (`src/map.ts`)

- Basemap: OpenFreeMap `dark` / `positron` vector styles (no API key). State/region labels are hidden below zoom 4.5.
- Clusters: neutral discs (light on dark, ink on light) with a translucent ring, radius stepped by count; the count uses `Noto Sans Regular`.
- Points: fill = tier color, radius interpolated from known MW (5 → 16 px), thin stroke matching the surface; hover thickens the stroke in the accent color; the selected site gets a soft accent halo.
- Data layers sit above every basemap layer so markers are never occluded.

## Interaction & accessibility

- Every control has an accessible name; icon buttons use `aria-label`.
- `:focus-visible` rings everywhere (never on mouse focus); skip link to `#main`.
- Keyboard: `/` focuses search, `Esc` closes the drawer / mobile sheet, arrows move between nav tabs, `Enter` activates table rows and chart bars.
- Result counts and toasts use `aria-live`.
- Color contrast: body text ≥ 7:1, muted text ≥ 4.5:1 on both themes; tier colors were tuned per theme (`#34d399/#059669`, `#fbbf24/#d97706`, `#c084fc/#9333ea`).
- Motion is subtle (120–320 ms) and disabled under `prefers-reduced-motion`.

## Adding a view

1. Create `src/views/<name>.ts` that renders into a root element using the helpers in `src/ui/components.ts`.
2. Add the `<section class="view view--scroll" id="view-<name>">` and a nav button (`data-nav="<name>"`) in `index.html`, plus a tab bar item.
3. Register the name in `VIEW_NAMES` (`src/state.ts`) so it round-trips through the URL, and wire it in `showPage()` (`src/main.ts`).
