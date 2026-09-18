/** Inline SVG icon set (stroke icons, 24px grid). Returns markup strings. */

const wrap = (paths: string, extra = ""): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${paths}</svg>`;

export const icons = {
  logo: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none" aria-hidden="true">
    <rect x="3" y="3" width="26" height="26" rx="7" stroke="currentColor" stroke-width="2"/>
    <path d="M9 12h14M9 16h14M9 20h9" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    <circle cx="22" cy="20" r="2" fill="currentColor"/>
  </svg>`,
  map: wrap(`<path d="M3 6v15l6-3 6 3 6-3V3l-6 3-6-3-6 3z"/><path d="M9 3v15M15 6v15"/>`),
  dashboard: wrap(`<rect x="3" y="3" width="8" height="10" rx="2"/><rect x="13" y="3" width="8" height="6" rx="2"/><rect x="13" y="11" width="8" height="10" rx="2"/><rect x="3" y="15" width="8" height="6" rx="2"/>`),
  globe: wrap(`<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>`),
  compare: wrap(`<path d="M8 3v18M16 3v18"/><path d="M3 8l5-5 5 5M11 16l5 5 5-5"/>`),
  book: wrap(`<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 19a2 2 0 0 1 2-2h13"/>`),
  search: wrap(`<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>`),
  close: wrap(`<path d="M6 6l12 12M18 6 6 18"/>`),
  chevron: wrap(`<path d="m6 9 6 6 6-6"/>`),
  filter: wrap(`<path d="M4 5h16l-6 8v6l-4-2v-4z"/>`),
  reset: wrap(`<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/>`),
  link: wrap(`<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>`),
  external: wrap(`<path d="M14 4h6v6M20 4l-9 9"/><path d="M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/>`),
  check: wrap(`<path d="m5 12 5 5L20 7"/>`),
  sun: wrap(`<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>`),
  moon: wrap(`<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"/>`),
  github: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 .5a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2.2c-3.3.7-4-1.4-4-1.4-.6-1.4-1.4-1.8-1.4-1.8-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1.1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.8-1.6-2.7-.3-5.5-1.3-5.5-5.9 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.5.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0c2.3-1.5 3.3-1.2 3.3-1.2.7 1.7.3 2.9.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .5z"/></svg>`,
  panelLeft: wrap(`<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/>`),
  swap: wrap(`<path d="M7 16V4m0 0L3 8m4-4 4 4"/><path d="M17 8v12m0 0 4-4m-4 4-4-4"/>`),
  locate: wrap(`<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/><circle cx="12" cy="12" r="8"/>`),
  alert: wrap(`<path d="M12 3 2 21h20L12 3z"/><path d="M12 10v5M12 18h.01"/>`),
  empty: wrap(`<circle cx="12" cy="12" r="9"/><path d="M8 12h8"/>`),
  bolt: wrap(`<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>`),
  layers: wrap(`<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 12 9 5 9-5M3 17l9 5 9-5"/>`),
  arrowRight: wrap(`<path d="M5 12h14M13 6l6 6-6 6"/>`),
};

export type IconName = keyof typeof icons;
