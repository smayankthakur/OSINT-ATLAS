import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// adsb.fi refuses cross-origin browser requests, so proxy it server-side.
// ?lat=&lon=&dist=  (nm). Defaults to a global military snapshot.
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const lat = p.get("lat"), lon = p.get("lon"), dist = p.get("dist") || "250";
  const url = lat && lon
    ? `https://opendata.adsb.fi/api/v2/lat/${lat}/lon/${lon}/dist/${dist}`
    : `https://opendata.adsb.fi/api/v2/mil`;
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) return NextResponse.json({ error: r.status }, { status: 502 });
  const data = await r.json();
  const list = data.aircraft || data.ac || [];
  const features = list
    .filter((a: any) => a.lat && a.lon)
    .map((a: any) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [a.lon, a.lat] },
      properties: {
        hex: a.hex, flight: (a.flight || "").trim(), type: a.t,
        alt: a.alt_baro, track: a.track, mil: a.dbFlags === 1 || !lat,
      },
    }));
  return NextResponse.json(
    { type: "FeatureCollection", features },
    { headers: { "cache-control": "public, max-age=10" } }
  );
}
