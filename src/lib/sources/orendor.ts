import type { SourceAdapter, NormalisedCamera } from "@/lib/types";

// Orenburg, Russia — the old regional road-CCTV portal "Infodor" (orendor.ru)
// is DEFUNCT. Live-checked 2026-11-15: the domain now returns a parked
// "Success! Your new web server is ready" placeholder, no camera feed.
// No clean official Orenburg live feed currently exists, so Orenburg coverage
// comes via the Windy global adapter where webcams are present there.
// If an official Orenburg feed returns, wire it here (list endpoint -> fields).
export const orendor: SourceAdapter = {
  id: "orendor",
  async fetchCameras(): Promise<NormalisedCamera[]> {
    return []; // defunct source — see note above
  },
};
