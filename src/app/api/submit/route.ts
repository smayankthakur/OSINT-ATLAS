import { NextRequest, NextResponse } from "next/server";
import { admin } from "@/lib/db";

export const dynamic = "force-dynamic";

// Consent intake. A property OWNER submits their own public-facing camera.
// We REQUIRE an ownership attestation; nothing goes live without admin approval.
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

  const db = admin();
  const { data, error } = await db.from("camera_submissions").insert({
    property_name: String(b.property_name).slice(0, 200),
    property_type: String(b.property_type).slice(0, 40),
    city: b.city ? String(b.city).slice(0, 120) : null,
    country: b.country ? String(b.country).slice(0, 8) : null,
    contact_email: String(b.contact_email).slice(0, 200),
    lat: Number(b.lat), lon: Number(b.lon),
    image_url: b.image_url || null, stream_url: b.stream_url || null,
    owner_attested: true, status: "pending",
  }).select("id").single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, id: data.id,
    message: "Submitted for review. It goes live once we verify ownership." });
}
