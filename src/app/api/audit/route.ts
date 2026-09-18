import { z } from "zod";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { audits, projects, seoTasks } from "@/db/schema";
import { ok, fail, zodFail, getClientInfo } from "@/lib/api";
import { getUserOrNull } from "@/lib/auth";
import { rateLimit } from "@/lib/ratelimit";
import { validatePublicUrl } from "@/lib/url";
import { fetchCompetitorSignals, runAudit, type CompetitorSignals } from "@/lib/audit";
import { generateAuditAi, geminiAvailable, type AuditAiOutput } from "@/lib/gemini";
import { getAiSettings, logActivity, notify } from "@/lib/settings";

const schema = z.object({
  url: z.string().trim().min(3).max(500),
  projectId: z.string().uuid().optional().nullable(),
  business: z
    .object({
      businessName: z.string().trim().max(160).optional(),
      description: z.string().trim().max(2000).optional(),
      category: z.string().trim().max(120).optional(),
      location: z.string().trim().max(160).optional(),
      targetAudience: z.string().trim().max(500).optional(),
      keywords: z.array(z.string().trim().max(80)).max(20).optional(),
    })
    .optional(),
  competitorUrls: z.array(z.string().trim().max(500)).max(3).optional(),
});

function buildPrompt(input: {
  business: Record<string, unknown>;
  signals: unknown;
  checksSummary: unknown;
  competitors: CompetitorSignals[];
}): string {
  return `You are UpRankly's SEO strategy engine. You receive REAL technical signals extracted from a fetched web page plus optional business context.

STRICT RULES:
- Base every finding ONLY on the provided signals. Never invent traffic, rankings, backlink counts, domain authority or search volumes.
- Never promise a guaranteed Google position. Use realistic language ("improve visibility", "strengthen relevance").
- When suggesting keywords, describe intent/relevance/priority — never claim "high search volume" (no volume data is connected).

Return ONLY a JSON object with EXACTLY this shape:
{
  "summary": "2-4 sentence executive summary of the site's SEO state",
  "technicalFindings": [ { "issue": "...", "severity": "critical|high|medium|low", "evidence": "...", "fix": "..." } ],
  "keywordStrategy": [ { "keyword": "...", "intent": "informational|commercial|transactional|navigational|local", "relevance": "high|medium|low", "priority": "high|medium|low", "contentOpportunity": "..." } ],
  "strategy": [ { "area": "Technical Fixes|On-Page Optimization|Content Strategy|Keyword Strategy|Local SEO|Internal Linking|Structured Data|Competitor Opportunities|Content Gaps|Conversion SEO", "task": "...", "why": "...", "priority": "critical|high|medium|low", "expectedImpact": "...", "difficulty": "easy|moderate|advanced" } ],
  "contentIdeas": [ { "title": "...", "intent": "...", "outline": ["..."] } ],
  "competitorInsights": [ { "competitor": "...", "strength": "...", "weakness": "...", "opportunity": "...", "recommendedAction": "..." } ],
  "suggestedMeta": { "title": "max 60 chars improved title", "description": "max 160 chars improved meta description" }
}
Provide 5-12 technical findings, 8-15 keywords, 8-15 strategy items, 3-6 content ideas. competitorInsights only if competitor data exists (empty array otherwise).

BUSINESS CONTEXT:
${JSON.stringify(input.business, null, 1)}

EXTRACTED PAGE SIGNALS (measured, real):
${JSON.stringify(input.signals, null, 1)}

DETERMINISTIC CHECK RESULTS (already computed):
${JSON.stringify(input.checksSummary, null, 1)}

COMPETITOR SIGNALS (publicly visible facts only):
${JSON.stringify(input.competitors, null, 1)}`;
}

const TASK_TYPE_BY_AREA: Record<string, string> = {
  "technical fixes": "technical_fix",
  "on-page optimization": "metadata",
  "content strategy": "content",
  "keyword strategy": "keyword",
  "local seo": "local_seo",
  "internal linking": "internal_link",
  "structured data": "schema",
  "competitor opportunities": "competitor_analysis",
  "content gaps": "content_gap",
  "conversion seo": "content",
};

