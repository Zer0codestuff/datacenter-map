/** Pure formatting helpers shared by all views (unit-tested). */

export function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

export function formatNumber(n: number, digits = 0): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: digits, minimumFractionDigits: 0 });
}

/** 4113 → "4.1k", 1245000 → "1.2M". */
export function compact(n: number): string {
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(1).replace(/\.0$/, "")}M`;
  if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(1).replace(/\.0$/, "")}k`;
  return String(Math.round(n));
}

/** Megawatts with unit; large values roll up to GW. */
export function formatMw(mw: number | null, estimated = false): string {
  if (mw === null || !Number.isFinite(mw)) return "—";
  const est = estimated ? "≈" : "";
  if (mw >= 1000) return `${est}${formatNumber(mw / 1000, 2)} GW`;
  return `${est}${formatNumber(mw, mw < 10 ? 1 : 0)} MW`;
}

export function formatArea(sqm: number | null): string {
  if (sqm === null) return "—";
  if (sqm >= 1e6) return `${formatNumber(sqm / 1e6, 2)} km²`;
  return `${formatNumber(sqm)} m²`;
}

export function titleCase(s: string): string {
  return s.replace(/\b[a-z]/g, (c) => c.toUpperCase()).replace(/\bHpc\b/, "HPC").replace(/\bAi\b/, "AI");
}

/** Shorten a URL for display: strip protocol/www and trailing slash. */
export function displayUrl(url: string, max = 48): string {
  const s = url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

export function pct(part: number, total: number): number {
  return total > 0 ? (part / total) * 100 : 0;
}
