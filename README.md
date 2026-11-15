# OSINT ATLAS

Live public cameras + open intelligence on one map. Next.js (App Router) +
MapLibre + Supabase. Own-project scaffold.

## Scope (read this first)

This product aggregates **data that sources publish about themselves or about
public objects**. It deliberately does **not** include:

- **Access to misconfigured / unsecured CCTV** (Shodan/Insecam-style camera
  streams). Connecting to a camera that's only reachable because it's
  misconfigured is unauthorized access + a privacy offence (India IT Act
  s.66/s.66E, DPDP Act; CFAA/GDPR abroad). We use Shodan for **aggregate
  exposure counts only** (see `/api/exposure`), never device access.
- **Person search / profiling** (name, face, or social-account lookup that
  builds a dossier on a private individual). Out of scope by design — it's
  unlawful personal-data processing and the mechanism of doxxing/stalking.

Rule of thumb: **public objects that broadcast their own data = in scope;
private people and private systems that didn't consent = out.**

## What's here

- **Source-adapter registry** — each provider is a plugin in `src/lib/sources/`
  that normalises to one schema. Add a provider = add a file + one line in
  `src/lib/sources/index.ts`.
- **Proxy layer** — `/api/cam/[id]/image`, `/api/flights` fetch upstream
  server-side (hides source URLs, caching, dodges browser CORS).
- **Ingestion cron** — `/api/ingest` pulls every source into Postgres (15 min).
- **Exposure layer** — `/api/exposure?q=webcam` — Shodan aggregate device counts
  by country (risk indicator; no device access).
- **Universal search** — `/api/search?q=` — public objects only (cameras,
  aircraft by callsign). No people.
- **Map** — `src/components/AtlasMap.tsx`.

## Sources (status)

| Source | Region | Status | Notes |
|---|---|---|---|
| `tfl` | London | **working, no key** | TfL JamCams open data |
| `windy` | **Global (incl. India, Russia)** | needs free key | https://api.windy.com/keys |
| `orendor` | Orenburg, RU | **defunct** | domain parked (live-checked 2026-11-15); covered via Windy |
| flights | Global | **working** | adsb.fi via `/api/flights` |
| quakes | Global | **working** | USGS, client-side |
| exposure | Global | needs Shodan key | aggregate counts only |

> **India:** no open government camera feed exists (ITMS/Safe City/ICCC are
> access-controlled). India camera coverage = Windy webcams. For India traffic
> *flow* (not cameras), add a Mappls/TomTom/HERE layer.

## Setup

1. `npm install`
2. Supabase project (free). Run `db/schema.sql` in its SQL editor.
3. `cp .env.example .env.local`, fill: `NEXT_PUBLIC_SUPABASE_URL`,
   `SUPABASE_SERVICE_ROLE_KEY`, optional `WINDY_API_KEY`, `SHODAN_API_KEY`,
   and an `INGEST_SECRET`.
4. Seed once: `http://localhost:3000/api/ingest?source=all&secret=YOUR_SECRET`
5. `npm run dev` → http://localhost:3000

## Deploy

GitHub → Vercel → add env vars. Cron in `vercel.json` runs ingest. Put
Cloudflare in front for cache. Past ~20k cameras, swap live GeoJSON for nightly
PMTiles (Tippecanoe).

## Opt-in camera intake (consent path)

A property owner lists their own public-facing camera — the legitimate way to
add hotels/hostels/universities.

- `/submit` — owner-facing form (requires an ownership attestation checkbox).
- `POST /api/submit` — stores a `pending` row in `camera_submissions`.
- `GET /api/admin/approve?id=<uuid>&secret=<INGEST_SECRET>&decision=approve`
  — moves it into `cameras` under source `optin`. `decision=reject` to drop.

Nothing goes live without approval. Never accept a camera the submitter doesn't
own — the attestation is the lawful basis.

## Exposure layer for the VAPT pipeline

`/api/exposure` returns Shodan **aggregate counts** (no device access):

- `/api/exposure?q=webcam&facet=country` — exposed webcams by country
- `/api/exposure?q=rtsp&country=IN&facet=city` — exposed RTSP by Indian city

Use it to target Sitelytc VAPT outreach: "N exposed camera endpoints in
<city> — we'll secure them." You sell the fix; you never touch the device.
