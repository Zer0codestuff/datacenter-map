/** Compare view: two countries side by side with mirrored proportional bars. */

import type { GlobalStats, CountryStat } from "../types";
import { TIERS } from "../types";
import { icons } from "../ui/icons";
import { esc, formatNumber, formatMw, titleCase } from "../ui/format";

export class CompareView {
  private a: string;
  private b: string;
  private countries: CountryStat[];

  constructor(private root: HTMLElement, stats: GlobalStats) {
    this.countries = stats.countries.filter((c) => c.code !== "??").slice().sort((x, y) => x.name.localeCompare(y.name));
    const byCount = this.countries.slice().sort((x, y) => y.count - x.count);
    this.a = byCount[0]?.code ?? "";
    this.b = byCount[1]?.code ?? "";
    this.render();
  }

  private render(): void {
    const opts = (sel: string) => this.countries.map((c) => `<option value="${esc(c.code)}" ${c.code === sel ? "selected" : ""}>${esc(c.name)}</option>`).join("");
    this.root.innerHTML = `
      <div class="section-head">
        <div>
          <div class="section-head__eyebrow">Compare</div>
          <h1>Two countries, side by side</h1>
          <p>Bars show each value relative to the larger of the two. Capacity figures only include sites that publish power data.</p>
        </div>
      </div>
      <div class="compare-picker">
        <label class="field"><span class="field__label">Country A</span><select class="select" id="cmp-a">${opts(this.a)}</select></label>
        <button class="btn btn--icon" id="cmp-swap" aria-label="Swap countries" title="Swap">${icons.swap}</button>
        <label class="field"><span class="field__label">Country B</span><select class="select" id="cmp-b">${opts(this.b)}</select></label>
      </div>
      <div class="card" id="cmp-body"></div>`;
    (this.root.querySelector("#cmp-a") as HTMLSelectElement).addEventListener("change", (e) => {
      this.a = (e.target as HTMLSelectElement).value;
      this.renderBody();
    });
    (this.root.querySelector("#cmp-b") as HTMLSelectElement).addEventListener("change", (e) => {
      this.b = (e.target as HTMLSelectElement).value;
      this.renderBody();
    });
    this.root.querySelector("#cmp-swap")!.addEventListener("click", () => {
      [this.a, this.b] = [this.b, this.a];
      (this.root.querySelector("#cmp-a") as HTMLSelectElement).value = this.a;
      (this.root.querySelector("#cmp-b") as HTMLSelectElement).value = this.b;
      this.renderBody();
    });
    this.renderBody();
  }

  private renderBody(): void {
    const body = this.root.querySelector("#cmp-body") as HTMLElement;
    const A = this.countries.find((c) => c.code === this.a);
    const B = this.countries.find((c) => c.code === this.b);
    if (!A || !B) {
      body.innerHTML = `<div class="state">Select two countries.</div>`;
      return;
    }
    const rows: { label: string; a: number; b: number; fmt?: (n: number) => string }[] = [
      { label: "Data centers", a: A.count, b: B.count },
      { label: "Known capacity", a: A.total_power_mw, b: B.total_power_mw, fmt: (n) => (n > 0 ? formatMw(n) : "—") },
      { label: "Sites with MW data", a: A.power_known, b: B.power_known },
      ...TIERS.map((t) => ({ label: `${titleCase(t)} tier`, a: A.by_tier[t] ?? 0, b: B.by_tier[t] ?? 0 })),
      ...[...new Set([...Object.keys(A.by_type), ...Object.keys(B.by_type)])]
        .sort((x, y) => (B.by_type[y] ?? 0) + (A.by_type[y] ?? 0) - ((B.by_type[x] ?? 0) + (A.by_type[x] ?? 0)))
        .map((t) => ({ label: titleCase(t), a: A.by_type[t] ?? 0, b: B.by_type[t] ?? 0 })),
    ];
    const side = (v: number, max: number, cls: "a" | "b", winner: boolean, fmt?: (n: number) => string) =>
      `<div class="cmp-side cmp-side--${cls}${winner ? " is-winner" : ""}">
        <span class="num">${fmt ? fmt(v) : formatNumber(v)}</span>
        <span class="bar-track"><span class="bar-fill${winner ? "" : ""}" style="width:${max > 0 ? (v / max) * 100 : 0}%"></span></span>
      </div>`;
    body.innerHTML = `
      <div class="compare-head">
        <div class="kpi"><div class="kpi__value">${esc(A.name)}</div><div class="kpi__label">${formatNumber(A.count)} sites</div></div>
        <div class="vs">vs</div>
        <div class="kpi"><div class="kpi__value">${esc(B.name)}</div><div class="kpi__label">${formatNumber(B.count)} sites</div></div>
      </div>
      ${rows
        .map((r) => {
          const max = Math.max(r.a, r.b);
          return `<div class="cmp-row">
            ${side(r.a, max, "a", r.a > r.b, r.fmt)}
            <div class="cmp-row__label">${esc(r.label)}</div>
            ${side(r.b, max, "b", r.b > r.a, r.fmt)}
          </div>`;
        })
        .join("")}`;
  }
}
