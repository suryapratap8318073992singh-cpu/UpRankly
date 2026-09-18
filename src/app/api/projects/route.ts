import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { audits, projects } from "@/db/schema";
import { ok, fail, zodFail, getClientInfo } from "@/lib/api";
import { getUserOrNull } from "@/lib/auth";
import { rateLimit } from "@/lib/ratelimit";
import { normalizeDomain, validatePublicUrl } from "@/lib/url";
import { logActivity, notify } from "@/lib/settings";
import { getProjectSubscription } from "@/lib/subscription";

const schema = z.object({
  businessName: z.string().trim().min(2, "Business name is required.").max(160),
  websiteUrl: z.string().trim().min(3, "Website URL is required.").max(500),
  description: z.string().trim().max(2000).optional().nullable(),
  category: z.string().trim().max(120).optional().nullable(),
  location: z.string().trim().max(160).optional().nullable(),
  targetLocations: z.array(z.string().trim().max(120)).max(30).optional(),
  targetAudience: z.string().trim().max(500).optional().nullable(),
  competitorUrls: z.array(z.string().trim().max(500)).max(5).optional(),
  targetKeywords: z.array(z.string().trim().max(80)).max(30).optional(),
  gbpUrl: z.string().trim().max(500).optional().nullable(),
});

export async function POST(req: Request) {
  const user = await getUserOrNull();
  if (!user) return fail(401, "UNAUTHORIZED", "Please sign in first.");
  const { ip, userAgent } = getClientInfo(req);

  const rl = await rateLimit(`projects:${user.id}`, 20, 3600);
  if (!rl.allowed) return fail(429, "RATE_LIMITED", "Too many requests. Try again later.");

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return zodFail(parsed);
  const body = parsed.data;

  const validated = await validatePublicUrl(body.websiteUrl);
  if (!validated.ok) return fail(400, "INVALID_URL", validated.error);
  const domain = normalizeDomain(validated.url.toString());

  // Duplicate website check (per user)
  const [dup] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.userId, user.id), eq(projects.allowedDomain, domain)))
    .limit(1);
  if (dup) return fail(409, "DUPLICATE", "A project for this website already exists in your account.");

  const [project] = await db
    .insert(projects)
    .values({
      userId: user.id,
      businessName: body.businessName,
      websiteUrl: validated.url.toString(),
      allowedDomain: domain,
      description: body.description ?? null,
      category: body.category ?? null,
      location: body.location ?? null,
      targetLocations: body.targetLocations ?? [],
      targetAudience: body.targetAudience ?? null,
      competitorUrls: body.competitorUrls ?? [],
      targetKeywords: body.targetKeywords ?? [],
      gbpUrl: body.gbpUrl ?? null,
    })
    .returning();

  await logActivity({
    actorType: "user",
    actorId: user.id,
    userId: user.id,
    projectId: project.id,
    action: "project_created",
    details: { businessName: project.businessName, domain },
    ip,
    userAgent,
  });
  await notify({
    audience: "admin",
    userId: user.id,
    projectId: project.id,
    type: "new_project",
    title: "New project created",
    body: `${project.businessName} (${domain})`,
  });

  return ok({ project }, { status: 201 });
}

export async function GET() {
  const user = await getUserOrNull();
  if (!user) return fail(401, "UNAUTHORIZED", "Please sign in first.");

  const rows = await db
    .select()
    .from(projects)
    .where(eq(projects.userId, user.id))
    .orderBy(desc(projects.createdAt));

  const enriched = await Promise.all(
    rows.map(async (p) => {
      const [lastAudit] = await db
        .select({ id: audits.id, score: audits.score, createdAt: audits.createdAt })
        .from(audits)
        .where(eq(audits.projectId, p.id))
        .orderBy(desc(audits.createdAt))
        .limit(1);
      const sub = await getProjectSubscription(p.id);
      return { ...p, lastAudit: lastAudit ?? null, subscription: sub };
    }),
  );

  return ok({ projects: enriched });
}
