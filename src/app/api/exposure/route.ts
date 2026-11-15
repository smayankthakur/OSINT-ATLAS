import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Exposure-risk intelligence for the VAPT pipeline. AGGREGATE counts only via
// Shodan's host/count facet endpoint — never device access, never host records.
// Params:
//   q       base query (default "webcam")   e.g. "rtsp", "hikvision", "dvr"
//   country ISO-2 to scope (e.g. "IN")
//   facet   "country" (default) or "city"
// Examples:
//   /api/exposure?q=webcam&facet=country
//   /api/exposure?q=rtsp&country=IN&facet=city   -> exposed RTSP by Indian city
export async function GET(req: NextRequest) {
  const key = process.env.SHODAN_API_KEY;
  if (!key) return NextResponse.json({ error: "SHODAN_API_KEY not set" }, { status: 400 });

  const p = req.nextUrl.searchParams;
  const base = p.get("q") || "webcam";
  const country = p.get("country");
  const facet = p.get("facet") === "city" ? "city:50" : "country:50";
  const query = country ? `${base} country:${country}` : base;

  const url = `https://api.shodan.io/shodan/host/count?key=${key}` +
    `&query=${encodeURIComponent(query)}&facets=${facet}`;
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) return NextResponse.json({ error: r.status }, { status: 502 });
  const data = await r.json();

  const facetKey = facet.startsWith("city") ? "city" : "country";
  const breakdown = (data.facets?.[facetKey] || []).map((f: any) => ({
    [facetKey]: f.value, count: f.count,
  }));
  return NextResponse.json(
    { query, total: data.total, breakdown },
    { headers: { "cache-control": "public, max-age=3600" } }
  );
}
