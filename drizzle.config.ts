import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";

// Next.js loads .env.local automatically, but drizzle-kit does not — load it
// explicitly so the CLI sees the same DATABASE_URL as the app.
config({ path: ".env.local" });

// pg gives `sslmode` connection-string params priority over code-level `ssl`
// options and treats `require` as verify-full, which breaks on Supabase/Neon
// self-signed chains. Strip it from the URL and pass ssl explicitly.
const url = new URL(
  process.env.DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:5432/amorino"
);
const isRemote = url.hostname !== "localhost" && url.hostname !== "127.0.0.1";
url.searchParams.delete("sslmode");

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: url.toString(),
    ssl: isRemote ? { rejectUnauthorized: false } : undefined,
  },
  verbose: true,
  strict: true,
});