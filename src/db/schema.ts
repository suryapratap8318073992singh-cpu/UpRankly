/**
 * UpRankly — Database Schema
 * Updated with country, state, businessName, businessDescription fields
 */
import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/* ------------------------------- Enums ------------------------------- */

export const planEnum = pgEnum("plan_type", [
  "monthly",
  "six_month",
  "yearly",
  "lifetime",
]);

export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "pending",
  "active",
  "expired",
  "cancelled",
  "rejected",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "approved",
  "rejected",
]);

export const taskStatusEnum = pgEnum("seo_task_status", [
  "suggested",
  "approved",
  "in_progress",
  "completed",
  "rejected",
]);

export const taskPriorityEnum = pgEnum("seo_task_priority", [
  "critical",
  "high",
  "medium",
  "low",
]);

export const auditStatusEnum = pgEnum("audit_status", [
  "running",
  "completed",
  "failed",
]);

export const actorTypeEnum = pgEnum("actor_type", ["user", "admin", "system"]);

export const userStatusEnum = pgEnum("user_status", ["active", "blocked"]);

/* ------------------------------- Users -------------------------------- */

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    fullName: text("full_name").notNull(),
    email: text("email").notNull().unique(),
    phone: text("phone"),
    passwordHash: text("password_hash").notNull(),
    // NEW FIELDS for registration
    country: text("country"),
    state: text("state"),
    businessName: text("business_name").notNull(),
    businessDescription: text("business_description"),
    websiteUrl: text("website_url").notNull(),
    role: text("role").default("user"), // 'user', 'admin'
    isAdmin: boolean("is_admin").default(false),
    status: userStatusEnum("status").notNull().default("active"),
    blockedAt: timestamp("blocked_at", { withTimezone: true }),
    blockedReason: text("blocked_reason"),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("users_email_idx").on(t.email),
    index("users_status_idx").on(t.status),
    index("users_admin_idx").on(t.isAdmin),
  ],
);

/* ----------------------------- Sessions ------------------------------ */

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    token: text("token").notNull().unique(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    ip: text("ip"),
    userAgent: text("user_agent"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("sessions_token_idx").on(t.token),
    index("sessions_user_idx").on(t.userId),
  ],
);

/* ----------------------------- Projects ------------------------------ */

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    businessName: text("business_name").notNull(),
    websiteUrl: text("website_url").notNull(),
    allowedDomain: text("allowed_domain").notNull(),
    description: text("description"),
    category: text("category"),
    location: text("location"),
    targetLocations: jsonb("target_locations").$type<string[]>(),
    targetAudience: text("target_audience"),
    competitorUrls: jsonb("competitor_urls").$type<string[]>().default([]),
    targetKeywords: jsonb("target_keywords").$type<string[]>().default([]),
    gbpUrl: text("gbp_url"),
    scriptHitCount: integer("script_hit_count").notNull().default(0),
    scriptLastHitAt: timestamp("script_last_hit_at", { withTimezone: true }),
    scriptLastOrigin: text("script_last_origin"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("projects_user_idx").on(t.userId),
    index("projects_domain_idx").on(t.allowedDomain),
  ],
);

/* ------------------------- Subscriptions/Payments -------------------- */

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    plan: planEnum("plan").notNull(),
    status: subscriptionStatusEnum("status").notNull().default("pending"),
    amountInr: integer("amount_inr").notNull(),
    currency: text("currency").notNull().default("INR"),
    startDate: timestamp("start_date", { withTimezone: true }),
    expiryDate: timestamp("expiry_date", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    cancelledBy: text("cancelled_by"),
    extendedBy: uuid("extended_by").references(() => users.id, {
      onDelete: "set null",
    }),
    extendedAt: timestamp("extended_at", { withTimezone: true }),
    extensionNote: text("extension_note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("subs_project_idx").on(t.projectId),
    index("subs_user_idx").on(t.userId),
    index("subs_status_idx").on(t.status),
    index("subs_expiry_idx").on(t.expiryDate),
  ],
);

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    subscriptionId: uuid("subscription_id").references(() => subscriptions.id, {
      onDelete: "set null",
    }),
    plan: planEnum("plan").notNull(),
    amountInr: integer("amount_inr").notNull(),
    method: text("method").notNull().default("upi"),
    reference: text("reference"),
    proofUrl: text("proof_url"),
    status: paymentStatusEnum("status").notNull().default("pending"),
    submittedAt: timestamp("submitted_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    reviewedBy: uuid("reviewed_by").references(() => users.id, {
      onDelete: "set null",
    }),
    rejectionReason: text("rejection_reason"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("payments_user_idx").on(t.userId),
    index("payments_status_idx").on(t.status),
    index("payments_project_idx").on(t.projectId),
  ],
);

