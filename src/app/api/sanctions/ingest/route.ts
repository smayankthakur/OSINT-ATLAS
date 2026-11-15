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
  const rows = parseCsv(sdnText);
  const db = sql();
  let count = 0;

  for (const r of rows) {
    const id = clean(r[0]); const name = clean(r[1]);
    if (!id || !name) continue;
    const type = clean(r[2]) || "entity";
    const program = clean(r[3]);
    const callSign = clean(r[5]);
    const flag = clean(r[9]);
    const remarks = clean(r[11]);
    const imo = (remarks.match(/\bIMO\s*(\d{7})\b/i) || [])[1] || null;
    const mmsi = (remarks.match(/\bMMSI\s*(\d{9})\b/i) || [])[1] || null;
    const al = (aliases.get(id) || []).join("; ").slice(0, 2000);

    await db`
      insert into sanctions (id,name,type,program,call_sign,flag,imo,mmsi,aliases,remarks,updated_at)
      values (${id},${name},${type},${program},${callSign || null},${flag || null},
              ${imo},${mmsi},${al || null},${remarks || null}, now())
      on conflict (id) do update set
        name=excluded.name, type=excluded.type, program=excluded.program,
        call_sign=excluded.call_sign, flag=excluded.flag, imo=excluded.imo,
        mmsi=excluded.mmsi, aliases=excluded.aliases, remarks=excluded.remarks, updated_at=now()`;
    count++;
  }
  return NextResponse.json({ ok: true, ingested: count });
}
