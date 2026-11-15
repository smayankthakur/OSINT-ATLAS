import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let b: any;
  try { b = await req.json(); } catch { return NextResponse.json({ error: "bad json" }, { status: 400 }); }

  const required = ["property_name", "property_type", "contact_email", "lat", "lon"];
  for (const k of required) {
    if (b[k] === undefined || b[k] === "" || b[k] === null)
      return NextResponse.json({ error: `missing ${k}` }, { status: 400 });
  }
  if (b.owner_attested !== true)
    return NextResponse.json({ error: "ownership attestation required" }, { status: 400 });
  if (!b.image_url && !b.stream_url)
    return NextResponse.json({ error: "image_url or stream_url required" }, { status: 400 });

  const db = sql();
  const rows = await db`
    insert into camera_submissions
      (property_name,property_type,city,country,contact_email,lat,lon,image_url,stream_url,owner_attested,status)
    values (${String(b.property_name).slice(0,200)}, ${String(b.property_type).slice(0,40)},
            ${b.city ? String(b.city).slice(0,120) : null}, ${b.country ? String(b.country).slice(0,8) : null},
            ${String(b.contact_email).slice(0,200)}, ${Number(b.lat)}, ${Number(b.lon)},
            ${b.image_url || null}, ${b.stream_url || null}, true, 'pending')
    returning id`;
  return NextResponse.json({ ok: true, id: rows[0].id,
    message: "Submitted for review. It goes live once we verify ownership." });
}
