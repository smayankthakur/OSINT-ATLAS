import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const db = sql();
  const bbox = req.nextUrl.searchParams.get("bbox");
  let rows;
  try {
    if (bbox) {
      const [w, s, e, n] = bbox.split(",").map(Number);
      rows = await db`
        select id,name,lat,lon,country,kind,source_id,stream_url from cameras
        where available = true and lon between ${w} and ${e} and lat between ${s} and ${n}
        limit 20000`;
    } else {
      rows = await db`
        select id,name,lat,lon,country,kind,source_id,stream_url from cameras
        where available = true limit 20000`;
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
  const features = rows.map((c: any) => ({
    type: "Feature",
    geometry: { type: "Point", coordinates: [c.lon, c.lat] },
    properties: { id: c.id, name: c.name, source: c.source_id, kind: c.kind, stream: c.stream_url || '', country: c.country || '' },
  }));
  return NextResponse.json(
    { type: "FeatureCollection", features },
    { headers: { "cache-control": "public, max-age=60" } }
  );
}
