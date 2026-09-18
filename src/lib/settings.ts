import "server-only";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { activityLogs, notifications, settings } from "@/db/schema";
import type { Plan } from "@/lib/subscription";

/* ------------------------------ Settings ------------------------------ */

export type PricingSettings = Record<Plan, number | null>;
export type ContactSettings = {
  email: string;
  phone: string;
  whatsapp: string;
  instagram: string;
  facebook: string;
  linkedin: string;
  twitter: string;
  telegram: string;
  youtube: string;
  address: string;
  supportHours: string;
  supportMessage: string;
};
export type SiteSettings = {
  siteName: string;
  tagline: string;
  description: string;
  seoTitle: string;
  seoDescription: string;
};
export type AiSettings = {
  auditEnabled: boolean;
  strategyEnabled: boolean;
  contentEnabled: boolean;
  freeAuditsPerDay: number;
};
export type PaymentSettings = {
  upiId: string;
  payeeName: string;
  instructions: string;
};

const DEFAULT_PRICING: PricingSettings = {
  monthly: null,
  six_month: null,
  yearly: null,
  lifetime: null,
};

const DEFAULT_CONTACT: ContactSettings = {
  email: "",
  phone: "",
  whatsapp: "",
  instagram: "",
  facebook: "",
  linkedin: "",
  twitter: "",
  telegram: "",
  youtube: "",
  address: "",
  supportHours: "",
  supportMessage: "",
};

const DEFAULT_SITE: SiteSettings = {
  siteName: "UpRankly",
  tagline: "AI SEO Growth Operating System",
  description:
    "UpRankly is an AI-powered SEO growth platform that audits your website, builds a prioritized SEO strategy and helps you grow your search presence — honestly and continuously.",
  seoTitle: "UpRankly — Turn Your Website Into a Search Growth Engine",
  seoDescription:
    "AI-powered SEO audits, strategy and ongoing optimization for businesses that want a stronger search presence.",
};

const DEFAULT_AI: AiSettings = {
  auditEnabled: true,
  strategyEnabled: true,
  contentEnabled: true,
  freeAuditsPerDay: 5,
};

const DEFAULT_PAYMENT: PaymentSettings = {
  upiId: "",
  payeeName: "",
  instructions: "",
};

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const [row] = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
  if (!row) {
    await db
      .insert(settings)
      .values({ key, value: fallback })
      .onConflictDoNothing();
    return fallback;
  }
  return { ...(fallback as object), ...(row.value as object) } as T;
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  await db
    .insert(settings)
    .values({ key, value, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value, updatedAt: new Date() },
    });
}

export const getPricing = () => getSetting<PricingSettings>("pricing", DEFAULT_PRICING);
export const getContact = () => getSetting<ContactSettings>("contact", DEFAULT_CONTACT);
export const getSite = () => getSetting<SiteSettings>("site", DEFAULT_SITE);
export const getAiSettings = () => getSetting<AiSettings>("ai", DEFAULT_AI);
export const getPayment = () => getSetting<PaymentSettings>("payment", DEFAULT_PAYMENT);

/* ---------------------------- Activity logs --------------------------- */

export async function logActivity(entry: {
  actorType: "user" | "admin" | "system";
  actorId?: string | null;
  userId?: string | null;
  projectId?: string | null;
  action: string;
  details?: Record<string, unknown>;
  ip?: string | null;
  userAgent?: string | null;
}) {
  try {
    await db.insert(activityLogs).values({
      actorType: entry.actorType,
      actorId: entry.actorId ?? null,
      userId: entry.userId ?? null,
      projectId: entry.projectId ?? null,
      action: entry.action,
      details: entry.details ?? null,
      ip: entry.ip ?? null,
      userAgent: entry.userAgent ?? null,
    });
  } catch (err) {
    console.error("[activity] failed to write log:", err);
  }
}

export async function notify(entry: {
  audience: "user" | "admin";
  userId?: string | null;
  projectId?: string | null;
  type: string;
  title: string;
  body?: string;
}) {
  try {
    await db.insert(notifications).values({
      audience: entry.audience,
      userId: entry.userId ?? null,
      projectId: entry.projectId ?? null,
      type: entry.type,
      title: entry.title,
      body: entry.body ?? null,
    });
  } catch (err) {
    console.error("[notify] failed:", err);
  }
}

export async function getRecentNotifications(
  audience: "user" | "admin",
  userId?: string,
  limit = 8,
) {
  if (audience === "user" && userId) {
    return db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(limit);
  }
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.audience, "admin"))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}
