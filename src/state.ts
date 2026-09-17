/** Filter logic and shareable URL state encoding/decoding. */

import type { DataCenter, Filters, Tier, Status, SiteType } from "./types";
import { TIERS, STATUSES, SITE_TYPES } from "./types";

export function defaultFilters(): Filters {
  return {
    tiers: new Set(TIERS),
    statuses: new Set(STATUSES),
    types: new Set(SITE_TYPES),
    country: null,
    operator: null,
    minMw: null,
    maxMw: null,
    minYear: null,
    maxYear: null,
    search: "",
  };
}

/** Returns true when a record passes every active filter. */
export function matchesFilters(dc: DataCenter, f: Filters): boolean {
  if (!f.tiers.has(dc.tier)) return false;
  if (!f.statuses.has(dc.status)) return false;
  if (!f.types.has(dc.type)) return false;
  if (f.country && dc.country !== f.country) return false;
  if (f.operator && dc.operator !== f.operator) return false;
  if (f.minMw !== null && (dc.power_capacity_mw === null || dc.power_capacity_mw < f.minMw)) return false;
  if (f.maxMw !== null && (dc.power_capacity_mw === null || dc.power_capacity_mw > f.maxMw)) return false;
  if (f.minYear !== null && (dc.year_opened === null || dc.year_opened < f.minYear)) return false;
  if (f.maxYear !== null && (dc.year_opened === null || dc.year_opened > f.maxYear)) return false;
  if (f.search) {
    const q = f.search.toLowerCase();
    const hay = [dc.name, dc.operator, dc.city, dc.country].filter(Boolean).join(" ").toLowerCase();
    if (!hay.includes(q)) return false;
  }
  return true;
}

export function applyFilters(data: DataCenter[], f: Filters): DataCenter[] {
  return data.filter((dc) => matchesFilters(dc, f));
}

export interface ViewState {
  lat: number;
  lng: number;
  zoom: number;
}

/** Encode filters + map view into a URL hash for shareable state. */
export function encodeState(f: Filters, view: ViewState): string {
  const p = new URLSearchParams();
  p.set("z", view.zoom.toFixed(2));
  p.set("lat", view.lat.toFixed(4));
  p.set("lng", view.lng.toFixed(4));
  if (f.tiers.size !== TIERS.length) p.set("tiers", [...f.tiers].join(","));
  if (f.statuses.size !== STATUSES.length) p.set("status", [...f.statuses].join(","));
  if (f.types.size !== SITE_TYPES.length) p.set("types", [...f.types].join(","));
  if (f.country) p.set("country", f.country);
  if (f.operator) p.set("operator", f.operator);
  if (f.minMw !== null) p.set("minmw", String(f.minMw));
  if (f.maxMw !== null) p.set("maxmw", String(f.maxMw));
  if (f.minYear !== null) p.set("minyear", String(f.minYear));
  if (f.maxYear !== null) p.set("maxyear", String(f.maxYear));
  if (f.search) p.set("q", f.search);
  return "#" + p.toString();
}

function parseSet<T extends string>(raw: string | null, allowed: readonly T[]): Set<T> {
  if (!raw) return new Set(allowed);
  const vals = raw.split(",").filter((v): v is T => (allowed as readonly string[]).includes(v));
  return vals.length ? new Set(vals) : new Set(allowed);
}

function parseNum(raw: string | null): number | null {
  if (raw === null) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

/** Decode a URL hash back into filters + view. Unknown values are ignored. */
export function decodeState(hash: string): { filters: Filters; view: ViewState } {
  const f = defaultFilters();
  const view: ViewState = { lat: 20, lng: 10, zoom: 2 };
  const raw = hash.replace(/^#/, "");
  if (!raw) return { filters: f, view };
  const p = new URLSearchParams(raw);
  f.tiers = parseSet(p.get("tiers"), TIERS) as Set<Tier>;
  f.statuses = parseSet(p.get("status"), STATUSES) as Set<Status>;
  f.types = parseSet(p.get("types"), SITE_TYPES) as Set<SiteType>;
  f.country = p.get("country");
  f.operator = p.get("operator");
  f.minMw = parseNum(p.get("minmw"));
  f.maxMw = parseNum(p.get("maxmw"));
  f.minYear = parseNum(p.get("minyear"));
  f.maxYear = parseNum(p.get("maxyear"));
  f.search = p.get("q") ?? "";
  const z = parseNum(p.get("z"));
  const lat = parseNum(p.get("lat"));
  const lng = parseNum(p.get("lng"));
  if (z !== null) view.zoom = Math.min(20, Math.max(0, z));
  if (lat !== null) view.lat = Math.min(85, Math.max(-85, lat));
  if (lng !== null) view.lng = Math.min(180, Math.max(-180, lng));
  return { filters: f, view };
}
