import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Ingest the US Treasury OFAC SDN list (individuals, entities, vessels, aircraft).
// Public official data. Call once: /api/sanctions/ingest?secret=INGEST_SECRET
const SDN = "https://www.treasury.gov/ofac/downloads/sdn.csv";
const ALT = "https://www.treasury.gov/ofac/downloads/alt.csv";

// minimal CSV tokenizer (handles quotes + embedded commas/newlines)
function parseCsv(text: string): string[][] {
  const rows: string[][] = []; let row: string[] = []; let field = ""; let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else q = false; }
      else field += c;
    } else {
      if (c === '"') q = true;
      else if (c === ",") { row.push(field); field = ""; }
      else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
      else if (c === "\r") { /* skip */ }
      else field += c;
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}
const clean = (s: string) => { const t = (s || "").trim(); return t === "-0-" ? "" : t; };

export async function GET(req: NextRequest) {
  if (req.nextUrl.searchParams.get("secret") !== process.env.INGEST_SECRET)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // aliases first
  const aliases = new Map<string, string[]>();
  try {
    const altText = await (await fetch(ALT, { cache: "no-store" })).text();
    for (const r of parseCsv(altText)) {
      const ent = clean(r[0]); const name = clean(r[3]);
      if (!ent || !name) continue;
      (aliases.get(ent) || aliases.set(ent, []).get(ent)!).push(name);
    }
  } catch {}

  const sdnText = await (await fetch(SDN, { cache: "no-store" })).text();
  const parsed = parseCsv(sdnText);
  const db = sql();

  const recs: any[] = [];
  for (const r of parsed) {
    const id = clean(r[0]); const name = clean(r[1]);
    if (!id || !name) continue;
    const remarks = clean(r[11]);
    recs.push({
      id, name, type: clean(r[2]) || "entity", program: clean(r[3]),
      call_sign: clean(r[5]) || null, flag: clean(r[9]) || null,
      imo: (remarks.match(/\bIMO\s*(\d{7})\b/i) || [])[1] || null,
      mmsi: (remarks.match(/\bMMSI\s*(\d{9})\b/i) || [])[1] || null,
      aliases: (aliases.get(id) || []).join("; ").slice(0, 2000) || null,
      remarks: remarks || null, updated_at: new Date().toISOString(),
    });
  }

  // batch upserts to stay within the function time limit
  let count = 0;
  const SIZE = 500;
  for (let i = 0; i < recs.length; i += SIZE) {
    const batch = recs.slice(i, i + SIZE);
    await db`
      insert into sanctions ${db(batch, "id", "name", "type", "program", "call_sign",
        "flag", "imo", "mmsi", "aliases", "remarks", "updated_at")}
      on conflict (id) do update set
        name=excluded.name, type=excluded.type, program=excluded.program,
        call_sign=excluded.call_sign, flag=excluded.flag, imo=excluded.imo,
        mmsi=excluded.mmsi, aliases=excluded.aliases, remarks=excluded.remarks, updated_at=now()`;
    count += batch.length;
  }
  return NextResponse.json({ ok: true, ingested: count });
}
