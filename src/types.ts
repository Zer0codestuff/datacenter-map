/** Shared types for the datacenter-map front-end. */

export type Tier = "confirmed" | "probable" | "theorized";
export type Status = "operational" | "under construction" | "planned" | "decommissioned";
export type SiteType =
  | "hyperscale" | "colocation" | "enterprise" | "edge"
  | "hpc/supercomputer" | "government" | "crypto mining" | "ai training";

export interface Source {
  url: string;
  retrieved?: string | null;
}

export interface DataCenter {
  id: string;
  name: string;
  operator: string | null;
  owner: string | null;
  lat: number;
  lng: number;
  country: string | null;
  city: string | null;
  tier: Tier;
  status: Status;
  type: SiteType;
  purpose: string | null;
  power_capacity_mw: number | null;
  power_capacity_mw_estimated: boolean;
  it_load_mw: number | null;
  pue: number | null;
  area_sqm: number | null;
  num_buildings: number | null;
  year_opened: number | null;
  cooling_type: string | null;
  renewable_notes: string | null;
  connectivity: string | null;
  sources: Source[];
}

export interface CountryStat {
  code: string;
  name: string;
  count: number;
  total_power_mw: number;
  power_known: number;
  by_type: Record<string, number>;
  by_tier: Record<string, number>;
  operators: Record<string, number>;
}

export interface GlobalStats {
  generated: string;
  total_sites: number;
  total_countries: number;
  total_power_mw_known: number;
  sites_with_power_data: number;
  by_type: Record<string, number>;
  by_tier: Record<string, number>;
  by_year: Record<string, number>;
  top_operators: { operator: string; count: number }[];
  countries: CountryStat[];
}

export interface Filters {
  tiers: Set<Tier>;
  statuses: Set<Status>;
  types: Set<SiteType>;
  country: string | null;
  operator: string | null;
  minMw: number | null;
  maxMw: number | null;
  minYear: number | null;
  maxYear: number | null;
  search: string;
}

export const TIER_COLORS: Record<Tier, string> = {
  confirmed: "#22c55e",
  probable: "#f59e0b",
  theorized: "#a855f7",
};

export const TIERS: Tier[] = ["confirmed", "probable", "theorized"];
export const STATUSES: Status[] = ["operational", "under construction", "planned", "decommissioned"];
export const SITE_TYPES: SiteType[] = [
  "hyperscale", "colocation", "enterprise", "edge",
  "hpc/supercomputer", "government", "crypto mining", "ai training",
];
