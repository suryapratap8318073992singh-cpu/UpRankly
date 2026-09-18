import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { CheckCircle2, IndianRupee } from "lucide-react";
import { db } from "@/db";
import { settings, activityLogs } from "@/db/schema";
import { getAdminOrNull, isSuperAdmin } from "@/lib/auth";
import { setSetting } from "@/lib/settings";
import { PLAN_LABEL } from "@/lib/subscription";
import { Card, PageHeader, Badge } from "@/components/ui";

export const dynamic = "force-dynamic";

const SETTINGS_KEY = "pricing_plans";

type PlanKey = "monthly" | "six_month" | "yearly" | "lifetime";

type PricingPlan = {
  plan: PlanKey;
  label: string;
  price: number; // INR, whole rupees
  durationDays: number | null; // null = lifetime, no expiry
  features: string[];
  enabled: boolean;
  popular: boolean;
};

const PLAN_ORDER: PlanKey[] = ["monthly", "six_month", "yearly", "lifetime"];

const DEFAULT_PLANS: PricingPlan[] = [
  {
    plan: "monthly",
    label: PLAN_LABEL.monthly ?? "Monthly",
    price: 999,
    durationDays: 30,
    features: ["Unlimited audits", "AI growth strategy", "Task management"],
    enabled: true,
    popular: false,
  },
  {
    plan: "six_month",
    label: PLAN_LABEL.six_month ?? "6 Months",
    price: 4999,
    durationDays: 182,
    features: ["Everything in Monthly", "Priority support"],
    enabled: true,
    popular: true,
  },
  {
    plan: "yearly",
    label: PLAN_LABEL.yearly ?? "Yearly",
    price: 8999,
    durationDays: 365,
    features: ["Everything in 6 Months", "2 months free"],
    enabled: true,
    popular: false,
  },
  {
    plan: "lifetime",
    label: PLAN_LABEL.lifetime ?? "Lifetime",
    price: 24999,
    durationDays: null,
    features: ["Everything included", "Never expires"],
    enabled: true,
    popular: false,
  },
];

async function getPricingPlans(): Promise<PricingPlan[]> {
  const [row] = await db
    .select()
    .from(settings)
    .where(eq(settings.key, SETTINGS_KEY))
    .limit(1);

  if (!row || !Array.isArray(row.value)) return DEFAULT_PLANS;

  const saved = row.value as PricingPlan[];
  // merge with defaults so a missing/newly-added plan never breaks the page
  return PLAN_ORDER.map((planKey) => {
    const found = saved.find((p) => p.plan === planKey);
    const fallback = DEFAULT_PLANS.find((p) => p.plan === planKey)!;
    return found ? { ...fallback, ...found } : fallback;
  });
}

type SearchParams = { searchParams: Promise<{ saved?: string }> };

