import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const db = sql();
  const rows = await db`select image_url from cameras where id = ${params.id} limit 1`;
  const imageUrl = rows[0]?.image_url;
  if (!imageUrl) return new NextResponse("not found", { status: 404 });

  const upstream = await fetch(imageUrl, { cache: "no-store" });
  if (!upstream.ok) return new NextResponse("upstream error", { status: 502 });
  const buf = await upstream.arrayBuffer();
  return new NextResponse(buf, {
    headers: {
      "content-type": upstream.headers.get("content-type") || "image/jpeg",
      "cache-control": "public, max-age=30",
    },
  });
}
