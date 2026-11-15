import { NextRequest, NextResponse } from "next/server";
import { adapters } from "@/lib/sources";
import { admin } from "@/lib/db";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Scheduled by vercel.json cron. Pulls each source, upserts normalised cameras.
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  const isCron = req.headers.get("x-vercel-cron") !== null;
  if (!isCron && secret !== process.env.INGEST_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const which = req.nextUrl.searchParams.get("source") || "all";
  const ids = which === "all" ? Object.keys(adapters) : [which];
  const db = admin();
  const report: Record<string, number | string> = {};

  for (const id of ids) {
    const adapter = adapters[id];
    if (!adapter) { report[id] = "unknown"; continue; }
    try {
      const cams = await adapter.fetchCameras();
      if (cams.length) {
        const rows = cams.map((c) => ({
          id: c.id, source_id: c.sourceId, name: c.name,
          lat: c.lat, lon: c.lon, country: c.country, kind: c.kind,
          image_url: c.imageUrl, stream_url: c.streamUrl,
          available: c.available ?? true, updated_at: new Date().toISOString(),
        }));
        await db.from("cameras").upsert(rows, { onConflict: "id" });
      }
      await db.from("sources").update({
        last_run: new Date().toISOString(), last_count: cams.length,
      }).eq("id", id);
      report[id] = cams.length;
    } catch (e: any) {
      report[id] = "error: " + (e?.message || e);
    }
  }
  return NextResponse.json({ ok: true, ingested: report });
}
