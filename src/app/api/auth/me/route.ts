import { NextResponse } from "next/server";
import { getUserOrNull } from "@/lib/auth";

/**
 * GET /api/auth/me
 * Get current authenticated user
 */
export async function GET() {
  try {
    const user = await getUserOrNull();

    if (!user) {
      return NextResponse.json(
        { ok: false, error: { message: "Not authenticated" } },
        { status: 401 }
      );
    }

    return NextResponse.json({
      ok: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          phone: user.phone,
          country: user.country,
          state: user.state,
          businessName: user.businessName,
          businessDescription: user.businessDescription,
          websiteUrl: user.websiteUrl,
          isAdmin: user.isAdmin,
          role: user.role,
          status: user.status,
          createdAt: user.createdAt,
        },
      },
    });
  } catch (err) {
    console.error("[auth/me] error:", err);
    return NextResponse.json(
      { ok: false, error: { message: "Internal server error" } },
      { status: 500 }
    );
  }
}
