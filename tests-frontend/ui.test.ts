import { describe, it, expect } from "vitest";
import { formatMw, formatArea, compact, displayUrl, titleCase, esc, pct } from "../src/ui/format";
import { barList, columnChart, th, compareValues, badge, chip } from "../src/ui/components";
import { defaultFilters, encodeState, decodeState, activeFilterCount, isViewName } from "../src/state";

describe("format helpers", () => {
  it("formats megawatts and rolls up to gigawatts", () => {
    expect(formatMw(null)).toBe("—");
    expect(formatMw(5.25)).toBe("5.3 MW");
    expect(formatMw(120)).toBe("120 MW");
    expect(formatMw(1500)).toBe("1.5 GW");
    expect(formatMw(120, true)).toBe("≈120 MW");
  });
  it("formats area", () => {
    expect(formatArea(null)).toBe("—");
    expect(formatArea(2500)).toBe("2,500 m²");
    expect(formatArea(2_500_000)).toBe("2.5 km²");
  });
  it("compacts large numbers", () => {
    expect(compact(950)).toBe("950");
    expect(compact(4113)).toBe("4.1k");
    expect(compact(1_200_000)).toBe("1.2M");
  });
  it("shortens URLs for display", () => {
    expect(displayUrl("https://www.example.com/path/")).toBe("example.com/path");
    expect(displayUrl("https://example.com/" + "a".repeat(80)).endsWith("…")).toBe(true);
  });
  it("title-cases labels with domain acronyms", () => {
    expect(titleCase("hpc/supercomputer")).toBe("HPC/Supercomputer");
    expect(titleCase("ai training")).toBe("AI Training");
    expect(titleCase("under construction")).toBe("Under Construction");
  });
  it("escapes HTML", () => {
    expect(esc(`<a href="x">&'</a>`)).toBe("&lt;a href=&quot;x&quot;&gt;&amp;&#39;&lt;/a&gt;");
  });
  it("computes percentages safely", () => {
    expect(pct(1, 4)).toBe(25);
    expect(pct(1, 0)).toBe(0);
  });
});

describe("components", () => {
  it("renders a bar list scaled to the max value", () => {
    const html = barList([{ label: "A", value: 10 }, { label: "B", value: 5, variant: "confirmed" }]);
    expect(html).toContain("width:100.00%");
    expect(html).toContain("width:50.00%");
    expect(html).toContain("bar-fill--confirmed");
  });
  it("renders an empty state when there is no data", () => {
    expect(barList([])).toContain("No data");
    expect(columnChart([])).toContain("No data");
  });
  it("renders a column chart with one rect per entry", () => {
    const html = columnChart([["2019", 3], ["2020", 6], ["2021", 1]]);
    expect(html.match(/<rect/g)).toHaveLength(3);
    expect(html).toContain("<title>2020: 6</title>");
  });
  it("marks the sorted header with aria-sort", () => {
    expect(th("count", "Sites", { sortKey: "count", asc: false, num: true })).toContain('aria-sort="descending"');
    expect(th("name", "Country", { sortKey: "count", asc: false })).not.toContain("aria-sort");
  });
  it("compares numbers numerically and strings by locale", () => {
    expect(compareValues(2, 10)).toBeLessThan(0);
    expect(compareValues("b", "a")).toBeGreaterThan(0);
    expect(compareValues(null, 1)).toBeLessThan(0);
  });
  it("escapes user content inside badges and chips", () => {
    expect(badge("<b>", "confirmed")).toContain("&lt;b&gt;");
    expect(chip("Operator", "<x>", 'data-remove="operator"')).toContain("&lt;x&gt;");
  });
});

describe("URL state: page + active filter count", () => {
  it("round-trips the active page and defaults to map", () => {
    const f = defaultFilters();
    const hash = encodeState(f, { lat: 1, lng: 2, zoom: 3 }, "countries");
    expect(hash).toContain("v=countries");
    expect(decodeState(hash).page).toBe("countries");
    expect(decodeState("#z=2").page).toBe("map");
    expect(decodeState("#v=bogus").page).toBe("map");
    expect(encodeState(f, { lat: 1, lng: 2, zoom: 3 }, "map")).not.toContain("v=");
  });
  it("validates view names", () => {
    expect(isViewName("dashboard")).toBe(true);
    expect(isViewName("nope")).toBe(false);
    expect(isViewName(null)).toBe(false);
  });
  it("counts active filters", () => {
    const f = defaultFilters();
    expect(activeFilterCount(f)).toBe(0);
    f.country = "DE";
    f.minMw = 5;
    f.search = "x";
    f.tiers = new Set(["confirmed"]);
    expect(activeFilterCount(f)).toBe(4);
  });
});
