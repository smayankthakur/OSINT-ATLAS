import type { SourceAdapter, NormalisedCamera } from "@/lib/types";

// Global — Windy Webcams API. Free key required: https://api.windy.com/keys
// Gives worldwide coverage incl. India and Russia. Paginated (limit/offset).
export const windy: SourceAdapter = {
  id: "windy",
  async fetchCameras(): Promise<NormalisedCamera[]> {
    const key = process.env.WINDY_API_KEY;
    if (!key) {
      console.warn("[windy] WINDY_API_KEY not set — skipping");
      return [];
    }
    const out: NormalisedCamera[] = [];
    const limit = 50;
    // Pull a few pages; widen as needed. See docs for bbox/nearby filters.
    for (let offset = 0; offset < 250; offset += limit) {
      const url =
        `https://api.windy.com/webcams/api/v3/webcams?limit=${limit}&offset=${offset}` +
        `&include=location,images,urls`;
      const r = await fetch(url, { headers: { "x-windy-api-key": key } });
      if (!r.ok) {
        console.warn("[windy]", r.status);
        break;
      }
      const data = await r.json();
      const cams: any[] = data.webcams || [];
      if (!cams.length) break;
      for (const c of cams) {
        const loc = c.location || {};
        out.push({
          id: `windy:${c.webcamId}`,
          sourceId: "windy",
          name: c.title || "Webcam",
          lat: loc.latitude,
          lon: loc.longitude,
          country: loc.country,
          kind: "image",
          imageUrl: c.images?.current?.preview,
          streamUrl: c.urls?.detail,
          available: c.status === "active",
        });
      }
    }
    return out.filter((c) => c.lat != null && c.lon != null);
  },
};
