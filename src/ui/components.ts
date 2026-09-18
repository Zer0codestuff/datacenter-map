/** Small render helpers that return HTML strings for the design-system components. */

import type { Tier } from "../types";
import { icons, type IconName } from "./icons";
import { esc, formatNumber, pct } from "./format";

export function kpi(value: string, label: string, note?: string, unit?: string): string {
  return `<div class="card kpi">
    <div class="kpi__value num">${value}${unit ? `<small>${esc(unit)}</small>` : ""}</div>
    <div class="kpi__label">${esc(label)}</div>
    ${note ? `<div class="kpi__note">${esc(note)}</div>` : ""}
  </div>`;
}

export function badge(text: string, tier?: Tier | null): string {
  const cls = tier ? ` badge--${tier}` : "";
  const dot = tier ? `<span class="dot dot--${tier}" style="box-shadow:none;width:7px;height:7px"></span>` : "";
  return `<span class="badge${cls}">${dot}${esc(text)}</span>`;
}

export function tierDot(tier: Tier): string {
  return `<span class="dot dot--${tier}" aria-hidden="true"></span>`;
}

export interface BarEntry {
  label: string;
  value: number;
  /** Optional CSS modifier (e.g. a tier name) for colouring the fill. */
  variant?: string;
  /** Optional accessible/hover title. */
  title?: string;
}

/** Horizontal bar list. Values scale against the max entry. */
export function barList(entries: BarEntry[], opts: { total?: number; emptyText?: string } = {}): string {
  if (!entries.length) return emptyState(opts.emptyText ?? "No data");
  const max = Math.max(1, ...entries.map((e) => e.value));
  return `<div class="bars" role="list">${entries
    .map((e) => {
      const share = opts.total ? ` · ${pct(e.value, opts.total).toFixed(1)}%` : "";
      return `<div class="bar-row" role="listitem" title="${esc(e.title ?? `${e.label}: ${formatNumber(e.value)}${share}`)}">
        <span class="bar-row__label">${esc(e.label)}</span>
        <span class="bar-track"><span class="bar-fill${e.variant ? ` bar-fill--${e.variant}` : ""}" style="width:${pct(e.value, max).toFixed(2)}%"></span></span>
        <span class="bar-row__value num">${formatNumber(e.value)}</span>
      </div>`;
    })
    .join("")}</div>`;
}

/** SVG column chart for ordered series (e.g. sites by year). */
export function columnChart(series: [string, number][], opts: { height?: number; labelEvery?: number } = {}): string {
  if (!series.length) return emptyState("No data");
  const h = opts.height ?? 180;
  const w = 600;
  const padB = 20;
  const padX = 14;
  const gap = 2;
  const max = Math.max(1, ...series.map(([, v]) => v));
  const cw = (w - padX * 2 - gap * (series.length - 1)) / series.length;
  const every = opts.labelEvery ?? Math.max(1, Math.ceil(series.length / 8));
  const bars = series
    .map(([label, v], i) => {
      const bh = ((h - padB) * v) / max;
      const x = padX + i * (cw + gap);
      const y = h - padB - bh;
      return `<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${cw.toFixed(2)}" height="${Math.max(bh, 1).toFixed(2)}" rx="1.5" tabindex="0"><title>${esc(label)}: ${formatNumber(v)}</title></rect>`;
    })
    .join("");
  const labels = series
    .map(([label], i) =>
      i % every === 0
        ? `<text x="${(padX + i * (cw + gap) + cw / 2).toFixed(2)}" y="${h - 5}" text-anchor="middle">${esc(label)}</text>`
        : "",
    )
    .join("");
  return `<svg class="columns" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" role="img" aria-label="Column chart">
    <line x1="0" x2="${w}" y1="${h - padB + 0.5}" y2="${h - padB + 0.5}"/>
    ${bars}${labels}
  </svg>`;
}

export function emptyState(text: string, opts: { title?: string; icon?: IconName; action?: string } = {}): string {
  return `<div class="state">
    ${icons[opts.icon ?? "empty"]}
    ${opts.title ? `<div class="state__title">${esc(opts.title)}</div>` : ""}
    <div>${esc(text)}</div>
    ${opts.action ?? ""}
  </div>`;
}

export function errorState(text: string, retryId?: string): string {
  return `<div class="state state--error">
    ${icons.alert}
    <div class="state__title">Something went wrong</div>
    <div>${esc(text)}</div>
    ${retryId ? `<button class="btn" id="${retryId}">${icons.reset}Retry</button>` : ""}
  </div>`;
}

export function chip(key: string, label: string, removeAttr: string): string {
  return `<span class="chip"><span class="chip__label"><span class="chip__key">${esc(key)}</span> ${esc(label)}</span>
    <button class="chip__remove" ${removeAttr} aria-label="Remove filter ${esc(key)} ${esc(label)}">${icons.close}</button></span>`;
}

export function metric(value: string, label: string, opts: { unit?: string; empty?: boolean } = {}): string {
  return `<div class="metric${opts.empty ? " metric--empty" : ""}">
    <div class="metric__value num">${value}${opts.unit ? `<small>${esc(opts.unit)}</small>` : ""}</div>
    <div class="metric__label">${esc(label)}</div>
  </div>`;
}

/** Sortable table header cell. */
export function th(key: string, label: string, opts: { num?: boolean; sortKey?: string; asc?: boolean } = {}): string {
  const sorted = opts.sortKey === key;
  const aria = sorted ? ` aria-sort="${opts.asc ? "ascending" : "descending"}"` : "";
  return `<th scope="col" class="is-sortable${opts.num ? " is-num" : ""}" data-k="${esc(key)}"${aria}>${esc(label)}<span class="sort-ind" aria-hidden="true"></span></th>`;
}

/** Generic comparator for table sorting. Numbers sort numerically, strings by locale. */
export function compareValues(a: unknown, b: unknown): number {
  if (typeof a === "number" && typeof b === "number") return a - b;
  if (a === null || a === undefined) return -1;
  if (b === null || b === undefined) return 1;
  return String(a).localeCompare(String(b));
}
