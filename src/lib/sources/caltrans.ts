import type { SourceAdapter, NormalisedCamera } from "@/lib/types";

// California DOT (Caltrans) — open CCTV feeds per district. No key.
// Each camera has a static JPEG and often a live HLS (.m3u8) stream.
const DISTRICTS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const pad = (n: number) => String(n).padStart(2, "0");

export const caltrans: SourceAdapter = {
  id: "caltrans",
  async fetchCameras(): Promise<NormalisedCamera[]> {
    const out: NormalisedCamera[] = [];
    await Promise.all(DISTRICTS.map(async (n) => {
      try {
        const url = `https://cwwp2.dot.ca.gov/data/d${n}/cctv/cctvStatusD${pad(n)}.json`;
        const r = await fetch(url, { cache: "no-store" });
        if (!r.ok) return;
        const d = await r.json();
        for (const row of d.data || []) {
          const c = row.cctv; if (!c) continue;
          const loc = c.location || {};
          const lat = parseFloat(loc.latitude), lon = parseFloat(loc.longitude);
          if (!isFinite(lat) || !isFinite(lon) || (lat === 0 && lon === 0)) continue;
          const img = c.imageData?.static?.currentImageURL || "";
          const stream = c.imageData?.streamingVideoURL || "";
          out.push({
            id: `caltrans:${n}-${c.index}`,
            sourceId: "caltrans",
            name: loc.locationName || loc.nearbyPlace || "Caltrans camera",
            lat, lon, country: "US",
            kind: stream ? "stream" : "image",
            imageUrl: img || undefined,
            streamUrl: stream || undefined,
            available: (c.inService || "true") !== "false",
          });
        }
      } catch {}
    }));
    return out;
  },
};
