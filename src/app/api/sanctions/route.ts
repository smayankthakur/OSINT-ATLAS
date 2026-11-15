import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

// Screen a name / vessel / entity against the OFAC SDN list.
// /api/sanctions?q=<name|imo|mmsi>
export async function GET(req: NextRequest) {
  const term = (req.nextUrl.searchParams.get("q") || "").trim();
  if (term.length < 2) return NextResponse.json({ q: term, matches: [] });
  const db = sql();
  const like = `%${term}%`;
  let rows;
  try {
    rows = await db`
      select id,name,type,program,flag,imo,mmsi,aliases,remarks from sanctions
      where name ilike ${like} or aliases ilike ${like}
         or imo = ${term} or mmsi = ${term}
      order by name limit 30`;
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
  return NextResponse.json({ q: term, matches: rows,
    cleared: rows.length === 0 }, { headers: { "cache-control": "public, max-age=300" } });
}
