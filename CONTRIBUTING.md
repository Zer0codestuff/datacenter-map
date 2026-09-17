# Contributing to Data Center Map

Thanks for helping map the world's compute infrastructure! Everything — code, comments, docs, commit messages — is written in **English**.

## Adding or correcting a data-center record

The dataset is built from three sources; where you contribute depends on the record:

1. **Curated seed** (`scripts/curated_seed.py`) — for hyperscaler regions, notable campuses, HPC/government sites and anything with hand-verified metadata (power, year, tier). Add a row to `ROWS` with:
   - name, operator, lat/lng, ISO-3166 alpha-2 country, city/region
   - confidence tier: `confirmed` (officially documented), `probable` (strong evidence, exact site unconfirmed), `theorized` (announced/rumored/planned)
   - status, type, and only **publicly sourced** values for power/year — use `None` otherwise, never invent numbers
   - a source URL (operator page, press release, permit news)
2. **OpenStreetMap** — for physical buildings. Tag the feature `telecom=data_center` (or `building=data_center`) on OSM with `name`, `operator`, `website`; the pipeline picks it up on the next refresh.
3. **Wikidata** — add `instance of: data center` (Q671224) plus coordinates to the item.

Then rebuild:

```bash
pip install -r requirements.txt
python3 scripts/curated_seed.py
python3 scripts/fetch_osm.py        # optional refresh
python3 scripts/fetch_wikidata.py   # optional refresh
python3 scripts/build_dataset.py
cp data/dist/* public/data/
pytest tests/ -v
```

The pipeline deduplicates (≤500 m + same name/operator), validates every record, and regenerates `data/datacenters.json`, `data/dist/datacenters.geojson` and `data/dist/stats.json`. Commit the updated `data/datacenters.json` and `public/data/*` with your change.

## Rules for data quality

- Every record must have at least one source URL.
- Missing values are `null` — never guessed. Estimates must be flagged (`power_capacity_mw_estimated: true`).
- Prefer primary sources (operator pages, regulatory filings) over aggregators.
- One physical site = one record. Multiple buildings on one campus stay one record unless sources treat them separately.

## Code contributions

```bash
npm install
npm run dev     # develop
npm test        # front-end tests (vitest)
npm run build   # must pass before submitting
pytest tests/   # pipeline tests
```

- TypeScript front-end, strict mode; keep modules small and typed (`src/types.ts` is the contract).
- Python pipeline: stdlib + `requests` only; keep it runnable on a fresh venv.
- CI runs pytest, vitest and a production build on every PR.

## Commit style

Conventional commits, e.g. `data: add Equinix FR9`, `feat: choropleth layer`, `fix: dedupe threshold`, `test: url codec edge cases`, `docs: ...`, `ci: ...`.
