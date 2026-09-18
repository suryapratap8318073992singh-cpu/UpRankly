import { z } from "zod";
import { ok, fail, zodFail, getClientInfo } from "@/lib/api";
import { getAdminOrNull, isSuperAdmin } from "@/lib/auth";
import { setSetting, logActivity } from "@/lib/settings";

const schema = z.discriminatedUnion("section", [
  z.object({
    section: z.literal("site"),
    data: z.object({
      siteName: z.string().trim().min(1).max(80),
      tagline: z.string().trim().max(120).optional().default(""),
      description: z.string().trim().max(500).optional().default(""),
      seoTitle: z.string().trim().max(120).optional().default(""),
      seoDescription: z.string().trim().max(320).optional().default(""),
    }),
  }),
  z.object({
    section: z.literal("ai"),
    data: z.object({
      auditEnabled: z.boolean(),
      strategyEnabled: z.boolean(),
      contentEnabled: z.boolean(),
      freeAuditsPerDay: z.number().int().min(1).max(50),
    }),
  }),
  z.object({
    section: z.literal("payment"),
    data: z.object({
      upiId: z.string().trim().max(120).optional().default(""),
      payeeName: z.string().trim().max(120).optional().default(""),
      instructions: z.string().trim().max(800).optional().default(""),
    }),
  }),
]);

export async function POST(req: Request) {
  const admin = await getAdminOrNull();
  if (!isSuperAdmin(admin)) return fail(403, "FORBIDDEN", "Admin access required.");
  const { ip, userAgent } = getClientInfo(req);

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return zodFail(parsed);
  const { section, data } = parsed.data;

  await setSetting(section, data);
  await logActivity({
    actorType: "admin",
    actorId: admin.id,
    action: "settings_updated",
    details: { section },
    ip,
    userAgent,
  });

  return ok({ section, data });
}
