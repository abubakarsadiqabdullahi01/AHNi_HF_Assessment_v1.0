import { neon } from "@neondatabase/serverless";

// Neon serverless driver — one HTTP round-trip per query, ideal for Vercel
// serverless functions (no connection pooling to manage). Lazily created so a
// missing DATABASE_URL yields a clean runtime error instead of a build crash.
export function getSql() {
  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");
  return neon(connectionString);
}
