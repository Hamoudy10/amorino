import { NextRequest, NextResponse } from "next/server";
import { Receiver } from "@upstash/qstash";
import {
  handleNotifyOrder,
  handleReviewRequest,
  handleAbandonedPayment,
  handleIdleOrder,
  handleRiderCheckin,
  handleSweep,
} from "@/lib/jobs";

export const dynamic = "force-dynamic";

/**
 * QStash worker. The `[job]` segment selects the handler. Every request must
 * carry a valid QStash signature (verified with the Receiver).
 */
async function dispatch(job: string, req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  try {
    switch (job) {
      case "notify-order-status":
        await handleNotifyOrder(body as never);
        break;
      case "review-request":
        await handleReviewRequest(body as never);
        break;
      case "abandoned-payment":
        await handleAbandonedPayment(body as never);
        break;
      case "idle-order":
        await handleIdleOrder(body as never);
        break;
      case "rider-checkin":
        await handleRiderCheckin(body as never);
        break;
      case "sweep":
        await handleSweep();
        break;
      default:
        return NextResponse.json({ ok: false, error: `Unknown job: ${job}` }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[job]", job, err);
    return NextResponse.json({ ok: false, error: "Job failed" }, { status: 500 });
  }
}

async function verifyAndDispatch(req: NextRequest) {
  const job = req.nextUrl.pathname.split("/").pop() ?? "";
  const signature = req.headers.get("upstash-signature");
  if (!signature) {
    return NextResponse.json({ ok: false, error: "Missing signature" }, { status: 401 });
  }
  const current = process.env.QSTASH_CURRENT_SIGNING_KEY;
  const next = process.env.QSTASH_NEXT_SIGNING_KEY;
  if (current && next) {
    const receiver = new Receiver({ currentSigningKey: current, nextSigningKey: next });
    const body = JSON.stringify(await req.clone().json().catch(() => ({})));
    const isValid = await receiver.verify({ signature, body }).catch(() => false);
    if (!isValid) {
      return NextResponse.json({ ok: false, error: "Invalid signature" }, { status: 401 });
    }
  }
  return dispatch(job, req);
}

export async function POST(req: NextRequest) {
  return verifyAndDispatch(req);
}