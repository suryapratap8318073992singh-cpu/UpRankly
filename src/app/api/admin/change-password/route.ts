import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { ok, fail, zodFail, getClientInfo } from "@/lib/api";
import {
  getAdminOrNull,
  isSuperAdmin,
  hashPassword,
  verifyPassword,
} from "@/lib/auth";
import { logActivity } from "@/lib/settings";

const schema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required."),
    newPassword: z.string().min(10, "New password must be at least 10 characters.").max(200),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

/** Password is only ever stored as a scrypt hash. Sessions are rotated. */
export async function POST(req: Request) {
  const admin = await getAdminOrNull();
  if (!isSuperAdmin(admin)) return fail(403, "FORBIDDEN", "Admin access required.");
  const { ip, userAgent } = getClientInfo(req);

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return zodFail(parsed);
  const { currentPassword, newPassword } = parsed.data;

  const valid = await verifyPassword(currentPassword, admin.passwordHash);
  if (!valid) return fail(400, "INVALID_PASSWORD", "Current password is incorrect.");

  const passwordHash = await hashPassword(newPassword);
  await db
    .update(users)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(users.id, admin.id));

  // Never log the password itself — only the fact that it changed.
  await logActivity({
    actorType: "admin",
    actorId: admin.id,
    action: "admin_password_changed",
    details: { email: admin.email },
    ip,
    userAgent,
  });

  return ok({ changed: true, note: "Password updated successfully." });
}
