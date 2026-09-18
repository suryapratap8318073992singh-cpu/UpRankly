import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { hashPassword } from "@/lib/auth";
import { rateLimit } from "@/lib/ratelimit";

// NOTE: "crypto" import hata diya — unused tha (build fail kar sakta tha noUnusedLocals ke saath).
// Agar `@/lib/auth` se hashPassword export nahi hai, to us file mein export check karo.

// Helper: string trim karke deta hai, warna null (phone/country/state jaise optional fields ke liye)
const asStringOrNull = (v: unknown): string | null =>
  typeof v === "string" && v.trim() ? v.trim() : null;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      fullName,
      email,
      password,
      phone,
      country,
      state,
      businessName,
      websiteUrl,
      businessDescription,
    } = body ?? {};

    // ---- Validations (type-safe) ----

    if (typeof fullName !== "string" || fullName.trim().length < 2) {
      return NextResponse.json(
        { ok: false, error: { message: "Full name must be at least 2 characters" } },
        { status: 400 }
      );
    }

    if (typeof email !== "string" || !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      return NextResponse.json(
        { ok: false, error: { message: "Invalid email address" } },
        { status: 400 }
      );
    }

    if (typeof password !== "string" || password.length < 8) {
      return NextResponse.json(
        { ok: false, error: { message: "Password must be at least 8 characters" } },
        { status: 400 }
      );
    }

    if (typeof businessName !== "string" || businessName.trim().length < 2) {
      return NextResponse.json(
        { ok: false, error: { message: "Business name is required" } },
        { status: 400 }
      );
    }

    if (typeof websiteUrl !== "string" || !websiteUrl.trim()) {
      return NextResponse.json(
        { ok: false, error: { message: "Website URL is required" } },
        { status: 400 }
      );
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(websiteUrl);
    } catch {
      return NextResponse.json(
        { ok: false, error: { message: "Invalid website URL format" } },
        { status: 400 }
      );
    }
    // Sirf http/https allow karo (javascript: jaise URLs block)
    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      return NextResponse.json(
        { ok: false, error: { message: "Website URL must be http or https" } },
        { status: 400 }
      );
    }

    // ---- Log: password kabhi log mat karo (pehle pura body log ho raha tha — security leak) ----
    console.log("[register] Attempt:", {
      fullName: typeof fullName === "string" ? fullName : null,
      email: typeof email === "string" ? email : null,
      businessName: typeof businessName === "string" ? businessName : null,
    });

    // ---- Rate Limit (Dev me bypass) ----
    if (process.env.NODE_ENV !== "development") {
      const ip = req.headers.get("x-forwarded-for") || "unknown";
      const rateLimitKey = `register:${ip}`;
      const { allowed, retryAfterSeconds } = await rateLimit(rateLimitKey, 10, 15 * 60);
      if (!allowed) {
        return NextResponse.json(
          {
            ok: false,
            error: {
              message: `Too many registration attempts. Try again in ${retryAfterSeconds} seconds.`,
            },
          },
          { status: 429 }
        );
      }
    }

    // ---- Check existing user ----
    // `.limit(1)` — literal number hai, strict integer. String kabhi nahi banegi.
    // Is shot "limit $2 must be bigint" wala ERROR is line se NAHI aata — wo login route mein hai.
    const [existing] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.trim()))
      .limit(1);

    if (existing) {
      return NextResponse.json(
        { ok: false, error: { message: "Email already registered" } },
        { status: 409 }
      );
    }

    // ---- Hash password ----
    const passwordHash = await hashPassword(password);

    // ---- Insert user ----
    const insertData = {
      fullName: fullName.trim(),
      email: email.trim(),
      passwordHash,
      phone: asStringOrNull(phone),
      country: asStringOrNull(country),
      state: asStringOrNull(state),
      businessName: businessName.trim(),
      businessDescription: asStringOrNull(businessDescription),
      websiteUrl: websiteUrl.trim(),
      role: "user",
      isAdmin: false,
      status: "active",
    };

    const [newUser] = await db.insert(users).values(insertData).returning();

    // Agar returning() khali aaye to newUser undefined hoga — pehle isi par crash hota
    if (!newUser) {
      console.error("[auth/register] Insert succeeded but no row returned");
      return NextResponse.json(
        { ok: false, error: { message: "Could not create user" } },
        { status: 500 }
      );
    }

    console.log("[register] Created user:", { id: newUser.id, email: newUser.email });

    // ---- Response with email/password for popup ----
    // SECURITY NOTE: plain password response mein wapas bhejna production ke liye risky hai.
    // Abhi popup ke liye chahiye, isliye rakha hai — baad mein hata dena.
    return NextResponse.json({
      ok: true,
      data: {
        user: {
          id: newUser.id,
          email: newUser.email,
          fullName: newUser.fullName,
        },
        email: newUser.email,
        password: password, // plain password for popup
      },
    });
  } catch (err: any) {
    console.error("[auth/register] ERROR:", err);
    // Detailed error response for debugging
    return NextResponse.json(
      {
        ok: false,
        error: {
          message: err?.message || "Internal server error",
          detail: err?.detail || null,
          code: err?.code || null,
        },
      },
      { status: 500 }
    );
  }
}
