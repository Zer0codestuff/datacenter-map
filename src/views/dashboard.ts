/** Global dashboard: headline KPIs, distribution charts, growth, operators, largest sites. */

import type { DataCenter, GlobalStats } from "../types";
import { TIERS } from "../types";
import { estimateAnnualTWh, largestSites } from "../stats";
import { kpi, barList, columnChart, emptyState, tierDot } from "../ui/components";
import { esc, formatNumber, formatMw, titleCase } from "../ui/format";

export interface DashboardCallbacks {
  onSelectSite: (dc: DataCenter) => void;
  onSelectOperator: (operator: string) => void;
}

export function renderDashboard(root: HTMLElement, stats: GlobalStats, records: DataCenter[], cb: DashboardCallbacks): void {
  const twh = estimateAnnualTWh(stats.total_power_mw_known);
  const knownShare = (stats.sites_with_power_data / Math.max(1, stats.total_sites)) * 100;
  const years = Object.entries(stats.by_year)
    .map(([y, n]) => [y, n] as [string, number])
    .filter(([y]) => Number(y) >= 1990)
    .sort((a, b) => a[0].localeCompare(b[0]));
  const largest = largestSites(records, 20);

  root.innerHTML = `
    <div class="section-head">
      <div>
        <div class="section-head__eyebrow">Global dashboard</div>
        <h1>The world's compute footprint</h1>
        <p>Headline numbers across every mapped site. Power figures are a lower bound: only ${knownShare.toFixed(1)}% of sites publish capacity.</p>
      </div>
      <div class="kpi__note">Dataset generated ${esc(stats.generated.slice(0, 10))}</div>
    </div>

    <div class="kpi-grid">
      ${kpi(formatNumber(stats.total_sites), "Mapped sites", "Across all confidence tiers")}
      ${kpi(formatNumber(stats.total_countries), "Countries & territories")}
      ${kpi(formatMw(stats.total_power_mw_known), "Known power capacity", "Lower bound — sum of published MW")}
      ${kpi(formatNumber(twh, 1), "Estimated energy", "If known capacity ran 8,760 h/yr", "TWh / yr")}
      ${kpi(formatNumber(stats.sites_with_power_data), "Sites with power data", `${knownShare.toFixed(1)}% of all sites`)}
    </div>

    <div class="card-grid">
      <div class="card">
        <div class="card__title">Sites by facility type <small>share of total</small></div>
        ${barList(
          Object.entries(stats.by_type)
            .sort((a, b) => b[1] - a[1])
            .map(([label, value]) => ({ label: titleCase(label), value })),
          { total: stats.total_sites },
        )}
      </div>
      <div class="card">
        <div class="card__title">Sites by confidence tier</div>
        ${barList(TIERS.map((t) => ({ label: titleCase(t), value: stats.by_tier[t] ?? 0, variant: t })), { total: stats.total_sites })}
        <div class="divider"></div>
        <p class="kpi__note">Tiers describe how well a site is documented — see Methodology. Marker colours on the map follow the same scale.</p>
      </div>
      <div class="card card--wide">
        <div class="card__title">Sites by year opened <small>${years.length ? `${years[0][0]} – ${years[years.length - 1][0]}, where the year is known` : ""}</small></div>
        ${columnChart(years, { height: 200 })}
      </div>
      <div class="card">
        <div class="card__title">Top operators <small>by number of sites</small></div>
        <div id="dash-operators">${barList(stats.top_operators.slice(0, 15).map((o) => ({ label: o.operator, value: o.count })))}</div>
        <p class="kpi__note" style="margin-top:12px">Click an operator to see its sites on the map.</p>
      </div>
      <div class="card">
        <div class="card__title">Top countries <small>by number of sites</small></div>
        ${barList(
          stats.countries
            .filter((c) => c.code !== "??")
            .slice()
            .sort((a, b) => b.count - a.count)
            .slice(0, 15)
            .map((c) => ({ label: c.name, value: c.count })),
          { total: stats.total_sites },
        )}
      </div>
    </div>

    <div class="section-head">
      <div>
        <div class="section-head__eyebrow">Leaderboard</div>
        <h2>Largest sites by known power capacity</h2>
        <p>Only sites with a published or estimated (≈) capacity figure appear here.</p>
      </div>
    </div>
    ${largest.length
      ? `<div class="table-wrap"><table class="table table--interactive" id="largest-table">
        <thead><tr><th scope="col" class="is-num">#</th><th scope="col">Site</th><th scope="col">Operator</th><th scope="col">Country</th><th scope="col">Tier</th><th scope="col" class="is-num">Capacity</th></tr></thead>
        <tbody>${largest
          .map(
            (r, i) => `<tr tabindex="0" data-id="${esc(r.id)}">
              <td class="is-num is-muted">${i + 1}</td>
              <td class="is-name">${esc(r.name)}</td>
              <td class="is-muted">${esc(r.operator ?? "—")}</td>
              <td class="is-muted">${esc(r.country ?? "—")}</td>
              <td>${tierDot(r.tier)} ${titleCase(r.tier)}</td>
              <td class="is-num"><span class="cell-bar"><span class="bar-track"><span class="bar-fill" style="width:${((r.power_capacity_mw ?? 0) / (largest[0].power_capacity_mw ?? 1)) * 100}%"></span></span>${formatMw(r.power_capacity_mw, r.power_capacity_mw_estimated)}</span></td>
            </tr>`,
          )
          .join("")}</tbody></table></div>`
      : emptyState("No sites with power data in the current dataset.")}
  `;

  root.querySelectorAll<HTMLElement>("#largest-table tbody tr").forEach((tr) => {
    const go = () => {
      const dc = records.find((r) => r.id === tr.dataset.id);
      if (dc) cb.onSelectSite(dc);
    };
    tr.addEventListener("click", go);
    tr.addEventListener("keydown", (e) => e.key === "Enter" && go());
  });
  root.querySelectorAll<HTMLElement>("#dash-operators .bar-row").forEach((row, i) => {
    row.style.cursor = "pointer";
    row.setAttribute("tabindex", "0");
    row.setAttribute("role", "button");
    const op = stats.top_operators[i]?.operator;
    if (!op) return;
    row.addEventListener("click", () => cb.onSelectOperator(op));
    row.addEventListener("keydown", (e) => e.key === "Enter" && cb.onSelectOperator(op));
  });
}
