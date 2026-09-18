# Data Center Map

An interactive world map of every known data center: confirmed, probable and theorized sites color-coded by confidence, with per-country statistics, power usage, size, operator and purpose. Research-driven open dataset.

**Live app:** deploys to GitHub Pages via the included workflow (`Actions → Deploy to GitHub Pages`; enable Pages → GitHub Actions in repo settings).

![Map view](docs/screenshots/map-dark.png)

<p align="center"><img src="docs/screenshots/dashboard.png" width="49%" alt="Dashboard" /> <img src="docs/screenshots/countries.png" width="49%" alt="Countries" /></p>

## Features

- **Interactive map** (MapLibre GL + OpenFreeMap vector tiles): smooth pan/zoom, neutral clusters sized by count, markers colored by confidence tier (green = confirmed, amber = probable, purple = theorized) and sized by known power capacity, hover tooltips, a selection halo, and a detail drawer with key metrics, every field and source links.
- **Search & filters**: name/operator/city search (`/` shortcut); collapsible filter groups for tier, status, type, country, operator, power range and year opened, each with live counts; active-filter chips; results counter; "zoom to results"; explicit empty state when nothing matches.
- **Country statistics**: filterable, sortable table with share-of-world bars and a sticky detail panel (tier, type and operator breakdown) plus a one-click "Show on map".
- **Global dashboard**: headline KPIs (sites, countries, known MW, estimated annual TWh, data coverage), distribution charts by type/tier, growth by year opened, top operators and countries, and a "largest sites" leaderboard that jumps to the map.
- **Compare view**: two countries side by side with mirrored proportional bars and a swap control.
- **Data & methodology page**: tiers, sources, merging rules, estimation caveats and limitations, in-app.
- **Shareable state**: the active page, map view and all filters live in the URL hash — copy the link to share exactly what you see.
- **Design system**: dark and light themes (follows the OS, toggle persisted), consistent tokens for color/type/spacing, keyboard navigation, visible focus states, ARIA tab semantics and a mobile layout with a bottom tab bar and bottom-sheet filters/details. See [`docs/DESIGN.md`](docs/DESIGN.md).
- **Graceful degradation**: if WebGL is unavailable the map area explains why while every other view keeps working; data-load failures show a retry state.

## Dataset

`data/datacenters.json` is the canonical dataset — **4,113 sites in 116 countries** at the time of the initial build. Every record carries a `sources` array (URL + retrieval date). Missing values are explicit `null` and never invented; estimated values are flagged (`power_capacity_mw_estimated: true`).

### Sources

| Source | What it contributes |
|---|---|
| OpenStreetMap (Overpass API) | ~4,800 features tagged `telecom=data_center` / `building=data_center` → confirmed sites |
| Wikidata (SPARQL) | Items that are an instance of *data center* (Q671224) with coordinates |
| Curated research (`scripts/curated_seed.py`) | 179 hand-researched records: hyperscaler cloud regions (AWS, Azure, Google Cloud, Oracle, IBM, Alibaba, Tencent, Huawei), Meta/Apple campuses, xAI Colossus, Stargate Abilene, major colocation providers (Equinix, Digital Realty, NTT, Switch, QTS, Vantage, CyrusOne, Iron Mountain, STACK, Colt, Global Switch, DATA4, Aruba, Teraco, NEXTDC, AirTrunk…), government/HPC sites (Frontier, El Capitan, Aurora, Fugaku, LUMI, Leonardo, MareNostrum 5, Jupiter, CERN, NSA Utah) and crypto-mining facilities |

### Confidence tiers

| Tier | Meaning | Color |
|---|---|---|
| `confirmed` | Operational, officially documented (operator page, regulatory filing, OSM/Wikidata with coordinates) | green |
| `probable` | Strong evidence it exists / is under construction but not officially confirmed at that exact location (news, satellite imagery, permits) | amber |
| `theorized` | Announced, rumored, planned or speculative (e.g. proposed AI mega-campuses) | purple |

### Record schema

`id, name, operator, owner, lat, lng, country (ISO-3166 alpha-2), city, tier, status (operational / under construction / planned / decommissioned), type (hyperscale / colocation / enterprise / edge / hpc/supercomputer / government / crypto mining / ai training), purpose, power_capacity_mw, power_capacity_mw_estimated, it_load_mw, pue, area_sqm, num_buildings, year_opened, cooling_type, renewable_notes, connectivity, sources[]`

## Architecture

Static-first: no backend, no paid API keys. The Python pipeline builds the dataset; the Vite + TypeScript front-end loads the prebuilt GeoJSON + stats JSON.

