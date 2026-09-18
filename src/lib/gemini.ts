import "server-only";
import { z } from "zod";

/**
 * Gemini AI engine (server-side only).
 * - API key never leaves the server (process.env.GEMINI_API_KEY).
 * - Output is always validated with Zod before being trusted.
 * - Invalid JSON is repaired when possible and safely retried once.
 */

const MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";

export function geminiAvailable(): boolean {
  return !!process.env.GEMINI_API_KEY;
}

/* ------------------------- AI output schemas -------------------------- */

export const technicalFindingSchema = z.object({
  issue: z.string().max(300),
  severity: z.enum(["critical", "high", "medium", "low"]),
  evidence: z.string().max(400).optional().default(""),
  fix: z.string().max(500).optional().default(""),
});

export const keywordSuggestionSchema = z.object({
  keyword: z.string().max(120),
  intent: z.enum(["informational", "commercial", "transactional", "navigational", "local"]).default("informational"),
  relevance: z.enum(["high", "medium", "low"]).default("medium"),
  priority: z.enum(["high", "medium", "low"]).default("medium"),
  contentOpportunity: z.string().max(300).optional().default(""),
});

export const strategyItemSchema = z.object({
  area: z.string().max(120),
  task: z.string().max(300),
  why: z.string().max(500),
  priority: z.enum(["critical", "high", "medium", "low"]).default("medium"),
  expectedImpact: z.string().max(200).optional().default(""),
  difficulty: z.enum(["easy", "moderate", "advanced"]).default("moderate"),
});

export const contentIdeaSchema = z.object({
  title: z.string().max(200),
  intent: z.string().max(120).optional().default(""),
  outline: z.array(z.string().max(200)).max(8).optional().default([]),
});

export const competitorInsightSchema = z.object({
  competitor: z.string().max(200),
  strength: z.string().max(300).optional().default(""),
  weakness: z.string().max(300).optional().default(""),
  opportunity: z.string().max(300).optional().default(""),
  recommendedAction: z.string().max(300).optional().default(""),
});

export const auditAiSchema = z.object({
  summary: z.string().max(1500),
  technicalFindings: z.array(technicalFindingSchema).max(15).default([]),
  keywordStrategy: z.array(keywordSuggestionSchema).max(20).default([]),
  strategy: z.array(strategyItemSchema).max(20).default([]),
  contentIdeas: z.array(contentIdeaSchema).max(10).default([]),
  competitorInsights: z.array(competitorInsightSchema).max(5).default([]),
  suggestedMeta: z
    .object({
      title: z.string().max(120).optional().nullable(),
      description: z.string().max(320).optional().nullable(),
    })
    .optional()
    .nullable(),
});

export type AuditAiOutput = z.infer<typeof auditAiSchema>;

/* ---------------------------- JSON repair ----------------------------- */

function extractJson(text: string): unknown | null {
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  const candidate = cleaned.slice(start, end + 1);
  try {
    return JSON.parse(candidate);
  } catch {
    // attempt minor repair: remove trailing commas
    try {
      return JSON.parse(candidate.replace(/,\s*([}\]])/g, "$1"));
    } catch {
      return null;
    }
  }
}

/* --------------------------- Gemini caller ---------------------------- */

async function callGemini(prompt: string): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { ok: false, error: "GEMINI_API_KEY is not configured." };
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(55_000),
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.35,
          maxOutputTokens: 4096,
        },
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ok: false, error: `Gemini API error (HTTP ${res.status}): ${body.slice(0, 200)}` };
    }
    const json = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    if (!text) return { ok: false, error: "Gemini returned an empty response." };
    return { ok: true, text };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { ok: false, error: `Gemini request failed: ${msg}` };
  }
}

/** Generate validated JSON with one safe retry on invalid output. */
export async function generateAuditAi(
  prompt: string,
): Promise<{ ok: true; data: AuditAiOutput } | { ok: false; error: string }> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const suffix =
      attempt === 0
        ? ""
        : "\n\nYour previous response was invalid. Return ONLY a single valid JSON object that matches the required schema exactly. No markdown, no commentary.";
    const res = await callGemini(prompt + suffix);
    if (!res.ok) return res;
    const parsed = extractJson(res.text);
    if (!parsed) continue;
    const validated = auditAiSchema.safeParse(parsed);
    if (validated.success) return { ok: true, data: validated.data };
  }
  return {
    ok: false,
    error: "The AI response could not be validated. Deterministic audit results are still shown.",
  };
}
