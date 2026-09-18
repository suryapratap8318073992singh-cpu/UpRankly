import { ok, fail } from "@/lib/api";
import { getUserOrNull } from "@/lib/auth";

export async function GET() {
  const user = await getUserOrNull();
  if (!user) return fail(401, "UNAUTHORIZED", "Not signed in.");
  return ok({
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
    },
  });
}
