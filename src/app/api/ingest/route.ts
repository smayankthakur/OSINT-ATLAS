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
  const ids = which === "all" ? Object.keys(adapters) : [which];
  const report: Record<string, number | string> = {};

  for (const id of ids) {
    const adapter = adapters[id];
    if (!adapter) { report[id] = "unknown"; continue; }
    try {
      const cams = await adapter.fetchCameras();
      for (const c of cams) {
        await db`
          insert into cameras (id,source_id,name,lat,lon,country,kind,image_url,stream_url,available,updated_at)
          values (${c.id},${c.sourceId},${c.name},${c.lat},${c.lon},${c.country ?? null},
                  ${c.kind},${c.imageUrl ?? null},${c.streamUrl ?? null},${c.available ?? true}, now())
          on conflict (id) do update set
            name=excluded.name, lat=excluded.lat, lon=excluded.lon,
            image_url=excluded.image_url, stream_url=excluded.stream_url,
            available=excluded.available, updated_at=now()`;
      }
      await db`update sources set last_run=now(), last_count=${cams.length} where id=${id}`;
      report[id] = cams.length;
    } catch (e: any) {
      report[id] = "error: " + (e?.message || e);
    }
  }
  return NextResponse.json({ ok: true, ingested: report });
}
