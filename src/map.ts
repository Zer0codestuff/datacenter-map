/**
 * MapLibre GL map: theme-aware basemap, clustered points coloured by confidence tier,
 * sized by power capacity, hover tooltips and a selected-site highlight.
 */

import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { DataCenter } from "./types";
import type { Theme } from "./ui/theme";
import { esc } from "./ui/format";

export interface MapCallbacks {
  onSelect: (dc: DataCenter) => void;
  onMove: (view: { lat: number; lng: number; zoom: number }) => void;
}

/** Minimal surface the app needs from a map, so a fallback can stand in when WebGL is unavailable. */
export interface MapLike {
  setData(records: DataCenter[]): void;
  setTheme(theme: Theme): void;
  select(id: string | null): void;
  flyTo(dc: DataCenter, zoom?: number): void;
  fitTo(records: DataCenter[]): void;
  resize(): void;
}

/** Rendered when MapLibre cannot start (no WebGL). Everything else in the app keeps working. */
export class MapUnavailable implements MapLike {
  constructor(container: string, reason: string) {
    const el = document.getElementById(container);
    if (!el) return;
    el.innerHTML = `<div class="state state--error" style="height:100%">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3 2 21h20L12 3z"/><path d="M12 10v5M12 18h.01"/></svg>
      <div class="state__title">The map needs WebGL</div>
      <div style="max-width:42ch">Your browser could not start a WebGL context, so the interactive map is unavailable. The Dashboard, Countries and Compare views still work.</div>
      <div class="kpi__note mono" style="max-width:60ch;overflow-wrap:anywhere">${esc(reason.slice(0, 160))}</div>
    </div>`;
  }
  setData(): void {}
  setTheme(): void {}
  select(): void {}
  flyTo(): void {}
  fitTo(): void {}
  resize(): void {}
}

/** Try to start the WebGL map; fall back gracefully when the context cannot be created. */
export function createMap(container: string, view: { lat: number; lng: number; zoom: number }, theme: Theme, cb: MapCallbacks): MapLike {
  try {
    return new SiteMap(container, view, theme, cb);
  } catch (err) {
    console.error("Map unavailable:", err);
    const reason = err instanceof Error ? err.message : typeof err === "string" ? err : JSON.stringify(err);
    return new MapUnavailable(container, reason);
  }
}

/* Free vector basemaps from OpenFreeMap (no API key; OpenMapTiles schema, OSM data). */
const STYLE_URL: Record<Theme, string> = {
  dark: "https://tiles.openfreemap.org/styles/dark",
  light: "https://tiles.openfreemap.org/styles/positron",
};

const TIER_PAINT: Record<Theme, Record<string, string>> = {
  dark: { confirmed: "#34d399", probable: "#fbbf24", theorized: "#c084fc", stroke: "#0a0d12", cluster: "#e8ecf1", clusterInk: "#0a0d12", halo: "#8fd3ff" },
  light: { confirmed: "#059669", probable: "#d97706", theorized: "#9333ea", stroke: "#ffffff", cluster: "#0f172a", clusterInk: "#ffffff", halo: "#0b6fb4" },
};

const RADIUS_EXPR: maplibregl.ExpressionSpecification = [
  "interpolate", ["linear"], ["coalesce", ["get", "power_capacity_mw"], 0],
  0, 5, 50, 7.5, 300, 11, 1000, 16,
];

