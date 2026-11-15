import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Same-origin HLS proxy. Allowed hosts are derived from the stream URLs we
// actually store (refreshed every 5 min), so any live source works without a
// code change — and it's not an open proxy. A static list covers cold starts.
const STATIC = [/(^|\.)dot\.ca\.gov$/i, /(^|\.)wsdot\.wa\.gov$/i];
let hostCache: { set: Set<string>; at: number } = { set: new Set(), at: 0 };

async function allowedHosts(): Promise<Set<string>> {
  if (hostCache.set.size && Date.now() - hostCache.at < 300000) return hostCache.set;
  try {
    const db = sql();
    const rows = await db`
      select distinct split_part(split_part(stream_url, '/', 3), ':', 1) as host
      from cameras where stream_url like 'http%'`;
    hostCache = { set: new Set(rows.map((r: any) => r.host).filter(Boolean)), at: Date.now() };
  } catch {}
  return hostCache.set;
}

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("u");
  if (!raw) return new NextResponse("missing u", { status: 400 });
  let url: URL;
  try { url = new URL(raw); } catch { return new NextResponse("bad u", { status: 400 }); }
  const ok = url.protocol === "https:" &&
    (STATIC.some((re) => re.test(url.hostname)) || (await allowedHosts()).has(url.hostname));
  if (!ok) return new NextResponse("forbidden host", { status: 403 });

  const upstream = await fetch(url.toString(), { cache: "no-store" });
  if (!upstream.ok) return new NextResponse("upstream " + upstream.status, { status: 502 });
  const ct = upstream.headers.get("content-type") || "";
  const isPlaylist = url.pathname.toLowerCase().endsWith(".m3u8") || ct.includes("mpegurl");

  if (isPlaylist) {
    const text = await upstream.text();
    const wrap = (u: string) => `/api/hls?u=${encodeURIComponent(new URL(u, url).toString())}`;
    const out = text.split("\n").map((line) => {
      const t = line.trim();
      if (!t) return line;
      if (t.startsWith("#")) return line.replace(/URI="([^"]+)"/g, (_m, uri) => `URI="${wrap(uri)}"`);
      try { return wrap(t); } catch { return line; }
    }).join("\n");
    return new NextResponse(out, {
      headers: { "content-type": "application/vnd.apple.mpegurl", "cache-control": "no-store" },
    });
  }
  const buf = await upstream.arrayBuffer();
  return new NextResponse(buf, {
    headers: { "content-type": ct || "video/mp2t", "cache-control": "no-store" },
  });
}
