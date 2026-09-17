/** MapLibre GL map: clustered points colored by confidence tier, sized by power. */

import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { DataCenter } from "./types";
import { TIER_COLORS } from "./types";

export interface MapCallbacks {
  onSelect: (dc: DataCenter) => void;
  onMove: (view: { lat: number; lng: number; zoom: number }) => void;
}

export class SiteMap {
  private map: maplibregl.Map;
  private byId = new Map<string, DataCenter>();

  constructor(container: string, view: { lat: number; lng: number; zoom: number }, cb: MapCallbacks) {
    this.map = new maplibregl.Map({
      container,
      style: {
        version: 8,
        sources: {
          osm: {
            type: "raster",
            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
            attribution: "&copy; OpenStreetMap contributors",
          },
        },
        layers: [{ id: "osm", type: "raster", source: "osm" }],
      },
      center: [view.lng, view.lat],
      zoom: view.zoom,
    });
    this.map.addControl(new maplibregl.NavigationControl(), "top-right");
    this.map.on("moveend", () => {
      const c = this.map.getCenter();
      cb.onMove({ lat: c.lat, lng: c.lng, zoom: this.map.getZoom() });
    });
    this.map.on("load", () => {
      this.map.addSource("sites", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
        cluster: true,
        clusterMaxZoom: 12,
        clusterRadius: 45,
      });
      this.map.addLayer({
        id: "clusters",
        type: "circle",
        source: "sites",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": "#38bdf8",
          "circle-radius": ["step", ["get", "point_count"], 14, 50, 18, 250, 24, 1000, 30],
          "circle-opacity": 0.75,
        },
      });
      this.map.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: "sites",
        filter: ["has", "point_count"],
        layout: { "text-field": "{point_count_abbreviated}", "text-size": 11 },
        paint: { "text-color": "#0f172a" },
      });
      this.map.addLayer({
        id: "points",
        type: "circle",
        source: "sites",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": [
            "match", ["get", "tier"],
            "confirmed", TIER_COLORS.confirmed,
            "probable", TIER_COLORS.probable,
            TIER_COLORS.theorized,
          ],
          "circle-radius": [
            "interpolate", ["linear"],
            ["coalesce", ["get", "power_capacity_mw"], 0],
            0, 5, 50, 8, 300, 12, 1000, 18,
          ],
          "circle-stroke-width": 1,
          "circle-stroke-color": "#0f172a",
          "circle-opacity": 0.9,
        },
      });
      this.map.on("click", "points", (e) => {
        const id = e.features?.[0]?.properties?.id as string | undefined;
        if (id && this.byId.has(id)) cb.onSelect(this.byId.get(id)!);
      });
      this.map.on("click", "clusters", async (e) => {
        const f = e.features?.[0];
        if (!f) return;
        const clusterId = f.properties?.cluster_id;
        const src = this.map.getSource("sites") as maplibregl.GeoJSONSource;
        const zoom = await src.getClusterExpansionZoom(clusterId);
        this.map.easeTo({ center: (f.geometry as GeoJSON.Point).coordinates as [number, number], zoom });
      });
      this.map.on("mouseenter", "points", () => (this.map.getCanvas().style.cursor = "pointer"));
      this.map.on("mouseleave", "points", () => (this.map.getCanvas().style.cursor = ""));
      this.map.on("mouseenter", "clusters", () => (this.map.getCanvas().style.cursor = "pointer"));
      this.map.on("mouseleave", "clusters", () => (this.map.getCanvas().style.cursor = ""));
    });
  }

  setData(records: DataCenter[]): void {
    this.byId = new Map(records.map((r) => [r.id, r]));
    const fc: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: records.map((r) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [r.lng, r.lat] },
        properties: { id: r.id, tier: r.tier, power_capacity_mw: r.power_capacity_mw },
      })),
    };
    const apply = () => {
      const src = this.map.getSource("sites") as maplibregl.GeoJSONSource | undefined;
      if (src) src.setData(fc);
    };
    if (this.map.isSourceLoaded("sites") || this.map.loaded()) apply();
    else this.map.once("load", apply);
  }

  resize(): void {
    this.map.resize();
  }
}
