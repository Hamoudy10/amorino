import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { config } from "dotenv";
import * as schema from "./schema";

// Next.js loads .env.local automatically, but standalone scripts (tsx/drizzle
// CLI) do not — and ESM import hoisting means this module must self-load env
// before reading DATABASE_URL below.
config({ path: ".env.local" });

// pg gives the `sslmode` connection-string param priority over the `ssl`
// option passed in code (and treats `require` as verify-full), which breaks
// on Supabase/Neon self-signed chains. So strip sslmode from the URL and
// control TLS explicitly below.
const url = new URL(process.env.DATABASE_URL ?? "postgresql://localhost/postgres");
const isRemote = url.hostname !== "localhost" && url.hostname !== "127.0.0.1";
url.searchParams.delete("sslmode");

const pool = new Pool({
  connectionString: url.toString(),
  // Serverless-friendly: keep per-instance connections minimal and release
  // them quickly. Vercel keeps multiple instances warm; Supabase's pooler
  // caps this project at 15 connections total — oversized pools exhaust it
  // and every later query (including auth role lookups) starts failing.
  max: 2,
  idleTimeoutMillis: 10000,
  // Supabase free tier autosuspends the DB after ~5 min idle — the first
  // query after a pause pays a cold-start wake-up (~3-10s). Keep timeouts
  // generous enough for that, and small enough to fail fast when the DB is
  // genuinely unreachable.
  connectionTimeoutMillis: 20000,
  query_timeout: 30000,
  // Encrypt but don't verify the provider's certificate chain.
  ssl: isRemote ? { rejectUnauthorized: false } : undefined,
});

export const db = drizzle(pool, { schema });
export { pool };
