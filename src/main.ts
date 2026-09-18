/** App entry point: loads data, wires navigation, theme, map, views and URL state. */

import "./styles/main.css";
import type { DataCenter, GlobalStats, Filters } from "./types";
import { defaultFilters, applyFilters, encodeState, decodeState, type ViewName, type ViewState } from "./state";
import { createMap, type MapLike } from "./map";
import { MapView } from "./views/map-view";
import { renderDashboard } from "./views/dashboard";
import { CountriesView } from "./views/countries";
import { CompareView } from "./views/compare";
import { icons, type IconName } from "./ui/icons";
import { getTheme, applyTheme, toggleTheme } from "./ui/theme";
import { toast } from "./ui/toast";
import { errorState } from "./ui/components";

let allData: DataCenter[] = [];
let stats: GlobalStats;
let filters: Filters;
let page: ViewName = "map";
let view: ViewState = { lat: 20, lng: 10, zoom: 2 };
let siteMap: MapLike;
let mapView: MapView;
let countriesView: CountriesView | null = null;
let compareView: CompareView | null = null;
let dashboardDirty = true;
const countryNames = new Map<string, string>();

/* ------------------------------------------------------------------ helpers */

function injectIcons(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>("[data-icon]").forEach((el) => {
    const name = el.dataset.icon as IconName;
    if (icons[name]) el.innerHTML = icons[name];
    el.removeAttribute("data-icon");
  });
}

function setLoader(text: string | null): void {
  const loader = document.getElementById("loader")!;
  if (text === null) loader.classList.add("is-hidden");
  else document.getElementById("loader-text")!.textContent = text;
}

function updateUrl(): void {
  history.replaceState(null, "", encodeState(filters, view, page));
}

async function fetchJson<T>(url: string, label: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Could not load ${label} (${res.status})`);
  return res.json() as Promise<T>;
}

async function loadData(): Promise<void> {
  setLoader("Loading site data…");
  const [geo, s] = await Promise.all([
    fetchJson<GeoJSON.FeatureCollection>("./data/datacenters.geojson", "the site dataset"),
    fetchJson<GlobalStats>("./data/stats.json", "statistics"),
  ]);
  stats = s;
  allData = geo.features.map((f) => {
    const p = f.properties as Omit<DataCenter, "lat" | "lng">;
    const [lng, lat] = (f.geometry as GeoJSON.Point).coordinates;
    return { ...p, lat, lng } as DataCenter;
  });
  for (const c of stats.countries) if (c.code !== "??") countryNames.set(c.code, c.name);
  for (const d of allData) if (d.country && !countryNames.has(d.country)) countryNames.set(d.country, d.country);
}

/* ------------------------------------------------------------------ filters */

function refresh(): void {
  const filtered = applyFilters(allData, filters);
  siteMap.setData(filtered);
  mapView.update(filtered);
  updateUrl();
}

function resetFilters(): void {
  filters = defaultFilters();
  mapView.setFilters(filters);
  refresh();
  toast("Filters reset", { icon: "reset" });
}

async function share(): Promise<void> {
  try {
    await navigator.clipboard.writeText(location.href);
    toast("Link copied to clipboard", { icon: "link" });
  } catch {
    toast("Copy failed — use the address bar", { icon: "alert" });
  }
}

/* --------------------------------------------------------------- navigation */

function showPage(next: ViewName, opts: { push?: boolean } = {}): void {
  page = next;
  document.querySelectorAll<HTMLElement>(".view").forEach((v) => {
    const active = v.id === `view-${next}`;
    v.classList.toggle("is-active", active);
    v.hidden = !active;
  });
  document.querySelectorAll<HTMLElement>("[data-nav]").forEach((b) => {
    if (b.getAttribute("role") === "tab" || b.classList.contains("tabbar__item")) b.setAttribute("aria-selected", String(b.dataset.nav === next));
  });
  if (next === "map") siteMap.resize();
  if (next === "dashboard" && dashboardDirty) {
    renderDashboard(document.getElementById("dashboard-root")!, stats, allData, {
      onSelectSite: (dc) => {
        showPage("map");
        siteMap.flyTo(dc, 10);
        selectSite(dc);
      },
      onSelectOperator: (op) => {
        filters = defaultFilters();
        filters.operator = op;
        mapView.setFilters(filters);
        showPage("map");
        refresh();
        siteMap.fitTo(applyFilters(allData, filters));
      },
    });
    dashboardDirty = false;
  }
  if (next === "countries" && !countriesView) {
    countriesView = new CountriesView(document.getElementById("countries-root")!, stats, allData, {
      onShowOnMap: (code) => {
        filters = defaultFilters();
        filters.country = code;
        mapView.setFilters(filters);
        showPage("map");
        refresh();
        siteMap.fitTo(applyFilters(allData, filters));
      },
    });
  }
  if (next === "compare" && !compareView) compareView = new CompareView(document.getElementById("compare-root")!, stats);
  const scroller = document.querySelector<HTMLElement>(`#view-${next}.view--scroll`);
  if (scroller && opts.push !== false) scroller.scrollTop = 0;
  updateUrl();
}

