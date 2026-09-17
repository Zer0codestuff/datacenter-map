import { describe, it, expect } from "vitest";
import { defaultFilters, matchesFilters, encodeState, decodeState, applyFilters } from "../src/state";
import { aggregate, median, estimateAnnualTWh, largestSites, compareCountries } from "../src/stats";
import type { DataCenter } from "../src/types";

const dc = (over: Partial<DataCenter> = {}): DataCenter => ({
  id: "dc-1", name: "Test DC", operator: "Equinix", owner: null,
  lat: 51.5, lng: -0.1, country: "GB", city: "London",
  tier: "confirmed", status: "operational", type: "colocation",
  purpose: null, power_capacity_mw: 50, power_capacity_mw_estimated: false,
  it_load_mw: null, pue: null, area_sqm: null, num_buildings: null,
  year_opened: 2010, cooling_type: null, renewable_notes: null,
  connectivity: null, sources: [{ url: "https://example.com" }],
  ...over,
});

describe("filters", () => {
  it("passes with default filters", () => {
    expect(matchesFilters(dc(), defaultFilters())).toBe(true);
  });
  it("filters by tier", () => {
    const f = defaultFilters();
    f.tiers.delete("confirmed");
    expect(matchesFilters(dc(), f)).toBe(false);
  });
  it("filters by power range, excluding null power", () => {
    const f = defaultFilters();
    f.minMw = 100;
    expect(matchesFilters(dc(), f)).toBe(false);
    expect(matchesFilters(dc({ power_capacity_mw: null }), f)).toBe(false);
    expect(matchesFilters(dc({ power_capacity_mw: 150 }), f)).toBe(true);
  });
  it("filters by search across name/operator/city", () => {
    const f = defaultFilters();
    f.search = "london";
    expect(matchesFilters(dc(), f)).toBe(true);
    f.search = "paris";
    expect(matchesFilters(dc(), f)).toBe(false);
  });
  it("applyFilters returns subset", () => {
    const f = defaultFilters();
    f.country = "GB";
    expect(applyFilters([dc(), dc({ id: "x", country: "DE" })], f)).toHaveLength(1);
  });
});

describe("URL state", () => {
  it("round-trips filters and view", () => {
    const f = defaultFilters();
    f.tiers = new Set(["confirmed"]);
    f.country = "DE";
    f.search = "frankfurt";
    f.minMw = 10;
    const hash = encodeState(f, { lat: 50.1, lng: 8.68, zoom: 6 });
    const decoded = decodeState(hash);
    expect(decoded.filters.country).toBe("DE");
    expect(decoded.filters.search).toBe("frankfurt");
    expect(decoded.filters.minMw).toBe(10);
    expect([...decoded.filters.tiers]).toEqual(["confirmed"]);
    expect(decoded.view.zoom).toBeCloseTo(6);
    expect(decoded.view.lat).toBeCloseTo(50.1);
  });
  it("ignores invalid values", () => {
    const { filters, view } = decodeState("#tiers=bogus&z=99&lat=200");
    expect(filters.tiers.size).toBe(3);
    expect(view.zoom).toBe(20);
    expect(view.lat).toBe(85);
  });
  it("decodes empty hash to defaults", () => {
    const { filters } = decodeState("");
    expect(filters.country).toBeNull();
    expect(filters.statuses.size).toBe(4);
  });
});

describe("stats", () => {
  it("computes median", () => {
    expect(median([1, 2, 3])).toBe(2);
    expect(median([1, 2, 3, 4])).toBe(2.5);
    expect(median([])).toBeNull();
  });
  it("aggregates records", () => {
    const agg = aggregate([dc(), dc({ id: "2", power_capacity_mw: 100, tier: "probable" })]);
    expect(agg.count).toBe(2);
    expect(agg.totalPowerMw).toBe(150);
    expect(agg.medianPowerMw).toBe(75);
    expect(agg.byTier.probable).toBe(1);
    expect(agg.topOperators[0].operator).toBe("Equinix");
  });
  it("estimates annual TWh", () => {
    expect(estimateAnnualTWh(1000)).toBeCloseTo(8.76);
  });
  it("ranks largest sites and skips null power", () => {
    const sites = largestSites([dc({ power_capacity_mw: null }), dc({ id: "b", power_capacity_mw: 900 })], 5);
    expect(sites).toHaveLength(1);
    expect(sites[0].id).toBe("b");
  });
  it("compares countries", () => {
    const a = { code: "US", name: "United States", count: 10, total_power_mw: 500, power_known: 5, by_type: { colocation: 10 }, by_tier: {}, operators: {} };
    const b = { code: "DE", name: "Germany", count: 4, total_power_mw: 100, power_known: 2, by_type: { hyperscale: 4 }, by_tier: {}, operators: {} };
    const rows = compareCountries(a, b);
    expect(rows[0].a).toBe(10);
    expect(rows.find((r) => r.label.includes("hyperscale"))!.a).toBe(0);
  });
});
