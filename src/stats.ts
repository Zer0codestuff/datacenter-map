/** Aggregation helpers for dashboards, country stats and the compare view. */

import type { DataCenter, CountryStat } from "./types";

export interface Aggregate {
  count: number;
  totalPowerMw: number;
  powerKnown: number;
  medianPowerMw: number | null;
  byType: Record<string, number>;
  byTier: Record<string, number>;
  topOperators: { operator: string; count: number }[];
}

export function median(values: number[]): number | null {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export function aggregate(records: DataCenter[]): Aggregate {
  const powers: number[] = [];
  const byType: Record<string, number> = {};
  const byTier: Record<string, number> = {};
  const ops: Record<string, number> = {};
  for (const r of records) {
    if (r.power_capacity_mw !== null) powers.push(r.power_capacity_mw);
    byType[r.type] = (byType[r.type] ?? 0) + 1;
    byTier[r.tier] = (byTier[r.tier] ?? 0) + 1;
    if (r.operator) ops[r.operator] = (ops[r.operator] ?? 0) + 1;
  }
  return {
    count: records.length,
    totalPowerMw: powers.reduce((a, b) => a + b, 0),
    powerKnown: powers.length,
    medianPowerMw: median(powers),
    byType,
    byTier,
    topOperators: Object.entries(ops)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([operator, count]) => ({ operator, count })),
  };
}

/** Estimated annual energy use in TWh from known power capacity (MW * 8760 h). */
export function estimateAnnualTWh(totalMw: number): number {
  return (totalMw * 8760) / 1e6;
}

export function largestSites(records: DataCenter[], n = 25): DataCenter[] {
  return records
    .filter((r) => r.power_capacity_mw !== null)
    .sort((a, b) => (b.power_capacity_mw ?? 0) - (a.power_capacity_mw ?? 0))
    .slice(0, n);
}

/** Compare two country stats side by side. */
export function compareCountries(a: CountryStat, b: CountryStat) {
  const rows: { label: string; a: string | number; b: string | number }[] = [
    { label: "Data centers", a: a.count, b: b.count },
    { label: "Known power capacity (MW)", a: round1(a.total_power_mw), b: round1(b.total_power_mw) },
    { label: "Sites with power data", a: a.power_known, b: b.power_known },
  ];
  const allTypes = new Set([...Object.keys(a.by_type), ...Object.keys(b.by_type)]);
  for (const t of allTypes) {
    rows.push({ label: `Type: ${t}`, a: a.by_type[t] ?? 0, b: b.by_type[t] ?? 0 });
  }
  return rows;
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function formatNumber(n: number): string {
  return n.toLocaleString("en-US");
}
