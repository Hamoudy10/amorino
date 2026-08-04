import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  // Fail fast instead of hanging when the DB is unreachable (e.g. serverless
  // cold start without a connected database).
  connectionTimeoutMillis: 5000,
  query_timeout: 10000,
});

export const db = drizzle(pool, { schema });
export { pool };
