import { NextRequest, NextResponse } from "next/server";
import { admin } from "@/lib/db";

export const dynamic = "force-dynamic";

// Admin approves/rejects a submission. Approval upserts it into `cameras`
// under source 'optin'. Secret-gated via INGEST_SECRET.
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  if (p.get("secret") !== process.env.INGEST_SECRET)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const id = p.get("id");
  const decision = p.get("decision") || "approve"; // approve | reject
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });

  const db = admin();
  const { data: sub } = await db.from("camera_submissions")
    .select("*").eq("id", id).single();
  if (!sub) return NextResponse.json({ error: "not found" }, { status: 404 });

  if (decision === "reject") {
    await db.from("camera_submissions").update({ status: "rejected" }).eq("id", id);
    return NextResponse.json({ ok: true, status: "rejected" });
  }

  await db.from("cameras").upsert({
    id: `optin:${sub.id}`, source_id: "optin", name: sub.property_name,
    lat: sub.lat, lon: sub.lon, country: sub.country,
    kind: sub.stream_url ? "stream" : "image",
    image_url: sub.image_url, stream_url: sub.stream_url,
    available: true, updated_at: new Date().toISOString(),
  }, { onConflict: "id" });
  await db.from("camera_submissions").update({ status: "approved" }).eq("id", id);
  return NextResponse.json({ ok: true, status: "approved", camera: `optin:${sub.id}` });
}
