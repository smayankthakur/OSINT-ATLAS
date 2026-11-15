import type { SourceAdapter, NormalisedCamera } from "@/lib/types";

// Curated public live video streams (YouTube) for regions with no open camera
// feed — notably India (government/temple Live Darshan) and Russia (city cams).
// These are public broadcasts; embedded via YouTube. A stream that has ended
// shows as unavailable in the panel (graceful). Update this list as needed.
type L = { id: string; name: string; lat: number; lon: number; country: string; yt: string };
const STREAMS: L[] = [
  // India — temple / city live darshan
  { id: "shirdi",       name: "Shirdi Sai Baba Live Darshan",           lat: 19.7667, lon: 74.4766, country: "IN", yt: "0mtmKO0NAfk" },
  { id: "mahakal",      name: "Mahakaleshwar Ujjain (24x7)",            lat: 23.1828, lon: 75.7682, country: "IN", yt: "vkv0j-eAlro" },
  { id: "siddhivinayak",name: "Siddhivinayak Mumbai Live Darshan",      lat: 19.0170, lon: 72.8302, country: "IN", yt: "P3wZiZ2Gdh0" },
  { id: "baidyanath",   name: "Baba Baidyanath Dham, Deoghar",          lat: 24.4920, lon: 86.7000, country: "IN", yt: "vq8J-P-jkKE" },
  { id: "tiruchendur",  name: "Tiruchendur Murugan Temple",            lat: 8.4961,  lon: 78.1253, country: "IN", yt: "291XDJTjfUM" },
  // Russia — city live cams (all verified embeddable via YouTube oEmbed)
  { id: "msk-novokosino", name: "Novokosino, Moscow",                  lat: 55.7450, lon: 37.8640, country: "RU", yt: "mFOFyCzV8wM" },
  { id: "spb-palace",     name: "Palace Square, St Petersburg (4K)",   lat: 59.9398, lon: 30.3146, country: "RU", yt: "CjtIYbmVfck" },
  { id: "spb-griboedov",  name: "Griboedov Canal, St Petersburg",      lat: 59.9270, lon: 30.3300, country: "RU", yt: "byKS0r0Skn0" },
  { id: "spb-nevsky",     name: "Nevsky Ave / Sadovaya, St Petersburg",lat: 59.9320, lon: 30.3360, country: "RU", yt: "RDchI1SLh4Q" },
  { id: "spb-ptz",        name: "St Petersburg PTZ Live",              lat: 59.9386, lon: 30.3141, country: "RU", yt: "VhGdKCs5KIA" },
  { id: "perm-fair",      name: "Perm — Permskaya Yarmarka",           lat: 58.0100, lon: 56.2300, country: "RU", yt: "_6thFzLFy2E" },
  { id: "solikamsk",      name: "Solikamsk, Perm Krai",                lat: 59.6300, lon: 56.7700, country: "RU", yt: "N7Qr7B43jig" },
];

export const livestreams: SourceAdapter = {
  id: "livestreams",
  async fetchCameras(): Promise<NormalisedCamera[]> {
    return STREAMS.map((s) => ({
      id: `live:${s.id}`,
      sourceId: "livestreams",
      name: s.name,
      lat: s.lat, lon: s.lon, country: s.country,
      kind: "stream",
      streamUrl: `https://www.youtube.com/embed/${s.yt}?autoplay=1&mute=1&playsinline=1`,
      available: true,
    }));
  },
};
