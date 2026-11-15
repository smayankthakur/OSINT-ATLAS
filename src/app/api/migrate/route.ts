import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

// One-shot schema setup for a fresh Postgres (Neon/Vercel Postgres).
// Call once: /api/migrate?secret=INGEST_SECRET
// Idempotent (IF NOT EXISTS / ON CONFLICT). No Supabase anon-RLS: all DB
// access is server-side via DATABASE_URL, so there is no anon surface.
const DDL = `
create table if not exists sources (
  id text primary key, name text not null, country text, licence text,
  adapter text not null, kind text not null default 'image',
  refresh_secs integer not null default 300, enabled boolean not null default true,
  attribution text, last_run timestamptz, last_count integer
);
create table if not exists cameras (
  id text primary key, source_id text not null references sources(id) on delete cascade,
  name text, lat double precision not null, lon double precision not null, country text,
  kind text not null default 'image', image_url text, stream_url text,
  available boolean default true, updated_at timestamptz not null default now()
);
create index if not exists cameras_geo on cameras (lat, lon);
create index if not exists cameras_source on cameras (source_id);
create table if not exists camera_submissions (
  id uuid primary key default gen_random_uuid(),
  property_name text not null, property_type text not null, city text, country text,
  contact_email text not null, lat double precision not null, lon double precision not null,
  image_url text, stream_url text, owner_attested boolean not null default false,
  status text not null default 'pending', created_at timestamptz not null default now()
);
create table if not exists sanctions (
  id text primary key, name text not null, type text, program text,
  call_sign text, flag text, imo text, mmsi text, aliases text, remarks text,
  updated_at timestamptz not null default now()
);
create index if not exists sanctions_name on sanctions (lower(name));
create index if not exists sanctions_mmsi on sanctions (mmsi);
`;

const SEED = [
  ["tfl","TfL JamCams (London)","GB","TfL open data","tfl","image",300,"© Transport for London"],
  ["windy","Windy Webcams (global)","GLOBAL","Windy API ToS","windy","image",600,"© Windy.com"],
  ["optin","Opt-in submissions","GLOBAL","Owner consent on submission","optin","image",300,"Submitted by owner"],
  ["caltrans","Caltrans (California DOT)","US","Caltrans public data","caltrans","stream",300,"© Caltrans"],
  ["fl511","Florida FL511","US","FL511 developer terms","dot511","stream",300,"© FDOT FL511"],
  ["ga511","Georgia 511","US","511GA developer terms","dot511","stream",300,"© GDOT 511GA"],
  ["ny511","New York 511","US","511NY developer terms","dot511","stream",300,"© NYSDOT 511NY"],
];

export async function GET(req: NextRequest) {
  if (req.nextUrl.searchParams.get("secret") !== process.env.INGEST_SECRET)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const db = sql();
  try {
    await db.unsafe(DDL);
    for (const s of SEED) {
      await db`insert into sources (id,name,country,licence,adapter,kind,refresh_secs,attribution)
        values (${s[0]},${s[1]},${s[2]},${s[3]},${s[4]},${s[5]},${s[6]},${s[7]})
        on conflict (id) do nothing`;
    }
    return NextResponse.json({ ok: true, migrated: true, sources: SEED.map((s) => s[0]) });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
