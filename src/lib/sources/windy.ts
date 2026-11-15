import type { SourceAdapter, NormalisedCamera } from "@/lib/types";

// Global — Windy Webcams API v3. Free Webcams-API key required.
// v3 filters by a `nearby` point ("lat,lon,radius" km). We target India and the
// Orenburg region directly, plus a small global sweep, instead of the first 250.
const NEARBY: Array<[number, number, number, string]> = [
  // India
  [28.61, 77.21, 300, "Delhi"], [19.07, 72.87, 300, "Mumbai"],
  [12.97, 77.59, 300, "Bengaluru"], [13.08, 80.27, 300, "Chennai"],
  [22.57, 88.36, 300, "Kolkata"], [26.91, 75.79, 300, "Jaipur"],
  [15.49, 73.82, 250, "Goa"], [31.10, 77.17, 250, "Himachal"],
  [17.38, 78.49, 300, "Hyderabad"], [23.26, 77.41, 400, "Central India"],
  // Russia incl. Orenburg
  [51.77, 55.10, 450, "Orenburg"], [55.75, 37.62, 300, "Moscow"],
  [59.93, 30.33, 300, "St Petersburg"], [56.84, 60.65, 350, "Yekaterinburg"],
];

async function page(key: string, query: string): Promise<any[]> {
  const out: any[] = [];
  for (let offset = 0; offset < 200; offset += 50) {
    const url = `https://api.windy.com/webcams/api/v3/webcams?limit=50&offset=${offset}` +
      `&include=location,images,urls${query}`;
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
    // targeted regions
    for (const [lat, lon, rad] of NEARBY) {
      try {
        const cams = await page(key, `&nearby=${lat},${lon},${rad}`);
        for (const c of cams) seen.set(c.webcamId, c);
      } catch (e) { console.warn("[windy] nearby", lat, lon, e); }
    }
    // small global sweep for breadth
    try {
      const cams = await page(key, "");
      for (const c of cams) seen.set(c.webcamId, c);
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
        // NOTE: preview URLs are token-secured and expire; the image proxy
        // refetches a fresh one per view. Store it only as a fallback.
        imageUrl: c.images?.current?.preview,
        streamUrl: c.urls?.detail,
        available: c.status === "active",
      }));
  },
};
