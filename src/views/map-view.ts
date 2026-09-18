/**
 * Map view: filter sidebar, active-filter chips, legend, results bar,
 * empty state and the site-detail drawer. Pure DOM + string templates.
 */

import type { DataCenter, Filters, Tier, Status, SiteType } from "../types";
import { TIERS, STATUSES, SITE_TYPES } from "../types";
import { activeFilterCount, defaultFilters } from "../state";
import { icons } from "../ui/icons";
import { badge, chip, emptyState, metric } from "../ui/components";
import { esc, formatNumber, formatMw, formatArea, titleCase, displayUrl } from "../ui/format";

export interface MapViewCallbacks {
  onFiltersChange: () => void;
  onReset: () => void;
  onShare: () => void;
  onFit: () => void;
  onCloseDetail: () => void;
  onFlyTo: (dc: DataCenter) => void;
  onFilterByOperator: (op: string) => void;
  onFilterByCountry: (code: string) => void;
}

type SetKey = "tiers" | "statuses" | "types";

const STATUS_LABEL: Record<Status, string> = {
  operational: "Operational",
  "under construction": "Under construction",
  planned: "Planned",
  decommissioned: "Decommissioned",
};

export class MapView {
  private filters: Filters;
  private allData: DataCenter[] = [];
  private countryNames = new Map<string, string>();
  private counts = { tiers: new Map<string, number>(), statuses: new Map<string, number>(), types: new Map<string, number>() };
  private workspace = document.getElementById("workspace")!;

  constructor(filters: Filters, private cb: MapViewCallbacks) {
    this.filters = filters;
  }

  /* ------------------------------------------------------------------ setup */

  init(allData: DataCenter[], countryNames: Map<string, string>): void {
    this.allData = allData;
    this.countryNames = countryNames;
    for (const d of allData) {
      this.counts.tiers.set(d.tier, (this.counts.tiers.get(d.tier) ?? 0) + 1);
      this.counts.statuses.set(d.status, (this.counts.statuses.get(d.status) ?? 0) + 1);
      this.counts.types.set(d.type, (this.counts.types.get(d.type) ?? 0) + 1);
    }
    this.renderFilterGroups();
    this.renderLegend();
    this.wireChrome();
    this.syncInputs();
    document.getElementById("result-total")!.textContent = `of ${formatNumber(allData.length)} sites`;
  }

  setFilters(f: Filters): void {
    this.filters = f;
    this.syncInputs();
  }

  private renderFilterGroups(): void {
    const root = document.getElementById("filter-groups")!;
    const checks = (key: SetKey, values: readonly string[], label: (v: string) => string, dot?: boolean) =>
      values
        .map(
          (v) => `<label class="check">
            <input type="checkbox" data-f="${key}" value="${esc(v)}" />
            ${dot ? `<span class="dot dot--${v}"></span>` : ""}
            <span class="check__label">${esc(label(v))}</span>
            <span class="check__count num">${formatNumber(this.counts[key].get(v) ?? 0)}</span>
          </label>`,
        )
        .join("");

    const countries = [...this.countryNames.entries()].sort((a, b) => a[1].localeCompare(b[1]));
    const operators = [...new Set(this.allData.map((d) => d.operator).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b));

    root.innerHTML = `
      ${this.group("tiers", "Confidence tier", checks("tiers", TIERS, titleCase, true), true)}
      ${this.group("status", "Status", checks("statuses", STATUSES, (v) => STATUS_LABEL[v as Status]), true)}
      ${this.group("types", "Facility type", checks("types", SITE_TYPES, titleCase), false)}
      ${this.group("where", "Location & operator", `
        <label class="field"><span class="field__label">Country</span>
          <select class="select" id="country-filter"><option value="">All countries</option>${countries
            .map(([code, name]) => `<option value="${esc(code)}">${esc(name)}</option>`)
            .join("")}</select></label>
        <label class="field"><span class="field__label">Operator</span>
          <select class="select" id="operator-filter"><option value="">All operators</option>${operators
            .map((o) => `<option value="${esc(o)}">${esc(o)}</option>`)
            .join("")}</select></label>`, true)}
      ${this.group("ranges", "Capacity & age", `
        <div class="field"><span class="field__label">Power capacity (MW)</span>
          <div class="input-group">
            <input class="input num" id="min-mw" type="number" min="0" inputmode="decimal" placeholder="Min" aria-label="Minimum MW" />
            <input class="input num" id="max-mw" type="number" min="0" inputmode="decimal" placeholder="Max" aria-label="Maximum MW" />
          </div></div>
        <div class="field"><span class="field__label">Year opened</span>
          <div class="input-group">
            <input class="input num" id="min-year" type="number" inputmode="numeric" placeholder="From" aria-label="Opened from year" />
            <input class="input num" id="max-year" type="number" inputmode="numeric" placeholder="To" aria-label="Opened up to year" />
          </div></div>
        <div class="kpi__note">Range filters only match sites with known values.</div>`, false)}
    `;

    root.querySelectorAll<HTMLInputElement>("input[data-f]").forEach((cb) =>
      cb.addEventListener("change", () => {
        const set = this.filters[cb.dataset.f as SetKey] as Set<string>;
        if (cb.checked) set.add(cb.value);
        else set.delete(cb.value);
        this.cb.onFiltersChange();
      }),
    );
    root.querySelectorAll<HTMLElement>(".fgroup__head").forEach((head) =>
      head.addEventListener("click", () => {
        const g = head.closest(".fgroup")!;
        const open = g.getAttribute("aria-expanded") !== "false";
        g.setAttribute("aria-expanded", String(!open));
        head.setAttribute("aria-expanded", String(!open));
      }),
    );
    (document.getElementById("country-filter") as HTMLSelectElement).addEventListener("change", (e) => {
      this.filters.country = (e.target as HTMLSelectElement).value || null;
      this.cb.onFiltersChange();
    });
    (document.getElementById("operator-filter") as HTMLSelectElement).addEventListener("change", (e) => {
      this.filters.operator = (e.target as HTMLSelectElement).value || null;
      this.cb.onFiltersChange();
    });
    const num = (id: string, set: (v: number | null) => void) =>
      document.getElementById(id)!.addEventListener("input", (e) => {
        const raw = (e.target as HTMLInputElement).value;
        const v = raw === "" ? null : Number(raw);
        (e.target as HTMLInputElement).setAttribute("aria-invalid", String(v !== null && !Number.isFinite(v)));
        set(v !== null && Number.isFinite(v) ? v : null);
        this.cb.onFiltersChange();
      });
    num("min-mw", (v) => (this.filters.minMw = v));
    num("max-mw", (v) => (this.filters.maxMw = v));
    num("min-year", (v) => (this.filters.minYear = v));
    num("max-year", (v) => (this.filters.maxYear = v));
  }

