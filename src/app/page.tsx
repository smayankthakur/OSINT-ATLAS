import AtlasMapClient from "@/components/AtlasMapClient";

// Server component shell. The map renders client-only (needs the browser;
// SSR would cause hydration mismatches).
export default function Page() {
  return <AtlasMapClient />;
}
