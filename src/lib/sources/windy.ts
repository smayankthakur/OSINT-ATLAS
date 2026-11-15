import type { SourceAdapter, NormalisedCamera } from "@/lib/types";

// Global — Windy Webcams API v3 (free Webcams-API key).
// Use the `countries` filter (confirmed: IN=11, RU=478 webcams). Priority
// countries first (India + Russia incl. Orenburg), then a global sweep.
const PRIORITY = "IN,RU,GB,AE,NP,LK,TH,SG"; // India/Russia + nearby/popular

async function pageUrl(key: string, extra: string, cap: number): Promise<any[]> {
  const out: any[] = [];
  for (let offset = 0; offset < cap; offset += 50) {
    const url = `https://api.windy.com/webcams/api/v3/webcams?limit=50&offset=${offset}` +
      `&include=location,images,urls${extra}`;
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
    try {
      for (const c of await pageUrl(key, `&countries=${PRIORITY}`, 1000)) seen.set(c.webcamId, c);
    } catch (e) { console.warn("[windy] priority", e); }
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
        streamUrl: c.urls?.detail,
        available: c.status === "active",
      }));
  },
};
