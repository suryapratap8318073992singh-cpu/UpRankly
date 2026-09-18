import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { rateLimits } from "@/db/schema";

/**
 * Rate limiter with DEVELOPMENT BYPASS
 * - Development: All requests allowed (no blocking)
 * - Production: Standard rate limiting enforced
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<{ allowed: boolean; remaining: number; retryAfterSeconds: number }> {

  // 🚀 DEVELOPMENT BYPASS - Allow all requests in dev mode
  if (process.env.NODE_ENV === "development") {
    return { allowed: true, remaining: 999, retryAfterSeconds: 0 };
  }

  // Production rate limiting logic
  const now = Date.now();
  const windowMs = windowSeconds * 1000;

  try {
    // Fetch existing record
    const [row] = await db
      .select()
      .from(rateLimits)
      .where(eq(rateLimits.key, key))
      .limit(1);

    // If no record or window expired, reset
    if (!row || (now - row.windowStart.getTime()) > windowMs) {
      await db
        .insert(rateLimits)
        .values({
          key,
          count: 1,
          windowStart: new Date(now),
        })
        .onConflictDoUpdate({
          target: rateLimits.key,
          set: { count: 1, windowStart: new Date(now) },
        });
      return { allowed: true, remaining: limit - 1, retryAfterSeconds: 0 };
    }

    // If limit exceeded
    if (row.count >= limit) {
      const retryAfter = Math.ceil((row.windowStart.getTime() + windowMs - now) / 1000);
      return {
        allowed: false,
        remaining: 0,
        retryAfterSeconds: Math.max(retryAfter, 1),
      };
    }

    // Otherwise increment count
    await db
      .update(rateLimits)
      .set({ count: row.count + 1 })
      .where(eq(rateLimits.key, key));

    return {
      allowed: true,
      remaining: limit - row.count - 1,
      retryAfterSeconds: 0,
    };
  } catch (err) {
    console.error("[rate-limit] failure, failing closed:", err);
    // Fail closed: block on error (security)
    return { allowed: false, remaining: 0, retryAfterSeconds: 60 };
  }
}
