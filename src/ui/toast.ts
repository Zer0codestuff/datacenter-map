/** Minimal toast notifications (aria-live). */

import { icons, type IconName } from "./icons";
import { esc } from "./format";

let host: HTMLElement | null = null;

function ensureHost(): HTMLElement {
  if (!host) {
    host = document.createElement("div");
    host.className = "toasts";
    host.setAttribute("role", "status");
    host.setAttribute("aria-live", "polite");
    document.body.appendChild(host);
  }
  return host;
}

export function toast(message: string, opts: { icon?: IconName; duration?: number } = {}): void {
  const el = document.createElement("div");
  el.className = "toast";
  el.innerHTML = `${icons[opts.icon ?? "check"]}<span>${esc(message)}</span>`;
  ensureHost().appendChild(el);
  setTimeout(() => {
    el.style.opacity = "0";
    el.style.transition = "opacity 200ms";
    setTimeout(() => el.remove(), 220);
  }, opts.duration ?? 2200);
}
