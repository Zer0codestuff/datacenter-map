# AGENTS.md

## Purpose and architecture

Data Center Map is a static Vite and TypeScript web app. The Python scripts build the research dataset, and the browser loads the generated GeoJSON and statistics from `public/data`.

## Run, build, and test

- Install front-end dependencies with `npm ci`.
- Run the development server with `npm run dev`.
- Build the production bundle with `npm run build`.
- Run front-end tests with `npm test`.
- Run the data pipeline with `npm run data` and Python tests with `pytest tests/ -v`.

## Current status

The app is deployed from the `main` branch. Railway uses the root `Dockerfile` to build the Vite bundle, then `server.mjs` serves `dist` on the assigned `PORT`.

## Recent changes

- Complete UI redesign (#3): new design system (`src/styles/`, `src/ui/`), views split into `src/views/`, dark/light themes, OpenFreeMap vector basemap, WebGL fallback, mobile bottom-sheet layout. Design reference in `docs/DESIGN.md`.

- Added the Railway Dockerfile so the root Python requirements file does not affect front-end deployment detection.
- Added the dependency-free Node static server used by Railway at runtime.

## Constraints and known issues

- Keep the app static-first and do not add a backend or paid map API key without an explicit request.
- Preserve source URLs, retrieval dates, explicit nulls, and estimation flags in dataset records.
- Map markers use approximate metro locations for cloud regions where exact availability-zone locations are not public.
- Cluster-count labels must use a single fontstack that OpenFreeMap serves (`Noto Sans Regular`); a missing glyph set makes MapLibre drop the whole tile, hiding every marker in it.
- Theme swaps call `map.setStyle(url, { diff: false })` so `style.load` fires and data layers are re-added.

## Do not

- Do not delete provenance fields or invent missing dataset values.
- Do not replace the open map stack with a paid provider by default.
- Do not remove the Dockerfile unless Railway deployment no longer needs it.
- Do not remove `server.mjs` without replacing its static serving and SPA fallback behavior.
