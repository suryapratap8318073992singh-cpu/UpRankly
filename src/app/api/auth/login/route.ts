import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { verifyPassword, createSession, setSessionCookie, updateLastLogin } from "@/lib/auth";
import { loginSchema } from "@/lib/validation";
import { rateLimit } from "@/lib/ratelimit";

/**
 * POST /api/auth/login
 * Login with email + password
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Validate input
    const result = loginSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { ok: false, error: { message: "Invalid input", fields: result.error.flatten().fieldErrors } },
        { status: 400 }
      );
    }

    const { email, password } = result.data;

    // Rate limiting: 10 attempts per 15 minutes
    const rateLimitKey = `login:${email}`;
    const { allowed, retryAfterSeconds } = await rateLimit(rateLimitKey, 10, 15 * 60);
    if (!allowed) {
      return NextResponse.json(
        {
          ok: false,
          error: { message: `Too many login attempts. Try again in ${retryAfterSeconds} seconds.` },
        },
        { status: 429 }
      );
    }

    // Find user by email
    // NOTE: `.limit(1)` literal number hai — isse "limit $2 must be bigint" error NAHI aata.
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user) {
      return NextResponse.json(
        { ok: false, error: { message: "Invalid email or password" } },
        { status: 401 }
      );
    }

    // Check if user is blocked
    if (user.status === "blocked") {
      return NextResponse.json(
        { ok: false, error: { message: "Your account has been blocked" } },
        { status: 403 }
      );
    }

    // OTP wale purane users ke passwordHash null/undefined honge — guard zaroori hai
    if (!user.passwordHash) {
      console.error("[auth/login] User without passwordHash:", user.email);
      return NextResponse.json(
        { ok: false, error: { message: "Invalid email or password" } },
        { status: 401 }
      );
    }

    // Verify password (malformed/garbled hash par bhi 500 nahi, 401 milega)
    let valid = false;
    try {
      valid = await verifyPassword(password, user.passwordHash);
    } catch (err) {
      console.error("[auth/login] verifyPassword threw:", err);
      valid = false;
    }
    if (!valid) {
      return NextResponse.json(
        { ok: false, error: { message: "Invalid email or password" } },
        { status: 401 }
      );
    }

    // Create session
    const token = await createSession(user.id, {
      ip: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || undefined,
      userAgent: req.headers.get("user-agent") || undefined,
    });

    // Set session cookie
    await setSessionCookie(token);

    // Update last login timestamp
    await updateLastLogin(user.id);

    return NextResponse.json({
      ok: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          isAdmin: user.isAdmin,
        },
      },
    });
  } catch (err) {
    console.error("[auth/login] error:", err);
    return NextResponse.json(
      { ok: false, error: { message: "Internal server error" } },
      { status: 500 }
    );
  }
}
