import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { cookies } from "next/headers";
import crypto from "crypto";

const SESSION_COOKIE = "uprankly_session";
const SESSION_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days

/**
 * Hash password using scrypt (more secure than SHA-256)
 */
export async function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString("hex");
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err);
      resolve(salt + ":" + derivedKey.toString("hex"));
    });
  });
}

/**
 * Verify password against hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const [salt, key] = hash.split(":");
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err);
      resolve(key === derivedKey.toString("hex"));
    });
  });
}

/**
 * Create session token and store in DB
 */
export async function createSession(userId: string, req?: { ip?: string; userAgent?: string }) {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DURATION);

  await db.insert(sessions).values({
    token,
    userId,
    ip: req?.ip || null,
    userAgent: req?.userAgent || null,
    expiresAt,
  });

  return token;
}

/**
 * Set session cookie
 */
export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_DURATION / 1000,
    path: "/",
  });
}

/**
 * Get current user from session cookie
 */
export async function getUser() {
  const user = await getUserOrNull();
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
}

/**
 * Get current user or null (no throw)
 */
export async function getUserOrNull() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const [session] = await db
      .select()
      .from(sessions)
      .where(and(eq(sessions.token, token), gt(sessions.expiresAt, new Date())))
      .limit(1);

    if (!session) return null;

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1);

    if (!user || user.status !== "active") return null;

    return user;
  } catch (err) {
    console.error("[auth] getUserOrNull error:", err);
    return null;
  }
}

/**
 * Logout - clear session cookie and delete from DB
 */
export async function logout() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (token) {
    await db.delete(sessions).where(eq(sessions.token, token));
  }

  cookieStore.delete(SESSION_COOKIE);
}

/**
 * Check if user is admin
 */
export async function requireAdmin() {
  const user = await getUser();
  if (!user.isAdmin) {
    throw new Error("Admin access required");
  }
  return user;
}

/**
 * Update last login timestamp
 */
export async function updateLastLogin(userId: string) {
  await db
    .update(users)
    .set({ lastLoginAt: new Date() })
    .where(eq(users.id, userId));
}

/**
 * Ensure admin user exists (called on server startup)
 */
export async function ensureAdminExists() {
  const adminEmail = "admin@uprankly.in";
  const adminPassword = "jagdish9041";

  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.email, adminEmail))
    .limit(1);

  if (!existing) {
    const passwordHash = await hashPassword(adminPassword);
    await db.insert(users).values({
      email: adminEmail,
      passwordHash,
      fullName: "Admin",
      businessName: "UpRankly",
      websiteUrl: "https://uprankly.in",
      role: "admin",
      isAdmin: true,
      status: "active",
    });
    console.log("[auth] Admin user created: admin@uprankly.in");
  }
}

/**
 * Get admin user or null (compatibility function)
 */
export async function getAdminOrNull() {
  const user = await getUserOrNull();
  if (!user || !user.isAdmin) return null;
  return user;
}

/**
 * Check if user is super admin (compatibility function)
 */
export function isSuperAdmin(user: { role?: string | null; isAdmin?: boolean | null } | null) {
  if (!user) return false;
  return user.isAdmin === true || user.role === "admin" || user.role === "super_admin";
}

// Import sessions after other exports to avoid circular dependency
import { sessions } from "@/db/schema";
import { and, gt } from "drizzle-orm";
