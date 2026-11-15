import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";

// Diagnostic: shows the raw Windy Webcams API response so we can tell a bad
// key type (401/403) from a shape mismatch (200). Secret-gated; no key leaked.
export async function GET(req: NextRequest) {
  if (req.nextUrl.searchParams.get("secret") !== process.env.INGEST_SECRET)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const key = process.env.WINDY_API_KEY;
  if (!key) return NextResponse.json({ keyPresent: false });

  const url = "https://api.windy.com/webcams/api/v3/webcams?limit=3&include=location,images,urls";
  const r = await fetch(url, { headers: { "x-windy-api-key": key } });
  const text = await r.text();
  let shape: any = null;
  try {
    const j = JSON.parse(text);
    shape = { total: j.total, count: (j.webcams || []).length,
      firstKeys: j.webcams?.[0] ? Object.keys(j.webcams[0]) : null,
      firstLoc: j.webcams?.[0]?.location || null };
  } catch { shape = "non-json"; }
  return NextResponse.json({
    keyPresent: true, keyLen: key.length, status: r.status,
    bodySnippet: text.slice(0, 200), shape,
  });
}
