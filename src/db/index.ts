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
  max: 10,
  // Fail fast instead of hanging when the DB is unreachable (e.g. serverless
  // cold start without a connected database).
  connectionTimeoutMillis: 5000,
  query_timeout: 10000,
  // Encrypt but don't verify the provider's certificate chain.
  ssl: isRemote ? { rejectUnauthorized: false } : undefined,
});

export const db = drizzle(pool, { schema });
export { pool };