export class SiteMap implements MapLike {
  private map: maplibregl.Map;
  private byId = new Map<string, DataCenter>();
  private theme: Theme;
  private fc: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [] };
  private selectedId: string | null = null;
  private popup: maplibregl.Popup;
  private ready = false;

  constructor(container: string, view: { lat: number; lng: number; zoom: number }, theme: Theme, private cb: MapCallbacks) {
    this.theme = theme;
    this.map = new maplibregl.Map({
      container,
      style: STYLE_URL[theme],
      center: [view.lng, view.lat],
      zoom: view.zoom,
      minZoom: 1,
      maxZoom: 18,
      attributionControl: false,
    });
    this.map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");
    this.map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    this.map.addControl(new maplibregl.GeolocateControl({ positionOptions: { enableHighAccuracy: false } }), "top-right");
    this.popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 12, className: "dcm-tip" });

    this.map.on("moveend", () => {
      const c = this.map.getCenter();
      cb.onMove({ lat: c.lat, lng: c.lng, zoom: this.map.getZoom() });
    });
    // "style.load" fires for the initial style and again after every setStyle (theme swap).
    this.map.on("style.load", () => this.addDataLayers());
  }

  private addDataLayers(): void {
    const p = TIER_PAINT[this.theme];
    if (this.map.getSource("sites")) return;
    this.quietBasemapLabels();
    this.map.addSource("sites", {
      type: "geojson",
      data: this.fc,
      cluster: true,
      clusterMaxZoom: 11,
      clusterRadius: 42,
      promoteId: "id",
    });
    // Data layers sit on top of the basemap (including its labels) so markers are never occluded.
    // Clusters: neutral, sized by count so tier colours stay meaningful.
    this.map.addLayer({
      id: "clusters",
      type: "circle",
      source: "sites",
      filter: ["has", "point_count"],
      paint: {
        "circle-color": p.cluster,
        "circle-opacity": 0.92,
        "circle-radius": ["step", ["get", "point_count"], 13, 25, 16, 100, 20, 500, 25, 1500, 31],
        "circle-stroke-width": 4,
        "circle-stroke-color": p.cluster,
        "circle-stroke-opacity": 0.25,
      },
    });
    this.map.addLayer({
      id: "cluster-count",
      type: "symbol",
      source: "sites",
      filter: ["has", "point_count"],
      layout: { "text-field": "{point_count_abbreviated}", "text-size": 11, "text-font": ["Noto Sans Regular"], "text-allow-overlap": true },
      paint: { "text-color": p.clusterInk },
    });
    // Selected halo (drawn under points).
    this.map.addLayer({
      id: "selected-halo",
      type: "circle",
      source: "sites",
      filter: ["==", ["get", "id"], "__none__"],
      paint: {
        "circle-color": p.halo,
        "circle-opacity": 0.35,
        "circle-radius": ["+", RADIUS_EXPR, 9],
      },
    });
    this.map.addLayer({
      id: "points",
      type: "circle",
      source: "sites",
      filter: ["!", ["has", "point_count"]],
      paint: {
        "circle-color": ["match", ["get", "tier"], "confirmed", p.confirmed, "probable", p.probable, p.theorized],
        "circle-radius": RADIUS_EXPR,
        "circle-stroke-width": ["case", ["boolean", ["feature-state", "hover"], false], 2.5, 1.2],
        "circle-stroke-color": ["case", ["boolean", ["feature-state", "hover"], false], p.halo, p.stroke],
        "circle-opacity": 0.92,
      },
    });

    let hovered: string | null = null;
    const clearHover = () => {
      if (hovered !== null) this.map.setFeatureState({ source: "sites", id: hovered }, { hover: false });
      hovered = null;
      this.popup.remove();
      this.map.getCanvas().style.cursor = "";
    };
    this.map.on("mousemove", "points", (e) => {
      const f = e.features?.[0];
      const id = f?.properties?.id as string | undefined;
      if (!f || !id) return;
      if (hovered !== id) {
        if (hovered !== null) this.map.setFeatureState({ source: "sites", id: hovered }, { hover: false });
        hovered = id;
        this.map.setFeatureState({ source: "sites", id }, { hover: true });
      }
      this.map.getCanvas().style.cursor = "pointer";
      const dc = this.byId.get(id);
      if (dc) {
        const meta = [dc.operator, dc.city, dc.country].filter(Boolean).join(" · ");
        this.popup
          .setLngLat((f.geometry as GeoJSON.Point).coordinates as [number, number])
          .setHTML(`<div class="dcm-tip__name"><span class="dot dot--${dc.tier}" style="box-shadow:none"></span>${esc(dc.name)}</div>${meta ? `<div class="dcm-tip__meta">${esc(meta)}</div>` : ""}`)
          .addTo(this.map);
      }
    });
    this.map.on("mouseleave", "points", clearHover);
    this.map.on("click", "points", (e) => {
      const id = e.features?.[0]?.properties?.id as string | undefined;
      if (id && this.byId.has(id)) this.cb.onSelect(this.byId.get(id)!);
    });
    this.map.on("click", "clusters", async (e) => {
      const f = e.features?.[0];
      if (!f) return;
      const src = this.map.getSource("sites") as maplibregl.GeoJSONSource;
      const zoom = await src.getClusterExpansionZoom(f.properties?.cluster_id);
      this.map.easeTo({ center: (f.geometry as GeoJSON.Point).coordinates as [number, number], zoom, duration: 450 });
    });
    this.map.on("mouseenter", "clusters", () => (this.map.getCanvas().style.cursor = "pointer"));
    this.map.on("mouseleave", "clusters", () => (this.map.getCanvas().style.cursor = ""));
    this.ready = true;
    this.applySelection();
  }

  /** Hide region/state labels at low zoom so clusters stay legible on the world view. */
  private quietBasemapLabels(): void {
    for (const layer of this.map.getStyle().layers ?? []) {
      if (layer.type !== "symbol") continue;
      if (/^place_(state|region|other|province)/.test(layer.id)) this.map.setLayerZoomRange(layer.id, 4.5, 24);
    }
  }

  setData(records: DataCenter[]): void {
    this.byId = new Map(records.map((r) => [r.id, r]));
    this.fc = {
      type: "FeatureCollection",
      features: records.map((r) => ({
        type: "Feature",
        id: r.id,
        geometry: { type: "Point", coordinates: [r.lng, r.lat] },
        properties: { id: r.id, tier: r.tier, power_capacity_mw: r.power_capacity_mw },
      })),
    };
    const src = this.map.getSource("sites") as maplibregl.GeoJSONSource | undefined;
    if (src) src.setData(this.fc);
  }

  setTheme(theme: Theme): void {
    if (theme === this.theme) return;
    this.theme = theme;
    // diff:false forces a full style reload so "style.load" fires and the data layers are re-added.
    this.map.setStyle(STYLE_URL[theme], { diff: false });
  }

  select(id: string | null): void {
    this.selectedId = id;
    this.applySelection();
  }

  private applySelection(): void {
    if (!this.map.getLayer("selected-halo")) return;
    this.map.setFilter("selected-halo", ["==", ["get", "id"], this.selectedId ?? "__none__"]);
  }

  flyTo(dc: DataCenter, zoom = 11): void {
    this.map.flyTo({ center: [dc.lng, dc.lat], zoom: Math.max(this.map.getZoom(), zoom), duration: 900, essential: true });
  }

  fitTo(records: DataCenter[]): void {
    if (!records.length) return;
    if (records.length === 1) return this.flyTo(records[0], 9);
    const b = new maplibregl.LngLatBounds();
    for (const r of records) b.extend([r.lng, r.lat]);
    this.map.fitBounds(b, { padding: 60, maxZoom: 10, duration: 800 });
  }

  resize(): void {
    this.map.resize();
  }
}
