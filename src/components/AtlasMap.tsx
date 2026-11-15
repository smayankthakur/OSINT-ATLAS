"use client";
import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

const STYLE = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

export default function AtlasMap() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const map = new maplibregl.Map({
      container: ref.current,
      style: STYLE,
      center: [55.1, 51.77], // Orenburg
      zoom: 4,
      attributionControl: false,
    });
    map.addControl(new maplibregl.AttributionControl({ compact: true,
      customAttribution: "© OSM · CARTO · TfL · Windy · orendor.ru · USGS · NASA · adsb.fi" }), "bottom-right");
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");

    const gj = (f: any[] = []) => ({ type: "FeatureCollection" as const, features: f });

    map.on("load", async () => {
      // --- our own proxied sources ---
      map.addSource("cameras", { type: "geojson", data: gj() });
      map.addSource("flights", { type: "geojson", data: gj() });
      // --- direct (CORS-ok) OSINT layers ---
      map.addSource("quakes", { type: "geojson", data: gj() });

      map.addLayer({ id: "cameras", type: "circle", source: "cameras",
        paint: { "circle-radius": 4, "circle-color": "#38bdf8",
                 "circle-stroke-width": 1, "circle-stroke-color": "#0a0e14" } });
      map.addLayer({ id: "flights", type: "circle", source: "flights",
        paint: { "circle-radius": 3, "circle-color": "#f4c430" } });
      map.addLayer({ id: "quakes", type: "circle", source: "quakes",
        paint: { "circle-radius": ["interpolate", ["linear"], ["get", "mag"], 0, 3, 6, 16],
                 "circle-color": "#f97316", "circle-opacity": 0.5 } });

      const load = async () => {
        try {
          const cams = await (await fetch("/api/cameras")).json();
          (map.getSource("cameras") as any)?.setData(cams);
        } catch {}
        try {
          const fl = await (await fetch("/api/flights")).json();
          (map.getSource("flights") as any)?.setData(fl);
        } catch {}
        try {
          const q = await (await fetch(
            "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson")).json();
          (map.getSource("quakes") as any)?.setData(q);
        } catch {}
      };
      await load();
      const t = setInterval(load, 30000);
      map.once("remove", () => clearInterval(t));

      map.on("click", "cameras", (e) => {
        const f = e.features![0]; const p: any = f.properties;
        const id = encodeURIComponent(p.id);
        const stream: string = p.stream || "";
        const isVideo = /\.(mp4|m3u8|webm)(\?|$)/i.test(stream);
        // Video clip where one exists (e.g. TfL); otherwise an auto-refreshing
        // still so it reads as live (most public cams are refreshed images).
        const media = isVideo
          ? `<video src="${stream}" autoplay loop muted playsinline
                 style="width:100%;margin-top:6px;border-radius:6px;background:#000"></video>`
          : `<img id="cam-${id}" src="/api/cam/${id}/image?t=${Date.now()}"
                 style="width:100%;margin-top:6px;border-radius:6px;background:#000"
                 onerror="this.style.opacity=.3"/>`;
        const pop = new maplibregl.Popup({ maxWidth: "300px" })
          .setLngLat((f.geometry as any).coordinates)
          .setHTML(`<div style="font:13px system-ui;color:#111;max-width:280px">
            <b>📷 ${p.name ?? "Camera"}</b>
            <span style="font-size:11px;color:#667">· ${p.source}</span><br>${media}
            <div style="font-size:10px;color:#889;margin-top:4px">${isVideo ? "live clip" : "refreshing still"}</div>
          </div>`)
          .addTo(map);
        // refresh the still every 4s while the popup is open
        if (!isVideo) {
          const iv = setInterval(() => {
            const el = document.getElementById(`cam-${id}`) as HTMLImageElement | null;
            if (!el) { clearInterval(iv); return; }
            el.src = `/api/cam/${id}/image?t=${Date.now()}`;
          }, 4000);
          pop.on("close", () => clearInterval(iv));
        }
      });
    });

    return () => map.remove();
  }, []);

  return <div ref={ref} style={{ position: "absolute", inset: 0 }} />;
}
