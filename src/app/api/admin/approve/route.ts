import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  if (p.get("secret") !== process.env.INGEST_SECRET)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const id = p.get("id");
  const decision = p.get("decision") || "approve";
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });

  const db = sql();
  const subs = await db`select * from camera_submissions where id = ${id} limit 1`;
  const sub = subs[0];
  if (!sub) return NextResponse.json({ error: "not found" }, { status: 404 });

  if (decision === "reject") {
    await db`update camera_submissions set status='rejected' where id=${id}`;
    return NextResponse.json({ ok: true, status: "rejected" });
  }

  const camId = `optin:${sub.id}`;
  await db`
    insert into cameras (id,source_id,name,lat,lon,country,kind,image_url,stream_url,available,updated_at)
    values (${camId},'optin',${sub.property_name},${sub.lat},${sub.lon},${sub.country},
            ${sub.stream_url ? 'stream' : 'image'},${sub.image_url},${sub.stream_url},true,now())
    on conflict (id) do update set
      name=excluded.name, lat=excluded.lat, lon=excluded.lon,
      image_url=excluded.image_url, stream_url=excluded.stream_url, updated_at=now()`;
  await db`update camera_submissions set status='approved' where id=${id}`;
  return NextResponse.json({ ok: true, status: "approved", camera: camId });
}
