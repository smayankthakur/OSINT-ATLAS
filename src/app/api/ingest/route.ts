import { NextRequest, NextResponse } from "next/server";
import { adapters } from "@/lib/sources";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  const isCron = req.headers.get("x-vercel-cron") !== null;
  if (!isCron && secret !== process.env.INGEST_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const db = sql();
  const which = req.nextUrl.searchParams.get("source") || "all";
  const ids = which === "all" ? Object.keys(adapters) : which.split(",").map((s) => s.trim());
  const report: Record<string, number | string> = {};

  for (const id of ids) {
    const adapter = adapters[id];
    if (!adapter) { report[id] = "unknown"; continue; }
    try {
      const cams = await adapter.fetchCameras();
      // batch upserts (fast; avoids per-row round-trips and function timeouts)
      const rows = cams.map((c) => ({
        id: c.id, source_id: c.sourceId, name: c.name, lat: c.lat, lon: c.lon,
        country: c.country ?? null, kind: c.kind, image_url: c.imageUrl ?? null,
        stream_url: c.streamUrl ?? null, available: c.available ?? true,
        updated_at: new Date().toISOString(),
      }));
      const SIZE = 500;
      for (let i = 0; i < rows.length; i += SIZE) {
        await db`
          insert into cameras ${db(rows.slice(i, i + SIZE) as any)}
          on conflict (id) do update set
            name=excluded.name, lat=excluded.lat, lon=excluded.lon,
            image_url=excluded.image_url, stream_url=excluded.stream_url,
            available=excluded.available, updated_at=now()`;
      }
      await db`update sources set last_run=now(), last_count=${cams.length} where id=${id}`;
      report[id] = cams.length;
      // prune stale rows for curated, deterministic sources only (never for
      // flaky external feeds, where a short fetch must not delete good rows)
      if (id === "livestreams" && cams.length > 0) {
        const keep = cams.map((c) => c.id);
        const del = await db`delete from cameras where source_id=${id} and not (id = any(${keep}))`;
        report[id] = `${cams.length} (pruned ${del.count})`;
      }
    } catch (e: any) {
      report[id] = "error: " + (e?.message || e);
    }
  }
  return NextResponse.json({ ok: true, ingested: report });
}