```
scripts/            Python data pipeline
  fetch_osm.py        OpenStreetMap Overpass fetch (multi-mirror fallback)
  fetch_wikidata.py   Wikidata SPARQL fetch
  curated_seed.py     Hand-researched hyperscaler/campus seed data
  build_dataset.py    normalize → dedupe (≤500 m + name/operator match) → validate → export
data/
  datacenters.json    canonical dataset (full schema)
  raw/                raw source snapshots (osm.json, wikidata.json, curated.json)
  dist/               datacenters.geojson + stats.json (copied to public/data at build time)
public/data/          data served to the web app
src/                  TypeScript front-end
  main.ts             app wiring: data loading, navigation, theme, URL state
  map.ts              MapLibre GL map (themed basemap, clustering, tier colors, hover/selection, WebGL fallback)
  state.ts            filter logic + shareable URL hash codec (filters, view, page)
  stats.ts            aggregation helpers (median, TWh estimate, leaderboards)
  types.ts            shared types
  styles/             design system: tokens.css, base.css, components.css, layout.css
  ui/                 icons, formatting helpers, render primitives (KPI, bars, tables, states), theme, toast
  views/              map-view.ts (filters, chips, legend, drawer), dashboard.ts, countries.ts, compare.ts
docs/DESIGN.md        design system reference (identity, tokens, components, states, accessibility)
tests/                pytest suite for the pipeline (10 tests)
tests-frontend/       vitest suite for filters, URL state, stats, formatting and UI primitives (29 tests)
.github/workflows/    ci.yml (pytest + vitest + build), deploy.yml (GitHub Pages)
```

## Run locally

```bash
# front-end
npm install
npm run dev        # dev server
npm test           # vitest
npm run build      # production build → dist/

# data pipeline
pip install -r requirements.txt
npm run data       # or: python3 scripts/fetch_osm.py && python3 scripts/fetch_wikidata.py \
                   #     && python3 scripts/curated_seed.py && python3 scripts/build_dataset.py
pytest tests/ -v
```

To refresh the data, rerun `npm run data` and copy `data/dist/*` into `public/data/`.

## Design decisions

- **MapLibre GL + OpenFreeMap vector tiles**: fully free/open stack, no API keys, satisfies the static-first constraint. The `dark` and `positron` styles back the two themes; data layers are drawn above basemap labels and state/region labels are hidden below zoom 4.5 so clusters stay legible. Clustering is done natively by MapLibre's GeoJSON source.
- **Design tokens over ad-hoc styling**: every color, radius, spacing step and motion duration is a CSS custom property in `src/styles/tokens.css`; tier colors are reserved for data and never reused for UI chrome. Themes swap the token set, not the components.
- **No UI framework**: views render HTML strings from small typed helpers (`src/ui/components.ts`) and wire events directly — fast, dependency-light and easy to test.
- **Precomputed stats.json**: the dashboard renders instantly without scanning 4k records client-side; `src/stats.ts` re-aggregates on the fly only for filtered/country views.
- **URL hash (not query string)** for shareable state: works on GitHub Pages without server rewrites.
- **Dedupe by proximity + identity**: records within 500 m sharing a normalized name or canonical operator are merged, with curated > Wikidata > OSM precedence and source-list union.
- **Country inference**: when a source lacks a country code, a coarse bounding-box lookup assigns the smallest containing country; failures stay `null`.

## Known limitations

- Cloud *region* markers sit at the region's primary metro area; regions span multiple availability zones whose exact locations are not public.
- Power capacity is only populated when publicly reported — most records are `null`, so headline MW/TWh figures are a lower bound.
- OSM coverage is community-driven and uneven; some countries are under-mapped.
- Wikidata yields relatively few data-center items (~64 with coordinates); OSM is the breadth source.
- No choropleth country-boundary layer yet (country stats are table + detail panel; map colors are per-site).
- Basemap tiles and web fonts are loaded from OpenFreeMap and Google Fonts at runtime; offline use falls back to system fonts and an empty basemap.

## Roadmap

- Country choropleth overlay using an open boundaries dataset.
- Scheduled CI job that refreshes OSM/Wikidata data and opens a PR with the diff.
- More curated power/size data for the top 200 sites; submarine-cable landing point overlay.
- Operator-level compare view; per-site edit suggestions via GitHub issues.

## Open questions / decisions

- Region-level coordinates for hyperscalers are approximations by design (documented above); per-AZ locations are not public.
- `enterprise` vs `colocation` classification for unnamed OSM records is heuristic (operator present → colocation, else enterprise).
- Bounding-box country inference can misassign sites very close to borders; corrections welcome via CONTRIBUTING.md.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). License: MIT (code); data is aggregated from the cited public sources (OSM data © OpenStreetMap contributors, ODbL).
