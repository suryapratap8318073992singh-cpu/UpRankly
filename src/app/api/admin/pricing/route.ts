import { z } from "zod";
import { ok, fail, zodFail, getClientInfo } from "@/lib/api";
import { getAdminOrNull, isSuperAdmin } from "@/lib/auth";
import { getPricing, setSetting, logActivity } from "@/lib/settings";

const schema = z.object({
  monthly: z.number().int().min(0).max(100000000).nullable(),
  six_month: z.number().int().min(0).max(100000000).nullable(),
  yearly: z.number().int().int().min(0).max(100000000).nullable(),
  lifetime: z.number().int().min(0).max(100000000).nullable(),
});

/**
 * Update plan pricing. Every change is audit-logged with old → new values.
 * Past payments are never affected — the amount at purchase time is stored
 * on each payment/subscription record.
 */
export async function POST(req: Request) {
  const admin = await getAdminOrNull();
  if (!isSuperAdmin(admin)) return fail(403, "FORBIDDEN", "Admin access required.");
  const { ip, userAgent } = getClientInfo(req);

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return zodFail(parsed);
  const next = parsed.data;

  const current = await getPricing();
  const changes: Record<string, { old: number | null; new: number | null }> = {};
  for (const plan of ["monthly", "six_month", "yearly", "lifetime"] as const) {
    if (current[plan] !== next[plan]) changes[plan] = { old: current[plan], new: next[plan] };
  }

  await setSetting("pricing", next);

  if (Object.keys(changes).length > 0) {
    await logActivity({
      actorType: "admin",
      actorId: admin.id,
      action: "price_changed",
      details: { changes },
      ip,
      userAgent,
    });
  }

  return ok({ pricing: next, changes });
}
