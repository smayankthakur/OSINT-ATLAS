import { NextRequest, NextResponse } from "next/server";
import { admin } from "@/lib/db";

export const dynamic = "force-dynamic";

// One search box across PUBLIC objects only: cameras (by name/place) and
// aircraft (by callsign/registration via adsb.fi). Deliberately NO people
// search, NO face lookup, NO social aggregation — those target private
// individuals and are out of scope by design.
export async function GET(req: NextRequest) {
  const term = (req.nextUrl.searchParams.get("q") || "").trim();
  if (term.length < 2) return NextResponse.json({ results: [] });

  const results: any[] = [];

  try {
    const db = admin();
    const { data } = await db.from("cameras")
      .select("id,name,lat,lon,source_id")
      .ilike("name", `%${term}%`).limit(25);
    for (const c of data || []) {
      results.push({ type: "camera", id: c.id, label: c.name,
        lat: c.lat, lon: c.lon, source: c.source_id });
    }
  } catch {}

  try {
    const r = await fetch(
      `https://opendata.adsb.fi/api/v2/callsign/${encodeURIComponent(term.toUpperCase())}`,
      { cache: "no-store" });
    if (r.ok) {
      const d = await r.json();
      for (const a of (d.aircraft || d.ac || []).slice(0, 10)) {
        if (a.lat && a.lon) results.push({ type: "aircraft", id: a.hex,
          label: `${(a.flight || "").trim()} · ${a.t || ""}`.trim(),
          lat: a.lat, lon: a.lon });
      }
    }
  } catch {}

  return NextResponse.json({ q: term, results });
}