  private group(id: string, title: string, body: string, open: boolean): string {
    return `<section class="fgroup" aria-expanded="${open}">
      <button class="fgroup__head" aria-expanded="${open}" aria-controls="fg-${id}"><span>${esc(title)}</span>${icons.chevron}</button>
      <div class="fgroup__body" id="fg-${id}">${body}</div>
    </section>`;
  }

  private renderLegend(): void {
    const el = document.getElementById("legend")!;
    el.innerHTML = `<div class="legend__title">Confidence</div>
      ${TIERS.map((t) => `<div class="legend__row"><span class="dot dot--${t}"></span>${titleCase(t)}<span class="num" id="legend-${t}">${formatNumber(this.counts.tiers.get(t) ?? 0)}</span></div>`).join("")}
      <div class="legend__scale" title="Marker size scales with known power capacity">
        <i style="width:7px;height:7px"></i><i style="width:11px;height:11px"></i><i style="width:16px;height:16px"></i>
        <span style="margin-left:4px">size = power (MW)</span>
      </div>`;
  }

  private wireChrome(): void {
    const search = document.getElementById("search") as HTMLInputElement;
    let t: number | undefined;
    search.addEventListener("input", () => {
      window.clearTimeout(t);
      t = window.setTimeout(() => {
        this.filters.search = search.value.trim();
        this.cb.onFiltersChange();
      }, 120);
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "/" && !/input|select|textarea/i.test((e.target as HTMLElement).tagName)) {
        e.preventDefault();
        this.openSidebar(true);
        search.focus();
      }
      if (e.key === "Escape") {
        if (document.getElementById("detail-drawer")!.classList.contains("is-open")) this.cb.onCloseDetail();
        else if (window.matchMedia("(max-width: 760px)").matches) this.openSidebar(false);
      }
    });

    document.getElementById("reset-filters")!.addEventListener("click", () => this.cb.onReset());
    document.getElementById("share-link")!.addEventListener("click", () => this.cb.onShare());
    document.getElementById("fit-results")!.addEventListener("click", () => this.cb.onFit());

    const toggle = document.getElementById("sidebar-toggle")!;
    toggle.addEventListener("click", () => {
      const collapsed = this.workspace.classList.toggle("is-sidebar-collapsed");
      toggle.setAttribute("aria-expanded", String(!collapsed));
      window.dispatchEvent(new Event("resize"));
    });
    document.getElementById("sidebar-open")!.addEventListener("click", () => this.openSidebar(true));
    document.getElementById("sidebar-close")!.addEventListener("click", () => this.openSidebar(false));

