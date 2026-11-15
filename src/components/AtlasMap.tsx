"use client";
import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

const STYLE = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

type CameraSel = {
  kind: "camera"; id: string; name: string; source: string; country: string;
  lat: number; lon: number; stream: string;
};
type FlightSel = {
  kind: "flight"; hex: string; callsign: string; type: string;
  alt: number | null; track: number | null; mil: boolean; lat: number; lon: number;
};
type Selected = CameraSel | FlightSel;

const GROUPS: Record<string, string[]> = {
  cameras: ["clusters", "cluster-count", "cameras-pt", "cameras-hit"],
  flights: ["flights", "flights-hit"],
  quakes: ["quakes"],
};

export default function AtlasMap() {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [sel, setSel] = useState<Selected | null>(null);
  const [imgT, setImgT] = useState(Date.now());
  const [on, setOn] = useState({ cameras: true, flights: true, quakes: true });
  const [counts, setCounts] = useState({ cameras: 0, flights: 0, quakes: 0 });

  useEffect(() => {
    if (!sel || sel.kind !== "camera") return;
    setImgT(Date.now());
    const iv = setInterval(() => setImgT(Date.now()), 3000);
    return () => clearInterval(iv);
  }, [sel]);

  function toggle(group: keyof typeof on) {
    const map = mapRef.current; if (!map) return;
    const next = !on[group];
    setOn((o) => ({ ...o, [group]: next }));
    for (const id of GROUPS[group]) {
      if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", next ? "visible" : "none");
    }
  }

  useEffect(() => {
    if (!ref.current) return;
    const map = new maplibregl.Map({
      container: ref.current, style: STYLE,
      center: [55.1, 51.77], zoom: 4, attributionControl: false,
    });
    mapRef.current = map;
    map.addControl(new maplibregl.AttributionControl({ compact: true,
      customAttribution: "© OSM · CARTO · TfL · Windy · USGS · NASA · adsb.fi" }), "bottom-right");
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-left");

    const gj = (f: any[] = []) => ({ type: "FeatureCollection" as const, features: f });

    map.on("load", async () => {
      map.addSource("cameras", { type: "geojson", data: gj(),
        cluster: true, clusterMaxZoom: 12, clusterRadius: 45 });
      map.addSource("flights", { type: "geojson", data: gj() });
      map.addSource("quakes", { type: "geojson", data: gj() });

      // camera clusters
      map.addLayer({ id: "clusters", type: "circle", source: "cameras",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": "#1e7fb0",
          "circle-opacity": 0.85,
          "circle-stroke-color": "#38bdf8",
          "circle-stroke-width": 1.5,
          "circle-radius": ["step", ["get", "point_count"], 14, 25, 18, 100, 24, 500, 30],
        } });
      map.addLayer({ id: "cluster-count", type: "symbol", source: "cameras",
        filter: ["has", "point_count"],
        layout: { "text-field": ["get", "point_count_abbreviated"], "text-size": 12 },
        paint: { "text-color": "#eaf6ff" } });
      // unclustered cameras (visible + wide invisible hit target)
      map.addLayer({ id: "cameras-hit", type: "circle", source: "cameras",
        filter: ["!", ["has", "point_count"]],
        paint: { "circle-radius": 13, "circle-color": "#38bdf8", "circle-opacity": 0.001 } });
      map.addLayer({ id: "cameras-pt", type: "circle", source: "cameras",
        filter: ["!", ["has", "point_count"]],
        paint: { "circle-radius": ["interpolate", ["linear"], ["zoom"], 3, 4, 10, 7],
          "circle-color": "#38bdf8", "circle-stroke-width": 1.5, "circle-stroke-color": "#06121f" } });

      // flights (wide hit target + visible dot)
      map.addLayer({ id: "flights-hit", type: "circle", source: "flights",
        paint: { "circle-radius": 13, "circle-color": "#f4c430", "circle-opacity": 0.001 } });
      map.addLayer({ id: "flights", type: "circle", source: "flights",
        paint: { "circle-radius": ["interpolate", ["linear"], ["zoom"], 3, 4, 9, 7],
          "circle-color": ["case", ["get", "mil"], "#ef4444", "#f4c430"],
          "circle-stroke-width": 1.5, "circle-stroke-color": "#06121f" } });

      map.addLayer({ id: "quakes", type: "circle", source: "quakes",
        paint: { "circle-radius": ["interpolate", ["linear"], ["get", "mag"], 0, 3, 6, 16],
          "circle-color": "#f97316", "circle-opacity": 0.5 } });

      const load = async () => {
        try {
          const c = await (await fetch("/api/cameras")).json();
          (map.getSource("cameras") as any)?.setData(c);
          setCounts((x) => ({ ...x, cameras: c.features?.length || 0 }));
        } catch {}
        try {
          const fl = await (await fetch("/api/flights")).json();
          (map.getSource("flights") as any)?.setData(fl);
          setCounts((x) => ({ ...x, flights: fl.features?.length || 0 }));
        } catch {}
        try {
          const q = await (await fetch(
            "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson")).json();
          (map.getSource("quakes") as any)?.setData(q);
          setCounts((x) => ({ ...x, quakes: q.features?.length || 0 }));
        } catch {}
      };
      await load();
      const t = setInterval(load, 30000);
      map.once("remove", () => clearInterval(t));

      // cluster click -> zoom in
      map.on("click", "clusters", (e) => {
        const f = map.queryRenderedFeatures(e.point, { layers: ["clusters"] })[0];
        const cid = f.properties!.cluster_id;
        (map.getSource("cameras") as any).getClusterExpansionZoom(cid, (err: any, zoom: number) => {
          if (err) return;
          map.easeTo({ center: (f.geometry as any).coordinates, zoom });
        });
      });

      for (const id of ["clusters", "cameras-hit", "flights-hit"]) {
        map.on("mouseenter", id, () => { map.getCanvas().style.cursor = "pointer"; });
        map.on("mouseleave", id, () => { map.getCanvas().style.cursor = ""; });
      }

      map.on("click", "cameras-hit", (e) => {
        const f = e.features![0]; const p: any = f.properties;
        const [lon, lat] = (f.geometry as any).coordinates;
        setSel({ kind: "camera", id: p.id, name: p.name || "Camera", source: p.source || "",
          country: p.country || "", lat, lon, stream: p.stream || "" });
      });
      map.on("click", "flights-hit", (e) => {
        const f = e.features![0]; const p: any = f.properties;
        const [lon, lat] = (f.geometry as any).coordinates;
        setSel({ kind: "flight", hex: p.hex || "", callsign: (p.flight || "").trim(),
          type: p.type || "", alt: p.alt ?? null, track: p.track ?? null,
          mil: p.mil === true || p.mil === "true", lat, lon });
      });
    });

    return () => map.remove();
  }, []);

  const camIsVideo = sel?.kind === "camera" && /\.(mp4|m3u8|webm)(\?|$)/i.test(sel.stream);
  const n = (v: number) => v.toLocaleString();

  return (
    <>
      <style>{`
        .atlas-map{position:absolute;inset:0}
        .layer-panel{position:absolute;top:12px;right:12px;z-index:15;width:210px;background:#0e141f;
          border:1px solid #1e2a3d;border-radius:12px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,.4);
          font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
        .layer-panel h3{margin:0;padding:10px 12px;font-size:11px;letter-spacing:1px;color:#8396b0;
          border-bottom:1px solid #1e2a3d;font-weight:600}
        .layer-row{display:flex;align-items:center;gap:10px;padding:9px 12px;cursor:pointer;
          border-bottom:1px solid #141e2d}
        .layer-row:last-child{border-bottom:none}
        .layer-row:hover{background:#131c2b}
        .ldot{width:9px;height:9px;border-radius:50%;flex:none}
        .lname{font-size:13px;color:#dfe7f2;flex:1}
        .lcount{font-size:11px;color:#8396b0;font-variant-numeric:tabular-nums}
        .lsw{width:30px;height:17px;border-radius:999px;background:#273449;position:relative;flex:none;transition:.15s}
        .lsw::after{content:"";position:absolute;top:2px;left:2px;width:13px;height:13px;border-radius:50%;background:#64748b;transition:.15s}
        .layer-row.on .lsw{background:rgba(56,189,248,.35)}
        .layer-row.on .lsw::after{left:15px;background:#38bdf8}

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
        .cam-live{color:#22c55e;border-color:rgba(34,197,94,.4);background:rgba(34,197,94,.12)}
        .cam-mil{color:#ef4444;border-color:rgba(239,68,68,.4);background:rgba(239,68,68,.12)}
        .cam-rows{margin-top:16px;border-top:1px solid #1e2a3d}
        .cam-row{display:flex;justify-content:space-between;gap:12px;padding:10px 0;border-bottom:1px solid #141e2d;font-size:13px}
        .cam-row .k{color:#8396b0}
        .cam-row .v{color:#dfe7f2;text-align:right;word-break:break-word;font-variant-numeric:tabular-nums}
        .cam-copy{margin-top:14px;width:100%;padding:9px;border-radius:8px;border:1px solid #1e2a3d;
          background:#131c2b;color:#38bdf8;font-size:13px;cursor:pointer}
        .cam-copy:hover{background:#17203055}
        .cam-link{display:inline-block;margin-top:10px;color:#38bdf8;text-decoration:none;font-size:13px}
        .plane-hero{display:flex;align-items:center;justify-content:center;height:120px;font-size:54px;
          background:#0a1017;border-radius:10px;border:1px solid #1e2a3d}
        @media(max-width:720px){
          .cam-panel{width:100vw;height:50vh;top:auto;bottom:0;left:0;right:0;
            border-left:none;border-top:1px solid #1e2a3d;border-radius:14px 14px 0 0;animation:slideY .2s ease}
          .layer-panel{width:170px}
        }
      `}</style>

      <div ref={ref} className="atlas-map" />

      <div className="layer-panel">
        <h3>LAYERS</h3>
        <div className={`layer-row ${on.cameras ? "on" : ""}`} onClick={() => toggle("cameras")}>
          <span className="ldot" style={{ background: "#38bdf8" }} />
          <span className="lname">Cameras</span><span className="lcount">{n(counts.cameras)}</span><span className="lsw" />
        </div>
        <div className={`layer-row ${on.flights ? "on" : ""}`} onClick={() => toggle("flights")}>
          <span className="ldot" style={{ background: "#f4c430" }} />
          <span className="lname">Flights</span><span className="lcount">{n(counts.flights)}</span><span className="lsw" />
        </div>
        <div className={`layer-row ${on.quakes ? "on" : ""}`} onClick={() => toggle("quakes")}>
          <span className="ldot" style={{ background: "#f97316" }} />
          <span className="lname">Earthquakes</span><span className="lcount">{n(counts.quakes)}</span><span className="lsw" />
        </div>
      </div>

      {sel && sel.kind === "camera" && (
        <div className="cam-panel">
          <div className="cam-head">
            <h2>📷 {sel.name}</h2>
            <button className="cam-close" onClick={() => setSel(null)} aria-label="Close">×</button>
          </div>
          <div className="cam-body">
            {camIsVideo ? (
              <video className="cam-media" src={sel.stream} autoPlay loop muted playsInline />
            ) : (
              <img className="cam-media" alt={sel.name}
                src={`/api/cam/${encodeURIComponent(sel.id)}/image?t=${imgT}`}
                onError={(e) => ((e.target as HTMLImageElement).style.opacity = "0.3")} />
            )}
            <span className={`cam-badge ${camIsVideo ? "cam-live" : ""}`}>
              {camIsVideo ? "● live clip" : "● live · refreshing"}
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
              href={`https://www.google.com/maps?q=${sel.lat},${sel.lon}`}>Open location in Google Maps ↗</a>
            {sel.stream && !camIsVideo && (
              <><br /><a className="cam-link" target="_blank" rel="noopener" href={sel.stream}>Open source page ↗</a></>
            )}
          </div>
        </div>
      )}

      {sel && sel.kind === "flight" && (
        <div className="cam-panel">
          <div className="cam-head">
            <h2>✈ {sel.callsign || sel.hex || "Aircraft"}</h2>
            <button className="cam-close" onClick={() => setSel(null)} aria-label="Close">×</button>
          </div>
          <div className="cam-body">
            <div className="plane-hero">{sel.mil ? "🛩️" : "✈️"}</div>
            <span className={`cam-badge ${sel.mil ? "cam-mil" : ""}`}>
              {sel.mil ? "● military" : "● civil · live ADS-B"}
            </span>
            <div className="cam-rows">
              <div className="cam-row"><span className="k">Callsign</span><span className="v">{sel.callsign || "—"}</span></div>
              <div className="cam-row"><span className="k">Aircraft type</span><span className="v">{sel.type || "—"}</span></div>
              <div className="cam-row"><span className="k">Altitude</span><span className="v">{sel.alt != null ? `${Number(sel.alt).toLocaleString()} ft` : "—"}</span></div>
              <div className="cam-row"><span className="k">Heading</span><span className="v">{sel.track != null ? `${Math.round(Number(sel.track))}°` : "—"}</span></div>
              <div className="cam-row"><span className="k">Latitude</span><span className="v">{sel.lat.toFixed(5)}</span></div>
              <div className="cam-row"><span className="k">Longitude</span><span className="v">{sel.lon.toFixed(5)}</span></div>
              <div className="cam-row"><span className="k">ICAO hex</span><span className="v">{sel.hex || "—"}</span></div>
            </div>
            <button className="cam-copy"
              onClick={() => navigator.clipboard?.writeText(`${sel.lat.toFixed(6)}, ${sel.lon.toFixed(6)}`)}>
              Copy coordinates
            </button>
            <br />
            {sel.hex && (
              <a className="cam-link" target="_blank" rel="noopener"
                href={`https://globe.adsb.fi/?icao=${sel.hex}`}>Track on adsb.fi ↗</a>
            )}
          </div>
        </div>
      )}
    </>
  );
}
