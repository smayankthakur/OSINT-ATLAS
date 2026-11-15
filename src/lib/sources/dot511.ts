import type { SourceAdapter, NormalisedCamera } from "@/lib/types";

// 511 statewide systems share one API with ImageUrl + VideoUrl (live HLS).
// Each needs a free developer key. Add the key env to activate that state.
const STATES = [
  { src: "fl511", base: "https://fl511.com",  env: "FL511_KEY" }, // Florida
  { src: "ga511", base: "https://511ga.org",  env: "GA511_KEY" }, // Georgia
  { src: "ny511", base: "https://511ny.org",  env: "NY511_KEY" }, // New York
];

export const dot511: SourceAdapter = {
  id: "dot511",
  async fetchCameras(): Promise<NormalisedCamera[]> {
    const out: NormalisedCamera[] = [];
    for (const st of STATES) {
      const key = process.env[st.env];
      if (!key) continue;
      try {
        const r = await fetch(`${st.base}/api/getcameras?key=${key}&format=json`, { cache: "no-store" });
        if (!r.ok) { console.warn(`[${st.src}]`, r.status); continue; }
        const list = await r.json();
        for (const c of list) {
          const lat = Number(c.Latitude), lon = Number(c.Longitude);
          if (!isFinite(lat) || !isFinite(lon)) continue;
          const vid = c.VideoUrl || "";
          const img = c.ImageUrl || c.Image || "";
          out.push({
            id: `${st.src}:${c.ID ?? c.Id}`,
            sourceId: st.src,
            name: c.Name || c.Location || "Camera",
            lat, lon, country: "US",
            kind: vid ? "stream" : "image",
            imageUrl: img || undefined,
            streamUrl: vid || undefined,
            available: c.Disabled !== true && c.Blocked !== true,
          });
        }
      } catch (e) { console.warn(`[${st.src}]`, e); }
    }
    return out;
  },
};
