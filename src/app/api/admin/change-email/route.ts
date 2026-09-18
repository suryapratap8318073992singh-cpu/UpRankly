import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { ok, fail, zodFail, getClientInfo } from "@/lib/api";
import { getAdminOrNull, isSuperAdmin, verifyPassword } from "@/lib/auth";
import { logActivity } from "@/lib/settings";

const schema = z.object({
  newEmail: z.string().trim().toLowerCase().email("Enter a valid new email."),
  currentPassword: z.string().min(1, "Current password is required to change email."),
});

export async function POST(req: Request) {
  const admin = await getAdminOrNull();
  if (!isSuperAdmin(admin)) return fail(403, "FORBIDDEN", "Admin access required.");
  const { ip, userAgent } = getClientInfo(req);

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return zodFail(parsed);
  const { newEmail, currentPassword } = parsed.data;

  const valid = await verifyPassword(currentPassword, admin.passwordHash);
  if (!valid) return fail(400, "INVALID_PASSWORD", "Current password is incorrect.");

  const [existing] = await db.select().from(users).where(and(eq(users.email, newEmail), eq(users.isAdmin, true))).limit(1);
  if (existing && existing.id !== admin.id) {
    return fail(409, "EMAIL_IN_USE", "This email is already in use.");
  }

  await db
    .update(users)
    .set({ email: newEmail, updatedAt: new Date() })
    .where(eq(users.id, admin.id));

  await logActivity({
    actorType: "admin",
    actorId: admin.id,
    action: "admin_email_changed",
    details: { oldEmail: admin.email, newEmail },
    ip,
    userAgent,
  });

  return ok({ changed: true, email: newEmail });
}
