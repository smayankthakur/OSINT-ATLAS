import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

async function windyFreshUrl(webcamId: string): Promise<string | null> {
  const key = process.env.WINDY_API_KEY;
  if (!key) return null;
  const r = await fetch(
    `https://api.windy.com/webcams/api/v3/webcams/${webcamId}?include=images`,
    { headers: { "x-windy-api-key": key }, cache: "no-store" });
  if (!r.ok) return null;
  const j = await r.json();
  const w = j.webcams?.[0] || j; // getWebcam returns the object directly
  return w?.images?.current?.preview || null;
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  let imageUrl: string | null = null;

  // Windy tokens expire — always refetch a fresh preview by id.
  if (params.id.startsWith("windy:")) {
    imageUrl = await windyFreshUrl(params.id.slice("windy:".length));
  }
  if (!imageUrl) {
    const db = sql();
    const rows = await db`select image_url from cameras where id = ${params.id} limit 1`;
    imageUrl = rows[0]?.image_url || null;
  }
  if (!imageUrl) return new NextResponse("not found", { status: 404 });

  const upstream = await fetch(imageUrl, { cache: "no-store" });
  if (!upstream.ok) return new NextResponse("upstream error", { status: 502 });
  const buf = await upstream.arrayBuffer();
  return new NextResponse(buf, {
    headers: {
      "content-type": upstream.headers.get("content-type") || "image/jpeg",
      "cache-control": "public, max-age=20",
    },
  });
}
