import { NextRequest, NextResponse } from "next/server";
import { admin } from "@/lib/db";

export const dynamic = "force-dynamic";

// Returns cameras as GeoJSON. In production, front this with a CDN cache and,
// above ~20k points, swap to pre-built PMTiles instead of live GeoJSON.
export async function GET(req: NextRequest) {
  const db = admin();
  const bbox = req.nextUrl.searchParams.get("bbox"); // "minLon,minLat,maxLon,maxLat"
  let q = db.from("cameras")
    .select("id,name,lat,lon,country,kind,source_id,available")
    .eq("available", true).limit(20000);
  if (bbox) {
    const [w, s, e, n] = bbox.split(",").map(Number);
    q = q.gte("lon", w).lte("lon", e).gte("lat", s).lte("lat", n);
  }
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const features = (data || []).map((c) => ({
    type: "Feature",
    geometry: { type: "Point", coordinates: [c.lon, c.lat] },
    properties: { id: c.id, name: c.name, source: c.source_id, kind: c.kind },
  }));
  return NextResponse.json(
    { type: "FeatureCollection", features },
    { headers: { "cache-control": "public, max-age=60" } }
  );
}
