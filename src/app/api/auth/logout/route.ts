import { NextResponse } from "next/server";
import { logout } from "@/lib/auth";

/**
 * POST /api/auth/logout
 * Logout current user
 */
export async function POST() {
  try {
    await logout();

    return NextResponse.json({
      ok: true,
      data: { message: "Logged out successfully" },
    });
  } catch (err) {
    console.error("[auth/logout] error:", err);
    return NextResponse.json(
      { ok: false, error: { message: "Internal server error" } },
      { status: 500 }
    );
  }
}
