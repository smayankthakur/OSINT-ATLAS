"use client";
import dynamic from "next/dynamic";

// Render the map strictly on the client. MapLibre + browser-only state
// (hash view, timestamps) must never be server-rendered — doing so causes
// React hydration mismatches that tear down and re-mount the tree, which
// made map interactions (cluster zoom, clicks) unreliable.
const AtlasMap = dynamic(() => import("./AtlasMap"), {
  ssr: false,
  loading: () => (
    <div style={{
      position: "absolute", inset: 0, display: "grid", placeItems: "center",
      background: "#05080f", color: "#64748b", font: "14px system-ui",
    }}>
      Loading atlas…
    </div>
  ),
});

export default function AtlasMapClient() {
  return <AtlasMap />;
}
