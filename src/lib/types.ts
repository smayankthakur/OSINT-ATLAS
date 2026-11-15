export type CameraKind = "image" | "stream";

export interface NormalisedCamera {
  id: string;            // '{source}:{nativeId}'
  sourceId: string;
  name: string;
  lat: number;
  lon: number;
  country?: string;
  kind: CameraKind;
  imageUrl?: string;     // upstream still
  streamUrl?: string;    // upstream hls/mp4
  available?: boolean;
}

// Every provider implements this. Add a file to src/lib/sources and register it.
export interface SourceAdapter {
  id: string;
  fetchCameras(): Promise<NormalisedCamera[]>;
}
