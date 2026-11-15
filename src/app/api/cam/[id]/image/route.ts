import { NextRequest, NextResponse } from "next/server";
import { admin } from "@/lib/db";

export const dynamic = "force-dynamic";

// Proxy the upstream still through our own origin: hides the source URL,
// adds caching, and gives one place to honour takedown requests.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const db = admin();
  const { data } = await db.from("cameras")
    .select("image_url").eq("id", params.id).single();
  if (!data?.image_url) return new NextResponse("not found", { status: 404 });

  const upstream = await fetch(data.image_url, { cache: "no-store" });
  if (!upstream.ok) return new NextResponse("upstream error", { status: 502 });

  const buf = await upstream.arrayBuffer();
  return new NextResponse(buf, {
    headers: {
      "content-type": upstream.headers.get("content-type") || "image/jpeg",
      "cache-control": "public, max-age=30",
    },
  });
}
