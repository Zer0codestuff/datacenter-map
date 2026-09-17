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

The app is deployed from the `main` branch. Railway uses the root `Dockerfile` to build the Vite bundle and serve `dist` on the assigned `PORT`.

## Recent changes

- Added the Railway Dockerfile so the root Python requirements file does not affect front-end deployment detection.

## Constraints and known issues

- Keep the app static-first and do not add a backend or paid map API key without an explicit request.
- Preserve source URLs, retrieval dates, explicit nulls, and estimation flags in dataset records.
- Map markers use approximate metro locations for cloud regions where exact availability-zone locations are not public.

## Do not

- Do not delete provenance fields or invent missing dataset values.
- Do not replace the open map stack with a paid provider by default.
- Do not remove the Dockerfile unless Railway deployment no longer needs it.
