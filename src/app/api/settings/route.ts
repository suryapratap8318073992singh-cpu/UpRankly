import { ok } from "@/lib/api";
import { getAiSettings, getContact, getPayment, getPricing, getSite } from "@/lib/settings";
import { geminiAvailable } from "@/lib/gemini";

/** Public, non-sensitive settings used by the frontend. */
export async function GET() {
  const [site, contact, pricing, payment, ai] = await Promise.all([
    getSite(),
    getContact(),
    getPricing(),
    getPayment(),
    getAiSettings(),
  ]);

  // Hide empty contact fields entirely (no fake values).
  const visibleContact: Record<string, string> = {};
  for (const [k, v] of Object.entries(contact)) {
    if (typeof v === "string" && v.trim()) visibleContact[k] = v.trim();
  }

  return ok({
    site: {
      siteName: site.siteName,
      tagline: site.tagline,
      description: site.description,
    },
    contact: visibleContact,
    pricing,
    payment: {
      upiId: payment.upiId || null,
      payeeName: payment.payeeName || null,
      instructions: payment.instructions || null,
    },
    features: {
      aiConfigured: geminiAvailable(),
      auditsEnabled: ai.auditEnabled,
    },
  });
}
