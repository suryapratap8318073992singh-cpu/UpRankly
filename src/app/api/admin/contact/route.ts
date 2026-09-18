import { z } from "zod";
import { ok, fail, zodFail, getClientInfo } from "@/lib/api";
import { getAdminOrNull, isSuperAdmin } from "@/lib/auth";
import { getContact, setSetting, logActivity } from "@/lib/settings";

const schema = z.object({
  email: z.string().trim().max(160).optional().default(""),
  phone: z.string().trim().max(40).optional().default(""),
  whatsapp: z.string().trim().max(40).optional().default(""),
  instagram: z.string().trim().max(200).optional().default(""),
  facebook: z.string().trim().max(200).optional().default(""),
  linkedin: z.string().trim().max(200).optional().default(""),
  twitter: z.string().trim().max(200).optional().default(""),
  telegram: z.string().trim().max(200).optional().default(""),
  youtube: z.string().trim().max(200).optional().default(""),
  address: z.string().trim().max(500).optional().default(""),
  supportHours: z.string().trim().max(160).optional().default(""),
  supportMessage: z.string().trim().max(500).optional().default(""),
});

/** Contact settings — frontend renders exactly these values (empty = hidden). */
export async function POST(req: Request) {
  const admin = await getAdminOrNull();
  if (!isSuperAdmin(admin)) return fail(403, "FORBIDDEN", "Admin access required.");
  const { ip, userAgent } = getClientInfo(req);

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return zodFail(parsed);
  const next = parsed.data;

  const current = await getContact();
  const changedFields = Object.keys(next).filter(
    (k) => String(current[k as keyof typeof current] ?? "") !== String(next[k as keyof typeof next] ?? ""),
  );

  await setSetting("contact", next);

  await logActivity({
    actorType: "admin",
    actorId: admin.id,
    action: "contact_settings_changed",
    details: { changedFields },
    ip,
    userAgent,
  });

  return ok({ contact: next, changedFields });
}
