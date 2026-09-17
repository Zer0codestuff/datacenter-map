# datacenter-map

> **Project specification** — this README describes what has to be built. It will be replaced by the real project README once the implementation lands.

## Goal

An interactive world map (Google Maps–style pan/zoom experience) that shows the location of **every known data center in the world**, enriched with research-backed metadata and aggregate statistics. Think of it as an open, explorable atlas of the world's compute infrastructure.

## Phase 0 — Research first (mandatory)

Before writing application code, do a thorough data-research pass and turn it into a structured dataset:

- Sources to mine (non-exhaustive): hyperscaler region/zone pages (AWS, Azure, GCP, Oracle, IBM, Alibaba, Tencent, Huawei), colocation providers (Equinix, Digital Realty, NTT, Iron Mountain, CyrusOne, QTS, Vantage, STACK, Switch, Global Switch, Colt, Aruba, Data4, …), Meta/Apple/Microsoft/Google/OpenAI/xAI/Anthropic-related campuses, government/HPC/supercomputing sites, submarine-cable landing hubs, Wikipedia/Wikidata (`P31` = data center), OpenStreetMap (`telecom=data_center` / `building=data_center`), Data Center Map, Baxtel, press releases and planning-permission news for announced/rumoured campuses.
- Store everything in a single canonical dataset (`data/datacenters.json` or GeoJSON) with a documented schema and a `sources` field per record (URL + retrieval date). Include a Python `scripts/` pipeline that can (re)build / validate / deduplicate the dataset so it can be extended later.
- Aim for breadth: thousands of records is the target, with quality prioritised for the large/hyperscale sites.

## Confidence tiers (color-coded on the map)

| Tier | Meaning | Colour |
|---|---|---|
| `confirmed` | Operational, officially documented (operator page, regulatory filing, OSM/Wikidata with coordinates) | green |
| `probable` | Strong evidence it exists / is under construction but not officially confirmed at that exact location (news, satellite imagery, permits) | amber |
| `theorized` | Announced, rumoured, planned, or speculative (e.g. proposed AI mega-campuses) | red / purple |

## Data fields per site (as many as can be sourced)

`id, name, operator, owner, lat, lng, country (ISO-3166), region/city, tier (confidence), status (operational / under construction / planned / decommissioned), type (hyperscale, colocation, enterprise, edge, HPC/supercomputer, government, crypto-mining, AI training), purpose / workloads, power_capacity_mw, it_load_mw, pue, area_sqm / floor space, number_of_buildings, year_opened, cooling type, renewable energy notes, connectivity (cable landing, IX), sources[]`.

Missing values must be explicit (`null`), never invented. Estimated values must be flagged (`"power_capacity_mw_estimated": true`).

## App features

1. **Interactive map** – smooth pan/zoom, clustering at low zoom, colour by confidence tier, marker size by power capacity, click → detail panel with all fields and source links. Search by name/operator/city. Filters: tier, status, type, operator, country, power range, year.
2. **Country statistics** – choropleth layer and a stats sidebar/dashboard: number of data centers per country, total/median power capacity, breakdown by type and tier, top operators. Sortable table view.
3. **Global dashboard** – headline numbers (sites, countries, total MW, estimated annual TWh), charts (by type, by tier, growth over time by year opened, top 20 operators).
4. **Compare & explore** – e.g. compare two countries or two operators; "largest sites" leaderboard.
5. **Data provenance** – every record shows its sources; a "Data & methodology" page explains tiers, estimation methods and limitations.
6. **Shareable state** – map view/filters encoded in the URL.
7. **Responsive** – works on desktop and mobile.

## Tech constraints & preferences

- Free/open map stack only: Leaflet or MapLibre GL with OpenStreetMap / open vector tiles (no paid API keys required to run).
- Static-first: the app must be deployable to GitHub Pages (add a GitHub Actions workflow that builds and deploys). Any framework is fine (Vite + vanilla TS or React are good defaults).
- Data pipeline in Python (fetch → normalise → dedupe → validate → export). Include tests for the pipeline and for core front-end logic.
- Everything (code, comments, README, UI strings, commit messages) **in English**.
- No secrets. Document how to add/refresh data.

## Deliverables

- Working app + dataset + pipeline + tests + CI/CD (build, test, deploy to Pages).
- A full README (replacing this one): overview, screenshots/GIF placeholders, features, data model, methodology & tiers, how to run/develop/refresh data, project structure, known limitations, roadmap.
- `CONTRIBUTING.md` describing how to add or correct a data center record.
