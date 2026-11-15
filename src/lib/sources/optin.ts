import type { SourceAdapter, NormalisedCamera } from "@/lib/types";

// Opt-in cameras are inserted at approval time (see /api/admin/approve),
// not polled from an external list, so this adapter returns nothing.
export const optin: SourceAdapter = {
  id: "optin",
  async fetchCameras(): Promise<NormalisedCamera[]> { return []; },
};