export default async function AdminPricingPage({ searchParams }: SearchParams) {
  const { saved } = await searchParams;
  const admin = await getAdminOrNull();
  if (!admin || !isSuperAdmin(admin)) redirect("/admin/login");

  const plans = await getPricingPlans();

  async function updatePricingPlans(formData: FormData) {
    "use server";

    const actingAdmin = await getAdminOrNull();
    if (!actingAdmin || !isSuperAdmin(actingAdmin)) redirect("/admin/login");

    const updated: PricingPlan[] = PLAN_ORDER.map((planKey) => {
      const label = String(formData.get(`${planKey}_label`) ?? "").trim();
      const priceRaw = String(formData.get(`${planKey}_price`) ?? "0");
      const price = Math.max(0, Math.round(Number(priceRaw) || 0));
      const durationRaw = String(formData.get(`${planKey}_duration`) ?? "");
      const durationDays =
        planKey === "lifetime" || durationRaw.trim() === ""
          ? null
          : Math.max(1, Math.round(Number(durationRaw) || 0));
      const featuresRaw = String(formData.get(`${planKey}_features`) ?? "");
      const features = featuresRaw
        .split("\n")
        .map((f) => f.trim())
        .filter(Boolean);
      const enabled = formData.get(`${planKey}_enabled`) === "on";
      const popular = formData.get(`${planKey}_popular`) === "on";

      return {
        plan: planKey,
        label: label || PLAN_LABEL[planKey] || planKey,
        price,
        durationDays,
        features,
        enabled,
        popular,
      };
    });

    await db
      .insert(settings)
      .values({ key: SETTINGS_KEY, value: updated })
      .onConflictDoUpdate({
        target: settings.key,
        set: { value: updated, updatedAt: new Date() },
      });

    // Keep the simple "pricing" key (used by the public /pricing page and
    // dashboard subscription tab) in sync with this detailed plan list.
    await setSetting(
      "pricing",
      Object.fromEntries(updated.map((p) => [p.plan, p.enabled ? p.price : null])),
    );

    await db.insert(activityLogs).values({
      actorType: "admin",
      actorId: actingAdmin?.id ?? "admin",
      action: "pricing_updated",
      details: { plans: updated.map((p) => ({ plan: p.plan, price: p.price, enabled: p.enabled })) },
    });

    revalidatePath("/admin/pricing");
    revalidatePath("/pricing");
    revalidatePath("/");
    redirect("/admin/pricing?saved=1");
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Pricing & Plans"
        subtitle="Change rates, features and availability — reflects live on the site instantly, no deploy needed"
      />

      {saved === "1" ? (
        <div className="mb-6 flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-300">
          <CheckCircle2 className="h-4 w-4" />
          Pricing updated and live on the site.
        </div>
      ) : null}

      <form action={updatePricingPlans} className="space-y-5">
        <div className="grid gap-5 md:grid-cols-2">
          {plans.map((p) => (
            <Card key={p.plan} className="p-5">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-white">{PLAN_LABEL[p.plan] ?? p.plan}</h3>
                  {p.popular ? <Badge tone="blue">popular</Badge> : null}
                  {!p.enabled ? <Badge tone="neutral">hidden</Badge> : null}
                </div>
              </div>

              <div className="space-y-3">
                <label className="block">
                  <span className="mb-1 block text-[11px] font-medium text-zinc-500">Display label</span>
                  <input
                    name={`${p.plan}_label`}
                    defaultValue={p.label}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-violet-400/50"
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-[11px] font-medium text-zinc-500">Price (INR)</span>
                  <div className="relative">
                    <IndianRupee className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
                    <input
                      name={`${p.plan}_price`}
                      type="number"
                      min={0}
                      defaultValue={p.price}
                      className="w-full rounded-lg border border-white/10 bg-white/5 py-2 pl-8 pr-3 text-sm text-white outline-none focus:border-violet-400/50"
                    />
                  </div>
                </label>

                {p.plan !== "lifetime" ? (
                  <label className="block">
                    <span className="mb-1 block text-[11px] font-medium text-zinc-500">Duration (days)</span>
                    <input
                      name={`${p.plan}_duration`}
                      type="number"
                      min={1}
                      defaultValue={p.durationDays ?? ""}
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-violet-400/50"
                    />
                  </label>
                ) : (
                  <input type="hidden" name={`${p.plan}_duration`} value="" />
                )}

                <label className="block">
                  <span className="mb-1 block text-[11px] font-medium text-zinc-500">
                    Features (one per line)
                  </span>
                  <textarea
                    name={`${p.plan}_features`}
                    defaultValue={p.features.join("\n")}
                    rows={4}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-violet-400/50"
                  />
                </label>

                <div className="flex items-center gap-5 pt-1">
                  <label className="flex items-center gap-2 text-xs text-zinc-300">
                    <input
                      type="checkbox"
                      name={`${p.plan}_enabled`}
                      defaultChecked={p.enabled}
                      className="h-3.5 w-3.5 rounded border-white/20 bg-white/5"
                    />
                    Visible on site
                  </label>
                  <label className="flex items-center gap-2 text-xs text-zinc-300">
                    <input
                      type="checkbox"
                      name={`${p.plan}_popular`}
                      defaultChecked={p.popular}
                      className="h-3.5 w-3.5 rounded border-white/20 bg-white/5"
                    />
                    Mark as "Popular"
                  </label>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="rounded-xl bg-violet-500 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-400"
          >
            Save All Changes
          </button>
        </div>
      </form>
    </div>
  );
}