    document.getElementById("active-chips")!.addEventListener("click", (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLElement>("[data-remove]");
      if (!btn) return;
      this.removeFilter(btn.dataset.remove!);
    });
  }

  openSidebar(open: boolean): void {
    this.workspace.classList.toggle("is-sidebar-open", open);
    if (open) this.workspace.classList.remove("is-sidebar-collapsed");
  }

  private removeFilter(key: string): void {
    const f = this.filters;
    const d = defaultFilters();
    switch (key) {
      case "tiers": f.tiers = d.tiers; break;
      case "statuses": f.statuses = d.statuses; break;
      case "types": f.types = d.types; break;
      case "country": f.country = null; break;
      case "operator": f.operator = null; break;
      case "mw": f.minMw = null; f.maxMw = null; break;
      case "year": f.minYear = null; f.maxYear = null; break;
      case "search": f.search = ""; break;
    }
    this.syncInputs();
    this.cb.onFiltersChange();
  }

  /* --------------------------------------------------------------- updates */

  /** Reflect filter state in the inputs (after decode/reset/chip removal). */
  syncInputs(): void {
    const f = this.filters;
    document.querySelectorAll<HTMLInputElement>("input[data-f]").forEach((cb) => {
      cb.checked = (f[cb.dataset.f as SetKey] as Set<string>).has(cb.value);
    });
    const setVal = (id: string, v: string) => {
      const el = document.getElementById(id) as HTMLInputElement | HTMLSelectElement | null;
      if (el) el.value = v;
    };
    setVal("search", f.search);
    setVal("country-filter", f.country ?? "");
    setVal("operator-filter", f.operator ?? "");
    setVal("min-mw", f.minMw?.toString() ?? "");
    setVal("max-mw", f.maxMw?.toString() ?? "");
    setVal("min-year", f.minYear?.toString() ?? "");
    setVal("max-year", f.maxYear?.toString() ?? "");
  }

  /** Update result count, chips, legend counts and the empty state. */
  update(filtered: DataCenter[]): void {
    const f = this.filters;
    document.getElementById("result-count")!.textContent = formatNumber(filtered.length);

    const n = activeFilterCount(f);
    const badgeEl = document.getElementById("filter-badge")!;
    badgeEl.hidden = n === 0;
    badgeEl.textContent = String(n);

    const chips: string[] = [];
    const rm = (k: string) => `data-remove="${k}"`;
    if (f.tiers.size !== TIERS.length) chips.push(chip("Tier", [...f.tiers].map(titleCase).join(", ") || "none", rm("tiers")));
    if (f.statuses.size !== STATUSES.length) chips.push(chip("Status", [...f.statuses].map((s) => STATUS_LABEL[s]).join(", ") || "none", rm("statuses")));
    if (f.types.size !== SITE_TYPES.length) chips.push(chip("Type", f.types.size === 0 ? "none" : `${f.types.size} of ${SITE_TYPES.length}`, rm("types")));
    if (f.country) chips.push(chip("Country", this.countryNames.get(f.country) ?? f.country, rm("country")));
    if (f.operator) chips.push(chip("Operator", f.operator, rm("operator")));
    if (f.minMw !== null || f.maxMw !== null) chips.push(chip("MW", `${f.minMw ?? "0"} – ${f.maxMw ?? "∞"}`, rm("mw")));
    if (f.minYear !== null || f.maxYear !== null) chips.push(chip("Year", `${f.minYear ?? "…"} – ${f.maxYear ?? "…"}`, rm("year")));
    if (f.search) chips.push(chip("Search", `“${f.search}”`, rm("search")));
    document.getElementById("active-chips")!.innerHTML = chips.join("");

    const tierCounts = new Map<string, number>();
    for (const d of filtered) tierCounts.set(d.tier, (tierCounts.get(d.tier) ?? 0) + 1);
    for (const t of TIERS) {
      const el = document.getElementById(`legend-${t}`);
      if (el) el.textContent = formatNumber(tierCounts.get(t) ?? 0);
    }

    const empty = document.getElementById("map-empty")!;
    if (filtered.length === 0) {
      empty.hidden = false;
      empty.innerHTML = emptyState("Try widening the ranges or removing a filter.", {
        title: "No sites match these filters",
        icon: "filter",
        action: `<button class="btn btn--primary" id="empty-reset">${icons.reset}Reset filters</button>`,
      });
      empty.querySelector("#empty-reset")!.addEventListener("click", () => this.cb.onReset());
    } else {
      empty.hidden = true;
    }
  }

  /* ---------------------------------------------------------------- drawer */

  showDetail(dc: DataCenter): void {
    const drawer = document.getElementById("detail-drawer")!;
    const sub = [dc.operator, dc.city, dc.country ? this.countryNames.get(dc.country) ?? dc.country : null].filter(Boolean).join(" · ");
    const power = dc.power_capacity_mw;
    const details: [string, string | null][] = [
      ["Owner", dc.owner],
      ["Purpose", dc.purpose],
      ["IT load", dc.it_load_mw !== null ? `${formatNumber(dc.it_load_mw, 1)} MW` : null],
      ["Buildings", dc.num_buildings !== null ? String(dc.num_buildings) : null],
      ["Cooling", dc.cooling_type],
      ["Renewables", dc.renewable_notes],
      ["Connectivity", dc.connectivity],
      ["Coordinates", `${dc.lat.toFixed(4)}, ${dc.lng.toFixed(4)}`],
      ["Record ID", dc.id],
    ];
    const osm = `https://www.openstreetmap.org/?mlat=${dc.lat}&mlon=${dc.lng}#map=15/${dc.lat}/${dc.lng}`;

    drawer.innerHTML = `
      <div class="drawer__head">
        <div class="drawer__toprow">
          <div>
            <h2 class="drawer__title">${esc(dc.name)}</h2>
            ${sub ? `<div class="drawer__sub">${esc(sub)}</div>` : ""}
          </div>
          <button class="btn btn--ghost btn--icon" id="drawer-close" aria-label="Close details">${icons.close}</button>
        </div>
        <div class="drawer__badges">
          ${badge(titleCase(dc.tier), dc.tier)}
          ${badge(STATUS_LABEL[dc.status])}
          ${badge(titleCase(dc.type))}
        </div>
      </div>
      <div class="drawer__body">
        <div class="metric-grid">
          ${metric(power !== null ? formatMw(power, dc.power_capacity_mw_estimated) : "—", power !== null && dc.power_capacity_mw_estimated ? "Power capacity (estimated)" : "Power capacity", { empty: power === null })}
          ${metric(dc.year_opened !== null ? String(dc.year_opened) : "—", "Year opened", { empty: dc.year_opened === null })}
          ${metric(dc.pue !== null ? formatNumber(dc.pue, 2) : "—", "PUE", { empty: dc.pue === null })}
          ${metric(formatArea(dc.area_sqm), "Floor area", { empty: dc.area_sqm === null })}
        </div>
        <div>
          <h4>Details</h4>
          <dl class="deflist">${details
            .filter(([, v]) => v !== null && v !== "")
            .map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(String(v))}</dd>`)
            .join("")}</dl>
        </div>
        <div>
          <h4>Sources <small style="font-weight:400;text-transform:none;letter-spacing:0">(${dc.sources.length})</small></h4>
          ${dc.sources.length
            ? `<ul class="sources">${dc.sources
                .map((s) => `<li>${icons.external}<a href="${esc(s.url)}" target="_blank" rel="noopener" title="${esc(s.url)}">${esc(displayUrl(s.url))}</a>${s.retrieved ? `<small>${esc(s.retrieved)}</small>` : ""}</li>`)
                .join("")}</ul>`
            : `<div class="kpi__note">No sources recorded.</div>`}
        </div>
        <div>
          <h4>Explore</h4>
          <div class="chips">
            ${dc.operator ? `<button class="chip" id="drawer-op"><span class="chip__label">More by ${esc(dc.operator)}</span>${icons.arrowRight}</button>` : ""}
            ${dc.country ? `<button class="chip" id="drawer-country"><span class="chip__label">All in ${esc(this.countryNames.get(dc.country) ?? dc.country)}</span>${icons.arrowRight}</button>` : ""}
          </div>
        </div>
      </div>
      <div class="drawer__foot">
        <button class="btn" id="drawer-fly">${icons.locate}Zoom here</button>
        <a class="btn" href="${osm}" target="_blank" rel="noopener">${icons.external}OpenStreetMap</a>
        <button class="btn btn--ghost btn--icon" id="drawer-share" aria-label="Copy link to this view" title="Copy link">${icons.link}</button>
      </div>`;

    drawer.classList.add("is-open");
    drawer.setAttribute("aria-hidden", "false");
    drawer.querySelector("#drawer-close")!.addEventListener("click", () => this.cb.onCloseDetail());
    drawer.querySelector("#drawer-fly")!.addEventListener("click", () => this.cb.onFlyTo(dc));
    drawer.querySelector("#drawer-share")!.addEventListener("click", () => this.cb.onShare());
    drawer.querySelector("#drawer-op")?.addEventListener("click", () => this.cb.onFilterByOperator(dc.operator!));
    drawer.querySelector("#drawer-country")?.addEventListener("click", () => this.cb.onFilterByCountry(dc.country!));
    (drawer.querySelector("#drawer-close") as HTMLElement).focus({ preventScroll: true });
  }

  hideDetail(): void {
    const drawer = document.getElementById("detail-drawer")!;
    drawer.classList.remove("is-open");
    drawer.setAttribute("aria-hidden", "true");
  }
}

export type { Tier, SiteType };
