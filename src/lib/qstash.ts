import { Client } from "@upstash/qstash";

export function getQStash(): Client | null {
  if (!process.env.QSTASH_TOKEN) return null;
  return new Client({ token: process.env.QSTASH_TOKEN });
}

export interface JobPayload {
  job: string;
  payload: Record<string, unknown>;
}

/**
 * Enqueue a background job (e.g. notification fan-out). Falls back to no-op
 * when QStash is not configured.
 */
export async function enqueueJob(job: string, payload: Record<string, unknown>): Promise<boolean> {
  const client = getQStash();
  if (!client) return false;
  try {
    const baseUrl = process.env.QSTASH_BASE_URL ?? "http://localhost:3000";
    await client.publishJSON({
      url: `${baseUrl}/api/jobs/${job}`,
      body: { job, payload } satisfies JobPayload,
    });
    return true;
  } catch {
    return false;
  }
}
