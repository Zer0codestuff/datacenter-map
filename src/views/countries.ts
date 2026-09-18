/** Countries view: searchable, sortable table + sticky country detail panel. */

import type { DataCenter, GlobalStats, CountryStat } from "../types";
import { TIERS } from "../types";
import { aggregate } from "../stats";
import { barList, emptyState, kpi, th, compareValues } from "../ui/components";
import { icons } from "../ui/icons";
import { esc, formatNumber, formatMw, titleCase } from "../ui/format";

export interface CountriesCallbacks {
  onShowOnMap: (code: string) => void;
}

type SortKey = "name" | "count" | "total_power_mw" | "power_known" | "share";

export class CountriesView {
  private sortKey: SortKey = "count";
  private asc = false;
  private query = "";
  private selected: string | null = null;
  private rows: (CountryStat & { share: number })[];

  constructor(private root: HTMLElement, private stats: GlobalStats, private records: DataCenter[], private cb: CountriesCallbacks) {
    const total = Math.max(1, stats.total_sites);
    this.rows = stats.countries.filter((c) => c.code !== "??").map((c) => ({ ...c, share: (c.count / total) * 100 }));
    this.selected = this.rows.slice().sort((a, b) => b.count - a.count)[0]?.code ?? null;
    this.render();
  }

  select(code: string): void {
    this.selected = code;
    this.renderTable();
    this.renderDetail();
  }

  private render(): void {
    this.root.innerHTML = `
      <div class="section-head">
        <div>
          <div class="section-head__eyebrow">Countries</div>
          <h1>Where the world's data centers are</h1>
          <p>${formatNumber(this.rows.length)} countries and territories. Select a row for the breakdown by type, tier and operator.</p>
        </div>
      </div>
      <div class="split">
        <div>
          <div class="toolbar">
            <label class="search-wrap">${icons.search}<span class="visually-hidden">Filter countries</span>
              <input class="input input--search" id="country-search" type="search" placeholder="Filter countries…" autocomplete="off" /></label>
            <span class="toolbar__meta" id="country-meta"></span>
          </div>
          <div class="table-wrap countries-table-wrap" id="country-table-wrap"></div>
        </div>
        <aside class="split__aside" id="country-detail" aria-live="polite"></aside>
      </div>`;
    (this.root.querySelector("#country-search") as HTMLInputElement).addEventListener("input", (e) => {
      this.query = (e.target as HTMLInputElement).value.trim().toLowerCase();
      this.renderTable();
    });
    this.renderTable();
    this.renderDetail();
  }

  private renderTable(): void {
    const wrap = this.root.querySelector("#country-table-wrap") as HTMLElement;
    const meta = this.root.querySelector("#country-meta") as HTMLElement;
    const visible = this.rows
      .filter((r) => !this.query || r.name.toLowerCase().includes(this.query) || r.code.toLowerCase() === this.query)
      .sort((a, b) => {
        const cmp = compareValues(a[this.sortKey], b[this.sortKey]);
        return this.asc ? cmp : -cmp;
      });
    meta.textContent = `${formatNumber(visible.length)} of ${formatNumber(this.rows.length)}`;

    if (!visible.length) {
      wrap.innerHTML = emptyState("No country matches that search.", { icon: "search" });
      return;
    }
    const maxCount = Math.max(1, ...this.rows.map((r) => r.count));
    const o = { sortKey: this.sortKey, asc: this.asc };
    wrap.innerHTML = `<table class="table table--interactive" aria-label="Countries">
      <thead><tr>
        ${th("name", "Country", o)}
        ${th("count", "Sites", { ...o, num: true })}
        ${th("share", "Share", { ...o, num: true })}
        ${th("total_power_mw", "Known capacity", { ...o, num: true })}
        ${th("power_known", "With MW data", { ...o, num: true })}
      </tr></thead>
      <tbody>${visible
        .map(
          (c) => `<tr tabindex="0" data-code="${esc(c.code)}" class="${c.code === this.selected ? "is-selected" : ""}" aria-selected="${c.code === this.selected}">
            <td class="is-name">${esc(c.name)} <span class="is-muted mono" style="font-size:11px;margin-left:4px">${esc(c.code)}</span></td>
            <td class="is-num"><span class="cell-bar"><span class="bar-track"><span class="bar-fill" style="width:${(c.count / maxCount) * 100}%"></span></span>${formatNumber(c.count)}</span></td>
            <td class="is-num is-muted">${c.share.toFixed(1)}%</td>
            <td class="is-num">${c.total_power_mw > 0 ? formatMw(c.total_power_mw) : '<span class="is-muted">—</span>'}</td>
            <td class="is-num is-muted">${c.power_known}</td>
          </tr>`,
        )
        .join("")}</tbody></table>`;

    wrap.querySelectorAll<HTMLElement>("th.is-sortable").forEach((cell) =>
      cell.addEventListener("click", () => {
        const k = cell.dataset.k as SortKey;
        if (k === this.sortKey) this.asc = !this.asc;
        else {
          this.sortKey = k;
          this.asc = k === "name";
        }
        this.renderTable();
      }),
    );
    wrap.querySelectorAll<HTMLElement>("tbody tr").forEach((tr) => {
      const pick = () => this.select(tr.dataset.code!);
      tr.addEventListener("click", pick);
      tr.addEventListener("keydown", (e) => e.key === "Enter" && pick());
    });
  }

  private renderDetail(): void {
    const el = this.root.querySelector("#country-detail") as HTMLElement;
    const stat = this.rows.find((c) => c.code === this.selected);
    if (!stat) {
      el.innerHTML = `<div class="card">${emptyState("Select a country to see its breakdown.", { icon: "globe" })}</div>`;
      return;
    }
    const recs = this.records.filter((d) => d.country === stat.code);
    const agg = aggregate(recs);
    el.innerHTML = `<div class="card" style="display:flex;flex-direction:column;gap:20px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px">
        <div>
          <div class="section-head__eyebrow" style="margin-bottom:4px">${esc(stat.code)}</div>
          <h2>${esc(stat.name)}</h2>
        </div>
        <button class="btn btn--primary btn--sm" id="country-map">${icons.map}Show on map</button>
      </div>
      <div class="kpi-grid" style="margin:0;grid-template-columns:repeat(2,1fr)">
        ${kpi(formatNumber(agg.count), "Sites", `${stat.share.toFixed(1)}% of world`)}
        ${kpi(agg.totalPowerMw > 0 ? formatMw(agg.totalPowerMw) : "—", "Known capacity", `${agg.powerKnown} site${agg.powerKnown === 1 ? "" : "s"} with data`)}
      </div>
      <div><h4 class="card__title" style="margin-bottom:10px">By confidence tier</h4>
        ${barList(TIERS.map((t) => ({ label: titleCase(t), value: agg.byTier[t] ?? 0, variant: t })).filter((e) => e.value > 0), { total: agg.count })}</div>
      <div><h4 class="card__title" style="margin-bottom:10px">By facility type</h4>
        ${barList(Object.entries(agg.byType).sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label: titleCase(label), value })), { total: agg.count })}</div>
      <div><h4 class="card__title" style="margin-bottom:10px">Top operators</h4>
        ${barList(agg.topOperators.slice(0, 8).map((o) => ({ label: o.operator, value: o.count })), { emptyText: "No operator data" })}</div>
    </div>`;
    el.querySelector("#country-map")!.addEventListener("click", () => this.cb.onShowOnMap(stat.code));
  }
}