function wireNav(): void {
  document.querySelectorAll<HTMLElement>("[data-nav]").forEach((el) =>
    el.addEventListener("click", (e) => {
      e.preventDefault();
      showPage(el.dataset.nav as ViewName);
    }),
  );
  // Keyboard arrows within the tablist.
  document.getElementById("nav-tabs")!.addEventListener("keydown", (e) => {
    const tabs = [...document.querySelectorAll<HTMLElement>('#nav-tabs [role="tab"]')];
    const i = tabs.findIndex((t) => t === document.activeElement);
    if (i < 0) return;
    const delta = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!delta) return;
    e.preventDefault();
    const nextTab = tabs[(i + delta + tabs.length) % tabs.length];
    nextTab.focus();
    showPage(nextTab.dataset.nav as ViewName);
  });
}

/* ------------------------------------------------------------------- detail */

function selectSite(dc: DataCenter): void {
  siteMap.select(dc.id);
  mapView.showDetail(dc);
  if (window.matchMedia("(max-width: 760px)").matches) mapView.openSidebar(false);
}

function closeDetail(): void {
  siteMap.select(null);
  mapView.hideDetail();
}

/* -------------------------------------------------------------------- theme */

function wireTheme(): void {
  const btn = document.getElementById("theme-toggle")!;
  const paint = () => {
    const t = getTheme();
    btn.innerHTML = t === "dark" ? icons.sun : icons.moon;
    btn.setAttribute("aria-label", t === "dark" ? "Switch to light theme" : "Switch to dark theme");
  };
  applyTheme(getTheme());
  paint();
  btn.addEventListener("click", () => {
    const t = toggleTheme();
    siteMap.setTheme(t);
    paint();
  });
}

/* --------------------------------------------------------------------- main */

async function main(): Promise<void> {
  injectIcons();
  const decoded = decodeState(location.hash);
  filters = decoded.filters;
  view = decoded.view;
  page = decoded.page;

  await loadData();
  setLoader("Preparing the map…");

  mapView = new MapView(filters, {
    onFiltersChange: refresh,
    onReset: resetFilters,
    onShare: share,
    onFit: () => siteMap.fitTo(applyFilters(allData, filters)),
    onCloseDetail: closeDetail,
    onFlyTo: (dc) => siteMap.flyTo(dc, 12),
    onFilterByOperator: (op) => {
      filters.operator = op;
      mapView.setFilters(filters);
      refresh();
      closeDetail();
      siteMap.fitTo(applyFilters(allData, filters));
    },
    onFilterByCountry: (code) => {
      filters.country = code;
      mapView.setFilters(filters);
      refresh();
      closeDetail();
      siteMap.fitTo(applyFilters(allData, filters));
    },
  });
  mapView.init(allData, countryNames);
  injectIcons();

  siteMap = createMap("map", view, getTheme(), {
    onSelect: selectSite,
    onMove: (v) => {
      view = v;
      updateUrl();
    },
  });
  wireTheme();
  wireNav();
  refresh();
  showPage(page, { push: false });

  // Start with the sidebar collapsed on small screens.
  if (window.matchMedia("(max-width: 760px)").matches) mapView.openSidebar(false);
  setLoader(null);
}

main().catch((err: unknown) => {
  console.error(err);
  const loader = document.getElementById("loader")!;
  loader.innerHTML = `<div class="card" style="max-width:420px">${errorState(err instanceof Error ? err.message : String(err), "retry")}</div>`;
  loader.querySelector("#retry")?.addEventListener("click", () => location.reload());
});
