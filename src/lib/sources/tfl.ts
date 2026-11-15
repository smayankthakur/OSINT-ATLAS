import type { SourceAdapter, NormalisedCamera } from "@/lib/types";

// London — Transport for London JamCams. Open data, no key. CONFIRMED WORKING.
export const tfl: SourceAdapter = {
  id: "tfl",
  async fetchCameras(): Promise<NormalisedCamera[]> {
    const r = await fetch("https://api.tfl.gov.uk/Place/Type/JamCam", {
      next: { revalidate: 300 },
    });
    if (!r.ok) throw new Error("tfl " + r.status);
    const places: any[] = await r.json();
    return places
      .filter((p) => p.lat && p.lon)
      .map((p) => {
        const props = Object.fromEntries(
          (p.additionalProperties || []).map((a: any) => [a.key, a.value])
        );
        return {
          id: `tfl:${p.id}`,
          sourceId: "tfl",
          name: p.commonName || "Camera",
          lat: p.lat,
          lon: p.lon,
          country: "GB",
          kind: "image",
          imageUrl: props.imageUrl,
          streamUrl: props.videoUrl,
          available: props.available === "true",
        };
      });
  },
};