export async function POST(req: Request) {
  const { ip, userAgent } = getClientInfo(req);
  const user = await getUserOrNull();
  const ai = await getAiSettings();
  if (!ai.auditEnabled) return fail(403, "AUDIT_DISABLED", "Audits are temporarily disabled.");

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return zodFail(parsed);
  const body = parsed.data;

  // Rate limiting: anonymous users get a small free allowance; signed-in users get more.
  const rlKey = user ? `audit:user:${user.id}` : `audit:ip:${ip}`;
  const rlLimit = user ? 30 : Math.max(1, ai.freeAuditsPerDay);
  const rl = await rateLimit(rlKey, rlLimit, 24 * 3600);
  if (!rl.allowed) {
    return fail(429, "RATE_LIMITED", `Daily audit limit reached (${rlLimit}). ${user ? "Try again tomorrow." : "Create a free account for more audits."}`);
  }

  // Optional: audit attached to an owned project.
  let project: typeof projects.$inferSelect | null = null;
  if (body.projectId) {
    if (!user) return fail(401, "UNAUTHORIZED", "Sign in to audit a project.");
    const [p] = await db.select().from(projects).where(eq(projects.id, body.projectId)).limit(1);
    if (!p || p.userId !== user.id) return fail(404, "NOT_FOUND", "Project not found.");
    project = p;
  }

  const validated = await validatePublicUrl(body.url);
  if (!validated.ok) return fail(400, "INVALID_URL", validated.error);

  const [auditRow] = await db
    .insert(audits)
    .values({
      projectId: project?.id ?? null,
      userId: user?.id ?? null,
      url: validated.url.toString(),
      domain: validated.url.hostname.replace(/^www\./, ""),
      status: "running",
    })
    .returning();

  await logActivity({
    actorType: user ? "user" : "system",
    actorId: user?.id ?? null,
    userId: user?.id ?? null,
    projectId: project?.id ?? null,
    action: "audit_started",
    details: { url: validated.url.toString() },
    ip,
    userAgent,
  });

  const started = Date.now();
  let result: Awaited<ReturnType<typeof runAudit>>;
  try {
    result = await runAudit(validated.url);
  } catch (err) {
    const message = err instanceof Error ? err.message : "The website could not be fetched.";
    await db
      .update(audits)
      .set({ status: "failed", error: message, completedAt: new Date(), durationMs: Date.now() - started })
      .where(eq(audits.id, auditRow.id));
    return fail(422, "FETCH_FAILED", `Could not audit this website: ${message}`);
  }

  // Competitors (from request or project), max 3, best-effort.
  const competitorUrls = (body.competitorUrls ?? (project?.competitorUrls as string[] | null) ?? []).slice(0, 3);
  const competitors: CompetitorSignals[] = [];
  for (const cu of competitorUrls) {
    const v = await validatePublicUrl(cu);
    if (v.ok) competitors.push(await fetchCompetitorSignals(v.url));
  }

  // Merge business context
  const business = {
    businessName: body.business?.businessName ?? project?.businessName ?? null,
    description: body.business?.description ?? project?.description ?? null,
    category: body.business?.category ?? project?.category ?? null,
    location: body.business?.location ?? project?.location ?? null,
    targetAudience: body.business?.targetAudience ?? project?.targetAudience ?? null,
    targetLocations: project?.targetLocations ?? null,
    keywords: body.business?.keywords ?? project?.targetKeywords ?? null,
  };

  // AI strategy (optional — deterministic audit always works without it).
  let aiOutput: AuditAiOutput | null = null;
  let aiStatus: string = geminiAvailable() ? "ok" : "not_configured";
  if (geminiAvailable() && ai.strategyEnabled) {
    const checksSummary = result.checks.map((c) => ({ id: c.id, status: c.status, detail: c.detail }));
    const aiRes = await generateAuditAi(
      buildPrompt({ business, signals: result.signals, checksSummary, competitors }),
    );
    if (aiRes.ok) aiOutput = aiRes.data;
    else {
      aiStatus = "failed";
      console.error("[audit] Gemini failed:", aiRes.error);
    }
  }

  // Persist audit
  const payload = {
    checks: result.checks,
    signals: result.signals,
    competitors,
    business,
  } as Record<string, unknown>;

  const [completedAudit] = await db
    .update(audits)
    .set({
      status: "completed",
      score: result.score,
      categoryScores: result.categoryScores,
      payload,
      ai: (aiOutput as unknown as Record<string, unknown>) ?? null,
      aiStatus,
      durationMs: Date.now() - started,
      completedAt: new Date(),
    })
    .where(eq(audits.id, auditRow.id))
    .returning();

  // Generate task backlog for owned projects (replaces older suggested tasks).
  if (project) {
    await db
      .delete(seoTasks)
      .where(eq(seoTasks.projectId, project.id));
    const taskRows: (typeof seoTasks.$inferInsert)[] = [];

    // Deterministic tasks from failed checks
    for (const c of result.checks) {
      if (c.status === "fail") {
        taskRows.push({
          projectId: project.id,
          auditId: auditRow.id,
          type: "technical_fix",
          title: `Fix: ${c.label}`,
          description: c.detail,
          why: "This check failed in the latest UpRankly audit.",
          priority: c.weight >= 8 ? "high" : "medium",
          expectedImpact: "Removes a measurable SEO issue detected on your page.",
          difficulty: "moderate",
          status: "suggested",
          source: "system",
        });
      }
    }

    // AI strategy tasks
    if (aiOutput) {
      for (const s of aiOutput.strategy) {
        taskRows.push({
          projectId: project.id,
          auditId: auditRow.id,
          type: TASK_TYPE_BY_AREA[s.area.toLowerCase()] ?? "content",
          title: s.task,
          description: `${s.area} — ${s.task}`,
          why: s.why,
          priority: s.priority,
          expectedImpact: s.expectedImpact || null,
          difficulty: s.difficulty,
          status: "suggested",
          source: "ai",
        });
      }
      if (aiOutput.suggestedMeta?.title || aiOutput.suggestedMeta?.description) {
        taskRows.push({
          projectId: project.id,
          auditId: auditRow.id,
          type: "metadata",
          title: "Apply AI-improved meta title & description",
          description: "Review the AI-suggested metadata. Approving stages it for the one-line integration script.",
          why: "Compelling, keyword-relevant metadata improves how your pages appear in search results.",
          priority: "high",
          expectedImpact: "Better search result presentation (CTR opportunity).",
          difficulty: "easy",
          status: "suggested",
          source: "ai",
          payload: { suggestedMeta: aiOutput.suggestedMeta },
        });
      }
    }

    if (taskRows.length > 0) {
      // Insert in ascending priority order for stable listing
      await db.insert(seoTasks).values(taskRows);
    }
  }

  await logActivity({
    actorType: user ? "user" : "system",
    actorId: user?.id ?? null,
    userId: user?.id ?? null,
    projectId: project?.id ?? null,
    action: "audit_completed",
    details: { url: validated.url.toString(), score: result.score, aiStatus },
    ip,
    userAgent,
  });
  if (project && user) {
    await notify({
      audience: "user",
      userId: user.id,
      projectId: project.id,
      type: "audit_completed",
      title: "SEO audit completed",
      body: `${project.businessName} scored ${result.score}/100 on the UpRankly SEO Health Score.`,
    });
  }

  return ok({
    auditId: completedAudit.id,
    score: result.score,
    categoryScores: result.categoryScores,
    checks: result.checks,
    signals: result.signals,
    competitors,
    ai: aiOutput,
    aiStatus,
    disclaimer:
      "UpRankly SEO Health Score is computed from on-page and technical signals we can measure directly. It is not an official Google metric.",
  });
}
