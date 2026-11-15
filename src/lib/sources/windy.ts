import type { SourceAdapter, NormalisedCamera } from "@/lib/types";

// Global — Windy Webcams API v3 (free Webcams-API key).
// Use the `countries` filter (confirmed: IN=11, RU=478 webcams). Priority
// countries first (India + Russia incl. Orenburg), then a global sweep.
const COUNTRIES = ["IN","RU","GB","US","DE","FR","IT","ES","CH","AT","NL","BE","PL",
  "CZ","GR","TR","AE","SA","NP","LK","TH","SG","JP","KR","AU","NZ","CA","MX","BR",
  "ZA","EG","PT","SE","NO","FI","HR","SI","HU","RO","UA"];
// Windy rejects too many countries in one request, so query in small chunks.
function chunk<T>(a: T[], n: number): T[][] {
  const r: T[][] = []; for (let i = 0; i < a.length; i += n) r.push(a.slice(i, i + n)); return r;
}

async function pageUrl(key: string, extra: string, cap: number): Promise<any[]> {
  const out: any[] = [];
  for (let offset = 0; offset < cap; offset += 50) {
    const url = `https://api.windy.com/webcams/api/v3/webcams?limit=50&offset=${offset}` +
      `&include=location,images,urls,player${extra}`;
    const r = await fetch(url, { headers: { "x-windy-api-key": key } });
    if (!r.ok) break;
    const d = await r.json();
    const cams = d.webcams || [];
    out.push(...cams);
    if (cams.length < 50) break;
  }
  return out;
}

export const windy: SourceAdapter = {
  id: "windy",
  async fetchCameras(): Promise<NormalisedCamera[]> {
    const key = process.env.WINDY_API_KEY;
    if (!key) { console.warn("[windy] no key"); return []; }

    const seen = new Map<number, any>();
    // query countries in small chunks (Windy caps how many per request)
    for (const grp of chunk(COUNTRIES, 4)) {
      try {
        for (const c of await pageUrl(key, `&countries=${grp.join(",")}`, 600)) seen.set(c.webcamId, c);
      } catch (e) { console.warn("[windy] chunk", grp, e); }
    }
    try {
      for (const c of await pageUrl(key, "", 200)) seen.set(c.webcamId, c);
    } catch {}

    return [...seen.values()]
      .filter((c) => c.location?.latitude != null && c.location?.longitude != null)
      .map((c) => ({
        id: `windy:${c.webcamId}`,
        sourceId: "windy",
        name: c.title || c.location?.city || "Webcam",
        lat: c.location.latitude,
        lon: c.location.longitude,
        country: c.location.country_code || c.location.country,
        kind: "image" as const,
        imageUrl: c.images?.current?.preview, // token expires; proxy refetches
        // Windy's own live player (animated, with a Live-stream control) —
        // far better than a static still; falls back to the still if absent.
        streamUrl: c.player?.live || `https://webcams.windy.com/webcams/public/embed/player/${c.webcamId}/live`,
        available: c.status === "active",
      }));
  },
};
