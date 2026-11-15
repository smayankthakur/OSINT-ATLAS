"use client";
import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

const STYLE = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

type Selected = {
  id: string; name: string; source: string; country: string;
  lat: number; lon: number; stream: string;
};

export default function AtlasMap() {
  const ref = useRef<HTMLDivElement>(null);
  const [sel, setSel] = useState<Selected | null>(null);
  const [imgT, setImgT] = useState(Date.now());

  // refresh the still every 4s while a camera is open (reads as live)
  useEffect(() => {
    if (!sel) return;
    const iv = setInterval(() => setImgT(Date.now()), 4000);
    return () => clearInterval(iv);
  }, [sel]);

  useEffect(() => {
    if (!ref.current) return;
    const map = new maplibregl.Map({
      container: ref.current, style: STYLE,
      center: [55.1, 51.77], zoom: 4, attributionControl: false,
    });
    map.addControl(new maplibregl.AttributionControl({ compact: true,
      customAttribution: "© OSM · CARTO · TfL · Windy · USGS · NASA · adsb.fi" }), "bottom-right");
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");

    const gj = (f: any[] = []) => ({ type: "FeatureCollection" as const, features: f });

    map.on("load", async () => {
      map.addSource("cameras", { type: "geojson", data: gj() });
      map.addSource("flights", { type: "geojson", data: gj() });
      map.addSource("quakes", { type: "geojson", data: gj() });

      map.addLayer({ id: "cameras", type: "circle", source: "cameras",
        paint: { "circle-radius": ["interpolate", ["linear"], ["zoom"], 3, 2.5, 8, 5, 13, 7],
          "circle-color": "#38bdf8", "circle-opacity": 0.85,
          "circle-stroke-width": 1, "circle-stroke-color": "#0a0e14" } });
      map.addLayer({ id: "flights", type: "circle", source: "flights",
        paint: { "circle-radius": 3, "circle-color": "#f4c430" } });
      map.addLayer({ id: "quakes", type: "circle", source: "quakes",
        paint: { "circle-radius": ["interpolate", ["linear"], ["get", "mag"], 0, 3, 6, 16],
          "circle-color": "#f97316", "circle-opacity": 0.5 } });

      const load = async () => {
        try { (map.getSource("cameras") as any)?.setData(await (await fetch("/api/cameras")).json()); } catch {}
        try { (map.getSource("flights") as any)?.setData(await (await fetch("/api/flights")).json()); } catch {}
        try {
          (map.getSource("quakes") as any)?.setData(await (await fetch(
            "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson")).json());
        } catch {}
      };
      await load();
      const t = setInterval(load, 30000);
      map.once("remove", () => clearInterval(t));

      map.on("mouseenter", "cameras", () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", "cameras", () => { map.getCanvas().style.cursor = ""; });
      map.on("click", "cameras", (e) => {
        const f = e.features![0]; const p: any = f.properties;
        const [lon, lat] = (f.geometry as any).coordinates;
        setImgT(Date.now());
        setSel({ id: p.id, name: p.name || "Camera", source: p.source || "",
          country: p.country || "", lat, lon, stream: p.stream || "" });
      });
    });

    return () => map.remove();
  }, []);

  const isVideo = sel ? /\.(mp4|m3u8|webm)(\?|$)/i.test(sel.stream) : false;

  return (
    <>
      <style>{`
        .atlas-map{position:absolute;inset:0}
        .cam-panel{position:absolute;z-index:20;background:#0e141f;color:#dfe7f2;
          border-left:1px solid #1e2a3d;box-shadow:-10px 0 30px rgba(0,0,0,.45);
          display:flex;flex-direction:column;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;
          top:0;right:0;width:33.33vw;height:100vh;animation:slideX .18s ease}
        @keyframes slideX{from{transform:translateX(100%)}to{transform:translateX(0)}}
        @keyframes slideY{from{transform:translateY(100%)}to{transform:translateY(0)}}
        .cam-head{display:flex;align-items:flex-start;gap:10px;padding:14px 16px;border-bottom:1px solid #1e2a3d}
        .cam-head h2{margin:0;font-size:15px;font-weight:600;line-height:1.3;flex:1}
        .cam-close{background:#131c2b;border:1px solid #1e2a3d;color:#8396b0;border-radius:8px;
          width:30px;height:30px;font-size:16px;cursor:pointer;flex:none;line-height:1}
        .cam-close:hover{color:#dfe7f2}
        .cam-body{flex:1;overflow-y:auto;padding:16px}
        .cam-media{width:100%;border-radius:10px;background:#000;display:block;aspect-ratio:16/9;object-fit:cover}
        .cam-badge{display:inline-block;font-size:11px;padding:2px 8px;border-radius:999px;margin-top:10px;
          background:rgba(56,189,248,.12);color:#38bdf8;border:1px solid rgba(56,189,248,.3)}
        .cam-live{color:#22c55e}
        .cam-rows{margin-top:16px;border-top:1px solid #1e2a3d}
        .cam-row{display:flex;justify-content:space-between;gap:12px;padding:10px 0;border-bottom:1px solid #141e2d;font-size:13px}
        .cam-row .k{color:#8396b0}
        .cam-row .v{color:#dfe7f2;text-align:right;word-break:break-word;font-variant-numeric:tabular-nums}
        .cam-copy{margin-top:14px;width:100%;padding:9px;border-radius:8px;border:1px solid #1e2a3d;
          background:#131c2b;color:#38bdf8;font-size:13px;cursor:pointer}
        .cam-copy:hover{background:#17203055}
        .cam-link{display:inline-block;margin-top:10px;color:#38bdf8;text-decoration:none;font-size:13px}
        @media(max-width:720px){
          .cam-panel{width:100vw;height:50vh;top:auto;bottom:0;left:0;right:0;
            border-left:none;border-top:1px solid #1e2a3d;border-radius:14px 14px 0 0;animation:slideY .2s ease}
        }
      `}</style>

      <div ref={ref} className="atlas-map" />

      {sel && (
        <div className="cam-panel">
          <div className="cam-head">
            <h2>📷 {sel.name}</h2>
            <button className="cam-close" onClick={() => setSel(null)} aria-label="Close">×</button>
          </div>
          <div className="cam-body">
            {isVideo ? (
              <video className="cam-media" src={sel.stream} autoPlay loop muted playsInline />
            ) : (
              <img className="cam-media" alt={sel.name}
                src={`/api/cam/${encodeURIComponent(sel.id)}/image?t=${imgT}`}
                onError={(e) => ((e.target as HTMLImageElement).style.opacity = "0.3")} />
            )}
            <span className={`cam-badge ${isVideo ? "cam-live" : ""}`}>
              {isVideo ? "● live clip" : "refreshing still · every 4s"}
            </span>

            <div className="cam-rows">
              <div className="cam-row"><span className="k">Source</span><span className="v">{sel.source || "—"}</span></div>
              <div className="cam-row"><span className="k">Country</span><span className="v">{sel.country || "—"}</span></div>
              <div className="cam-row"><span className="k">Latitude</span><span className="v">{sel.lat.toFixed(5)}</span></div>
              <div className="cam-row"><span className="k">Longitude</span><span className="v">{sel.lon.toFixed(5)}</span></div>
              <div className="cam-row"><span className="k">Camera ID</span><span className="v">{sel.id}</span></div>
            </div>

            <button className="cam-copy"
              onClick={() => navigator.clipboard?.writeText(`${sel.lat.toFixed(6)}, ${sel.lon.toFixed(6)}`)}>
              Copy coordinates
            </button>
            <br />
            <a className="cam-link" target="_blank" rel="noopener"
              href={`https://www.google.com/maps?q=${sel.lat},${sel.lon}`}>
              Open location in Google Maps ↗
            </a>
            {sel.stream && !isVideo && (
              <>
                <br />
                <a className="cam-link" target="_blank" rel="noopener" href={sel.stream}>
                  Open source page ↗
                </a>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