/* ------------------------------ SEO ---------------------------------- */

export const audits = pgTable(
  "seo_audits",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id").references(() => projects.id, {
      onDelete: "cascade",
    }),
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    url: text("url").notNull(),
    domain: text("domain").notNull(),
    status: auditStatusEnum("status").notNull().default("running"),
    score: integer("score"),
    categoryScores: jsonb("category_scores").$type<Record<string, number>>(),
    payload: jsonb("payload").$type<Record<string, unknown>>(),
    ai: jsonb("ai").$type<Record<string, unknown>>(),
    aiStatus: text("ai_status").notNull().default("not_requested"),
    error: text("error"),
    durationMs: integer("duration_ms"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [
    index("audits_project_idx").on(t.projectId),
    index("audits_created_idx").on(t.createdAt),
  ],
);

export const seoTasks = pgTable(
  "seo_tasks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    auditId: uuid("audit_id").references(() => audits.id, {
      onDelete: "set null",
    }),
    type: text("type").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    why: text("why"),
    priority: taskPriorityEnum("priority").notNull().default("medium"),
    expectedImpact: text("expected_impact"),
    difficulty: text("difficulty"),
    status: taskStatusEnum("status").notNull().default("suggested"),
    source: text("source").notNull().default("ai"),
    payload: jsonb("payload").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [
    index("tasks_project_idx").on(t.projectId),
    index("tasks_status_idx").on(t.status),
  ],
);

export const seoMeta = pgTable("seo_meta", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id")
    .notNull()
    .unique()
    .references(() => projects.id, { onDelete: "cascade" }),
  title: text("title"),
  description: text("description"),
  jsonLd: jsonb("json_ld").$type<Record<string, unknown> | null>(),
  enabled: boolean("enabled").notNull().default(false),
  updatedBy: text("updated_by").notNull().default("system"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const seoDataVersions = pgTable(
  "seo_data_versions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    field: text("field").notNull(),
    oldValue: text("old_value"),
    newValue: text("new_value"),
    changedBy: text("changed_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("seo_versions_project_idx").on(t.projectId)],
);

export const integrations = pgTable(
  "integrations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    status: text("status").notNull().default("not_connected"),
    config: jsonb("config").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [uniqueIndex("integrations_project_type_idx").on(t.projectId, t.type)],
);

export const rankTracking = pgTable(
  "rank_tracking",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    keyword: text("keyword").notNull(),
    position: integer("position"),
    url: text("url"),
    source: text("source").notNull(),
    measuredAt: timestamp("measured_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("rank_project_idx").on(t.projectId)],
);

/* ------------------------- Logs / Notifications ----------------------- */

export const activityLogs = pgTable(
  "activity_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    actorType: actorTypeEnum("actor_type").notNull().default("system"),
    actorId: text("actor_id"),
    userId: uuid("user_id"),
    projectId: uuid("project_id"),
    action: text("action").notNull(),
    details: jsonb("details").$type<Record<string, unknown>>(),
    ip: text("ip"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("logs_action_idx").on(t.action),
    index("logs_user_idx").on(t.userId),
    index("logs_project_idx").on(t.projectId),
    index("logs_created_idx").on(t.createdAt),
  ],
);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    audience: text("audience").notNull(),
    userId: uuid("user_id"),
    projectId: uuid("project_id"),
    type: text("type").notNull(),
    title: text("title").notNull(),
    body: text("body"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("notif_audience_idx").on(t.audience),
    index("notif_user_idx").on(t.userId),
  ],
);

/* ------------------------------ Settings ------------------------------ */

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").$type<unknown>().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

/* ---------------------------- Rate limiting --------------------------- */

export const rateLimits = pgTable("rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull().default(0),
  windowStart: timestamp("window_start", { withTimezone: true })
    .defaultNow()
    .notNull(),
});