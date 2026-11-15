import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";

// Diagnostic for Windy coverage/params. Secret-gated; no key leaked.
export async function GET(req: NextRequest) {
  if (req.nextUrl.searchParams.get("secret") !== process.env.INGEST_SECRET)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const key = process.env.WINDY_API_KEY;
  if (!key) return NextResponse.json({ keyPresent: false });

  const base = "https://api.windy.com/webcams/api/v3/webcams?limit=50&include=location";
  const tests: Record<string, string> = {
    delhi_r50: "&nearby=28.61,77.21,50",
    delhi_r250: "&nearby=28.61,77.21,250",
    delhi_r500: "&nearby=28.61,77.21,500",
    orenburg_r250: "&nearby=51.77,55.10,250",
    india_country: "&countries=IN",
    russia_country: "&countries=RU",
  };
  const out: Record<string, any> = {};
  for (const [name, q] of Object.entries(tests)) {
    try {
      const r = await fetch(base + q, { headers: { "x-windy-api-key": key } });
      const j = r.ok ? await r.json() : null;
      out[name] = { status: r.status, total: j?.total, got: (j?.webcams || []).length };
    } catch (e: any) { out[name] = "err " + e.message; }
  }
  return NextResponse.json(out);
}
