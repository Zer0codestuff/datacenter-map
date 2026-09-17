/** Dashboard, country table and compare view rendering. */

import type { DataCenter, GlobalStats, CountryStat } from "./types";
import { TIER_COLORS } from "./types";
import { aggregate, estimateAnnualTWh, largestSites, compareCountries, formatNumber, round1 } from "./stats";

function barChart(el: HTMLElement, entries: [string, number][], color = "#38bdf8"): void {
  const max = Math.max(1, ...entries.map(([, v]) => v));
  el.innerHTML = entries
    .map(
      ([label, v]) =>
        `<div class="bar-row"><span class="bar-label" title="${label}">${label}</span>` +
        `<span class="bar" style="width:${(v / max) * 100}%;background:${color}"></span>` +
        `<span class="bar-val">${formatNumber(v)}</span></div>`,
    )
    .join("");
}

export function renderDashboard(stats: GlobalStats, records: DataCenter[]): void {
  const headline = document.getElementById("headline")!;
  const twh = round1(estimateAnnualTWh(stats.total_power_mw_known));
  headline.innerHTML = [
    [formatNumber(stats.total_sites), "mapped sites"],
    [formatNumber(stats.total_countries), "countries"],
    [`${formatNumber(Math.round(stats.total_power_mw_known))} MW`, "known power capacity (lower bound)"],
    [`${formatNumber(twh)} TWh/yr`, "estimated annual energy (from known MW)"],
    [formatNumber(stats.sites_with_power_data), "sites with power data"],
  ]
    .map(([num, lbl]) => `<div class="card"><div class="num">${num}</div><div class="lbl">${lbl}</div></div>`)
    .join("");

  barChart(
    document.getElementById("chart-type")!,
    Object.entries(stats.by_type).sort((a, b) => b[1] - a[1]),
  );
  const tierEl = document.getElementById("chart-tier")!;
  tierEl.innerHTML = "";
  for (const [tier, count] of Object.entries(stats.by_tier)) {
    const div = document.createElement("div");
    tierEl.appendChild(div);
    barChart(div, [[tier, count]], TIER_COLORS[tier as keyof typeof TIER_COLORS] ?? "#38bdf8");
  }
  barChart(
    document.getElementById("chart-year")!,
    Object.entries(stats.by_year).sort((a, b) => a[0].localeCompare(b[0])),
  );
  barChart(
    document.getElementById("chart-operators")!,
    stats.top_operators.map((o) => [o.operator, o.count]),
  );

  const table = document.getElementById("largest-table")!;
  const rows = largestSites(records, 25);
  table.innerHTML =
    "<thead><tr><th>#</th><th>Name</th><th>Operator</th><th>Country</th><th>MW</th><th>Tier</th></tr></thead><tbody>" +
    rows
      .map(
        (r, i) =>
          `<tr><td>${i + 1}</td><td>${esc(r.name)}</td><td>${esc(r.operator ?? "—")}</td>` +
          `<td>${esc(r.country ?? "?")}</td><td>${r.power_capacity_mw}${r.power_capacity_mw_estimated ? " (est.)" : ""}</td>` +
          `<td>${r.tier}</td></tr>`,
      )
      .join("") +
    "</tbody>";
}

export function renderCountryTable(stats: GlobalStats, onPick: (code: string) => void): void {
  const table = document.getElementById("country-table")!;
  const countries = [...stats.countries];
  let sortKey: keyof CountryStat = "count";
  let asc = false;

  const draw = () => {
    countries.sort((a, b) => {
      const va = a[sortKey], vb = b[sortKey];
      const cmp = typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb));
      return asc ? cmp : -cmp;
    });
    table.innerHTML =
      `<thead><tr>${["name", "code", "count", "total_power_mw", "power_known"]
        .map((k) => `<th data-k="${k}">${{ name: "Country", code: "ISO", count: "Sites", total_power_mw: "Known MW", power_known: "MW data" }[k]}</th>`)
        .join("")}</tr></thead><tbody>` +
      countries
        .filter((c) => c.code !== "??")
        .map(
          (c) =>
            `<tr data-code="${c.code}"><td>${esc(c.name)}</td><td>${c.code}</td><td>${c.count}</td>` +
            `<td>${formatNumber(Math.round(c.total_power_mw))}</td><td>${c.power_known}</td></tr>`,
        )
        .join("") +
      "</tbody>";
    table.querySelectorAll("th").forEach((th) =>
      th.addEventListener("click", () => {
        const k = (th as HTMLElement).dataset.k as keyof CountryStat;
        if (k === sortKey) asc = !asc;
        else { sortKey = k; asc = false; }
        draw();
      }),
    );
    table.querySelectorAll("tbody tr").forEach((tr) =>
      tr.addEventListener("click", () => onPick((tr as HTMLElement).dataset.code!)),
    );
  };
  draw();
}

export function renderCountryDetail(stat: CountryStat, records: DataCenter[]): void {
  const el = document.getElementById("country-detail")!;
  const agg = aggregate(records);
  el.innerHTML =
    `<h3>${esc(stat.name)} (${stat.code})</h3>` +
    `<div class="cards">` +
    `<div class="card"><div class="num">${agg.count}</div><div class="lbl">sites</div></div>` +
    `<div class="card"><div class="num">${formatNumber(Math.round(agg.totalPowerMw))} MW</div><div class="lbl">known capacity</div></div>` +
    `<div class="card"><div class="num">${agg.medianPowerMw ?? "—"} MW</div><div class="lbl">median (known)</div></div>` +
    `</div>` +
    `<h4>By type</h4><div id="cd-type" class="barchart"></div>` +
    `<h4>Top operators</h4><div id="cd-ops" class="barchart"></div>`;
  barChart(el.querySelector("#cd-type") as HTMLElement, Object.entries(agg.byType).sort((a, b) => b[1] - a[1]));
  barChart(el.querySelector("#cd-ops") as HTMLElement, agg.topOperators.map((o) => [o.operator, o.count]));
}

export function renderCompare(stats: GlobalStats): void {
  const selA = document.getElementById("compare-a") as HTMLSelectElement;
  const selB = document.getElementById("compare-b") as HTMLSelectElement;
  const table = document.getElementById("compare-table")!;
  const countries = stats.countries.filter((c) => c.code !== "??");
  const opts = countries.map((c) => `<option value="${c.code}">${esc(c.name)}</option>`).join("");
  if (!selA.options.length) {
    selA.innerHTML = opts;
    selB.innerHTML = opts;
    selA.value = "US";
    selB.value = "DE";
  }
  const draw = () => {
    const a = countries.find((c) => c.code === selA.value);
    const b = countries.find((c) => c.code === selB.value);
    if (!a || !b) return;
    const rows = compareCountries(a, b);
    table.innerHTML =
      `<thead><tr><th>Metric</th><th>${esc(a.name)}</th><th>${esc(b.name)}</th></tr></thead><tbody>` +
      rows.map((r) => `<tr><td>${esc(r.label)}</td><td>${r.a}</td><td>${r.b}</td></tr>`).join("") +
      "</tbody>";
  };
  selA.onchange = draw;
  selB.onchange = draw;
  draw();
}

export function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
