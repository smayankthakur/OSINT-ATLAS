import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Same-origin HLS proxy. DOT stream hosts block cross-origin, so we fetch the
// playlist + segments server-side and rewrite resource URLs back through here.
// Restricted to known stream hosts to avoid being an open proxy.
const ALLOW = [
  /(^|\.)dot\.ca\.gov$/i,        // Caltrans (wzmedia.dot.ca.gov)
  /(^|\.)wsdot\.wa\.gov$/i,      // future: Washington DOT
];
const hostOk = (u: URL) => ALLOW.some((re) => re.test(u.hostname));

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("u");
  if (!raw) return new NextResponse("missing u", { status: 400 });
  let url: URL;
  try { url = new URL(raw); } catch { return new NextResponse("bad u", { status: 400 }); }
  if (url.protocol !== "https:" || !hostOk(url)) return new NextResponse("forbidden host", { status: 403 });

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
      if (t.startsWith("#")) {
        // rewrite URI="..." inside tags (EXT-X-KEY, EXT-X-MEDIA, etc.)
        return line.replace(/URI="([^"]+)"/g, (_m, uri) => `URI="${wrap(uri)}"`);
      }
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
