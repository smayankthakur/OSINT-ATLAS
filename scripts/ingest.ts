// Run a one-off ingest locally:  npx tsx scripts/ingest.ts
import { adapters } from "../src/lib/sources";
(async () => {
  for (const [id, a] of Object.entries(adapters)) {
    try { const c = await a.fetchCameras(); console.log(id, "→", c.length, "cameras"); }
    catch (e: any) { console.log(id, "error", e?.message); }
  }
})();
