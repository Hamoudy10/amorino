import { NextRequest } from "next/server";
import { getSettings, updateSetting, type AppSettings } from "@/lib/settings";
import { settingsUpdateSchema } from "@/lib/validators";
import { ok, fail, serverError, unauthorized } from "@/lib/api";
import { requireRole } from "@/lib/auth";

export async function GET() {
  try {
    const user = await requireRole("owner", "admin");
    if (!user) return unauthorized();
    const settings = await getSettings(true);
    return ok(settings);
  } catch (err) {
    return serverError(err);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await requireRole("owner");
    if (!user) return unauthorized("Owner role required");

    const body = await req.json().catch(() => null);
    const parsed = settingsUpdateSchema.safeParse(body);
    if (!parsed.success) return fail("Invalid settings data", 400, parsed.error.flatten());

    const data = parsed.data as unknown as AppSettings;
    await updateSetting("business", data.business);
    await updateSetting("delivery", data.delivery);
    await updateSetting("mpesa", data.mpesa);
    await updateSetting("notifications", data.notifications);

    return ok(await getSettings(true));
  } catch (err) {
    return serverError(err);
  }
}