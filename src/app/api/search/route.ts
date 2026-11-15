import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const term = (req.nextUrl.searchParams.get("q") || "").trim();
  if (term.length < 2) return NextResponse.json({ results: [] });

  const results: any[] = [];
  try {
    const db = sql();
    const rows = await db`
      select id,name,lat,lon,source_id from cameras
      where name ilike ${"%" + term + "%"} limit 25`;
    for (const c of rows) results.push({ type: "camera", id: c.id, label: c.name,
      lat: c.lat, lon: c.lon, source: c.source_id });
  } catch {}

  try {
    const r = await fetch(
      `https://opendata.adsb.fi/api/v2/callsign/${encodeURIComponent(term.toUpperCase())}`,
      { cache: "no-store" });
    if (r.ok) {
      const d = await r.json();
      for (const a of (d.aircraft || d.ac || []).slice(0, 10)) {
        if (a.lat && a.lon) results.push({ type: "aircraft", id: a.hex,
          label: `${(a.flight || "").trim()} · ${a.t || ""}`.trim(), lat: a.lat, lon: a.lon });
      }
    }
  } catch {}

  return NextResponse.json({ q: term, results });
}
