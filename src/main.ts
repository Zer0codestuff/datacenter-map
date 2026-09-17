/** App entry point: loads data, wires filters, map, views and URL state. */

import type { DataCenter, GlobalStats, Filters, SiteType } from "./types";
import { SITE_TYPES } from "./types";
import { defaultFilters, applyFilters, encodeState, decodeState } from "./state";
import { SiteMap } from "./map";
import { renderDashboard, renderCountryTable, renderCountryDetail, renderCompare, esc } from "./dashboard";

let allData: DataCenter[] = [];
let stats: GlobalStats;
let filters: Filters;
let siteMap: SiteMap;
let currentView = { lat: 20, lng: 10, zoom: 2 };

async function loadData(): Promise<void> {
  const [geoRes, statsRes] = await Promise.all([
    fetch("./data/datacenters.geojson"),
    fetch("./data/stats.json"),
  ]);
  const geo = await geoRes.json();
  stats = await statsRes.json();
  allData = geo.features.map((f: GeoJSON.Feature) => {
    const p = f.properties as Omit<DataCenter, "lat" | "lng">;
    const [lng, lat] = (f.geometry as GeoJSON.Point).coordinates;
    return { ...p, lat, lng } as DataCenter;
  });
}

function refreshMap(): void {
  const filtered = applyFilters(allData, filters);
  siteMap.setData(filtered);
  updateUrl();
}

function updateUrl(): void {
  history.replaceState(null, "", encodeState(filters, currentView));
}

