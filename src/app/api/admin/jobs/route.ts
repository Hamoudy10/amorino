import { NextRequest } from "next/server";
import { ok, serverError, unauthorized, fail } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { JOB_DEFINITIONS, type JobKey } from "@/lib/jobs";
import { getQStash } from "@/lib/qstash";
import { z } from "zod";

export const dynamic = "force-dynamic";

/** Job registry + QStash config status + optional manual trigger. */
export async function GET() {
  try {
    const user = await requireRole("owner", "admin");
    if (!user) return unauthorized();

    const configured = Boolean(getQStash());
    const baseUrl = process.env.QSTASH_BASE_URL ?? null;

    return ok({ jobs: JOB_DEFINITIONS, configured, baseUrl });
  } catch (err) {
    return serverError(err);
  }
}

const triggerSchema = z.object({ job: z.enum(JOB_DEFINITIONS.map((j) => j.key) as [JobKey, ...JobKey[]]) });

/** Manually enqueue a job (useful for testing without waiting for crons). */
export async function POST(req: NextRequest) {
  try {
    const user = await requireRole("owner", "admin");
    if (!user) return unauthorized();

    const body = await req.json().catch(() => null);
    const parsed = triggerSchema.safeParse(body);
    if (!parsed.success) return fail("Invalid job", 400, parsed.error.flatten());

    const { enqueueJob } = await import("@/lib/qstash");
    const ok2 = await enqueueJob(parsed.data.job, {});
    if (!ok2) return fail("QStash is not configured (QSTASH_TOKEN missing)", 400);

    return ok({ enqueued: true, job: parsed.data.job });
  } catch (err) {
    return serverError(err);
  }
}