import postgres from "postgres";

// Provider-agnostic Postgres (Neon, Vercel Postgres, Supabase, any PG).
// Set DATABASE_URL to the pooled connection string.
let _sql: ReturnType<typeof postgres> | null = null;
export function sql() {
  if (!_sql) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL not set");
    _sql = postgres(url, { ssl: "require", prepare: false });
  }
  return _sql;
}