function showDetail(dc: DataCenter): void {
  const panel = document.getElementById("detail-panel")!;
  const fields: [string, string | number | null][] = [
    ["Operator", dc.operator], ["Owner", dc.owner], ["Country", dc.country],
    ["City / region", dc.city], ["Tier", dc.tier], ["Status", dc.status],
    ["Type", dc.type], ["Purpose", dc.purpose],
    ["Power capacity", dc.power_capacity_mw !== null ? `${dc.power_capacity_mw} MW${dc.power_capacity_mw_estimated ? " (estimated)" : ""}` : null],
    ["IT load", dc.it_load_mw !== null ? `${dc.it_load_mw} MW` : null],
    ["PUE", dc.pue], ["Area", dc.area_sqm !== null ? `${dc.area_sqm} m²` : null],
    ["Buildings", dc.num_buildings], ["Year opened", dc.year_opened],
    ["Cooling", dc.cooling_type], ["Renewables", dc.renewable_notes],
    ["Connectivity", dc.connectivity],
    ["Coordinates", `${dc.lat.toFixed(4)}, ${dc.lng.toFixed(4)}`],
  ];
  panel.innerHTML =
    `<button class="close" aria-label="Close">&times;</button><h2>${esc(dc.name)}</h2><dl>` +
    fields.filter(([, v]) => v !== null && v !== "").map(([k, v]) => `<dt>${k}</dt><dd>${esc(String(v))}</dd>`).join("") +
    `</dl><h3>Sources</h3><ul>` +
    dc.sources.map((s) => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.url)}</a>${s.retrieved ? ` (retrieved ${esc(s.retrieved)})` : ""}</li>`).join("") +
    `</ul>`;
  panel.classList.remove("hidden");
  panel.querySelector(".close")!.addEventListener("click", () => panel.classList.add("hidden"));
}

function buildFilterUi(): void {
  const typeBox = document.getElementById("type-filters")!;
  typeBox.innerHTML = SITE_TYPES.map(
    (t) => `<label><input type="checkbox" data-f="types" value="${t}" checked /> ${t}</label>`,
  ).join("");

  const countries = [...new Set(allData.map((d) => d.country).filter(Boolean))].sort() as string[];
  (document.getElementById("country-filter") as HTMLSelectElement).innerHTML +=
    countries.map((c) => `<option value="${c}">${c}</option>`).join("");
  const operators = [...new Set(allData.map((d) => d.operator).filter(Boolean))].sort() as string[];
  (document.getElementById("operator-filter") as HTMLSelectElement).innerHTML +=
    operators.map((o) => `<option value="${esc(o)}">${esc(o)}</option>`).join("");

  document.querySelectorAll<HTMLInputElement>('input[data-f]').forEach((cb) => {
    cb.addEventListener("change", () => {
      const key = cb.dataset.f as "tiers" | "statuses" | "types";
      const set = filters[key] as Set<string>;
      if (cb.checked) set.add(cb.value);
      else set.delete(cb.value);
      refreshMap();
    });
  });
  document.getElementById("country-filter")!.addEventListener("change", (e) => {
    filters.country = (e.target as HTMLSelectElement).value || null;
    refreshMap();
  });
  document.getElementById("operator-filter")!.addEventListener("change", (e) => {
    filters.operator = (e.target as HTMLSelectElement).value || null;
    refreshMap();
  });
  const num = (id: string, set: (v: number | null) => void) =>
    document.getElementById(id)!.addEventListener("input", (e) => {
      const v = (e.target as HTMLInputElement).value;
      set(v === "" ? null : Number(v));
      refreshMap();
    });
  num("min-mw", (v) => (filters.minMw = v));
  num("max-mw", (v) => (filters.maxMw = v));
  num("min-year", (v) => (filters.minYear = v));
  num("max-year", (v) => (filters.maxYear = v));
  document.getElementById("search")!.addEventListener("input", (e) => {
    filters.search = (e.target as HTMLInputElement).value;
    refreshMap();
  });
  document.getElementById("reset-filters")!.addEventListener("click", () => {
    filters = defaultFilters();
    document.querySelectorAll<HTMLInputElement>('input[data-f]').forEach((cb) => (cb.checked = true));
    (document.getElementById("country-filter") as HTMLSelectElement).value = "";
    (document.getElementById("operator-filter") as HTMLSelectElement).value = "";
    (document.getElementById("search") as HTMLInputElement).value = "";
    ["min-mw", "max-mw", "min-year", "max-year"].forEach((id) => ((document.getElementById(id) as HTMLInputElement).value = ""));
    refreshMap();
  });
  document.getElementById("share-link")!.addEventListener("click", async (e) => {
    await navigator.clipboard.writeText(location.href);
    (e.target as HTMLButtonElement).textContent = "Link copied!";
    setTimeout(() => ((e.target as HTMLButtonElement).textContent = "Copy shareable link"), 1500);
  });
}

function applyDecodedFilters(): void {
  document.querySelectorAll<HTMLInputElement>('input[data-f]').forEach((cb) => {
    const key = cb.dataset.f as "tiers" | "statuses" | "types";
    cb.checked = (filters[key] as Set<string>).has(cb.value);
  });
  (document.getElementById("search") as HTMLInputElement).value = filters.search;
  if (filters.country) (document.getElementById("country-filter") as HTMLSelectElement).value = filters.country;
  if (filters.operator) (document.getElementById("operator-filter") as HTMLSelectElement).value = filters.operator;
}

function wireNav(): void {
  document.querySelectorAll<HTMLButtonElement>(".nav-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".nav-btn").forEach((b) => b.classList.remove("active"));
      document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
      btn.classList.add("active");
      const view = btn.dataset.view!;
      document.getElementById(`view-${view}`)!.classList.add("active");
      if (view === "map") siteMap.resize();
      if (view === "compare") renderCompare(stats);
    });
  });
}

async function main(): Promise<void> {
  const decoded = decodeState(location.hash);
  filters = decoded.filters;
  currentView = decoded.view;

  await loadData();
  buildFilterUi();
  applyDecodedFilters();
  wireNav();

  siteMap = new SiteMap("map", currentView, {
    onSelect: showDetail,
    onMove: (v) => {
      currentView = v;
      updateUrl();
    },
  });
  refreshMap();

  renderDashboard(stats, allData);
  renderCountryTable(stats, (code) => {
    const stat = stats.countries.find((c) => c.code === code)!;
    renderCountryDetail(stat, allData.filter((d) => d.country === code));
  });
  renderCompare(stats);
}

main().catch((err) => {
  document.body.innerHTML = `<p style="padding:2rem">Failed to load data: ${esc(String(err))}</p>`;
});
