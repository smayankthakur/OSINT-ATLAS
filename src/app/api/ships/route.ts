import { NextRequest, NextResponse } from "next/server";
import WebSocket from "ws";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Ships via AIS. aisstream.io is a WebSocket firehose, not REST — so we open a
// short-lived connection, collect ~5s of position reports into a snapshot,
// dedupe by MMSI, and return GeoJSON. Free key: https://aisstream.io/apikeys
// Set AISSTREAM_API_KEY. ?bbox=minLon,minLat,maxLon,maxLat optional.
export async function GET(req: NextRequest) {
  const key = process.env.AISSTREAM_API_KEY;
  if (!key) {
    return NextResponse.json({ type: "FeatureCollection", features: [], note: "AISSTREAM_API_KEY not set" });
  }
  const p = req.nextUrl.searchParams.get("bbox");
  // aisstream boxes are [[latMin,lonMin],[latMax,lonMax]]
  const box = p
    ? (() => { const [w, s, e, n] = p.split(",").map(Number); return [[s, w], [n, e]]; })()
    : [[-90, -180], [90, 180]];

  const ships = new Map<number, any>();
  const result = await new Promise<any[]>((resolve) => {
    let settled = false;
    const finish = () => { if (settled) return; settled = true; try { ws.close(); } catch {} resolve([...ships.values()]); };
    const ws = new WebSocket("wss://stream.aisstream.io/v0/stream");
    ws.on("open", () => ws.send(JSON.stringify({
      APIKey: key, BoundingBoxes: [box], FilterMessageTypes: ["PositionReport"],
    })));
    ws.on("message", (raw: any) => {
      try {
        const m = JSON.parse(raw.toString());
        if (m.MessageType !== "PositionReport") return;
        const pr = m.Message.PositionReport; const meta = m.MetaData || {};
        if (pr.Latitude == null || pr.Longitude == null) return;
        ships.set(meta.MMSI, {
          mmsi: meta.MMSI, lat: pr.Latitude, lon: pr.Longitude,
          name: (meta.ShipName || "").trim(), cog: pr.Cog, sog: pr.Sog,
        });
        if (ships.size >= 2000) finish();
      } catch {}
    });
    ws.on("error", finish);
    setTimeout(finish, 5000);
  });

  const features = result.map((s) => ({
    type: "Feature",
    geometry: { type: "Point", coordinates: [s.lon, s.lat] },
    properties: { mmsi: s.mmsi, name: s.name, sog: s.sog, cog: s.cog },
  }));
  return NextResponse.json(
    { type: "FeatureCollection", features },
    { headers: { "cache-control": "public, max-age=20" } }
  );
}
