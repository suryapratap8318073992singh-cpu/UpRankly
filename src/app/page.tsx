import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Bot,
  Braces,
  Compass,
  FileSearch,
  Gauge,
  Globe2,
  Layers,
  Link2,
  ListChecks,
  MapPin,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  Workflow,
} from "lucide-react";
import { getContact, getPricing, getSite } from "@/lib/settings";
import { Navbar, Footer, PricingSection, ContactSection, FaqSection } from "@/components/marketing";
import { AuditForm } from "@/components/audit-form";
import { InternalLinkScanButton } from "@/components/internal-link-scan-button";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [site, contact, pricing] = await Promise.all([getSite(), getContact(), getPricing()]);

  const tasks: any[] = [];
  const project = { id: "00fc323b-a633-4c57-a3a3-28448325a8eb" };
  const t = { type: "", payload: null as any };

  const capabilities = [
    { icon: <FileSearch className="h-5 w-5" />, title: "Technical SEO", body: "Indexability, canonicals, robots directives, sitemaps, response signals — measured, not guessed." },
    { icon: <ScanSearch className="h-5 w-5" />, title: "On-Page SEO", body: "Titles, meta descriptions, heading structure, language and viewport checks with clear fixes." },
    { icon: <Compass className="h-5 w-5" />, title: "Keyword Strategy", body: "Intent-aware keyword suggestions from your real content and business context." },
    { icon: <Layers className="h-5 w-5" />, title: "Content Engine", body: "Blog ideas, outlines, FAQs and page suggestions — always human-reviewed before publishing." },
    { icon: <MapPin className="h-5 w-5" />, title: "Local SEO", body: "Location-aware recommendations for businesses that serve specific cities and regions." },
    { icon: <Braces className="h-5 w-5" />, title: "Structured Data", body: "JSON-LD detection and schema recommendations for richer search presentation." },
    { icon: <Link2 className="h-5 w-5" />, title: "Internal Linking", body: "Link structure analysis and opportunities discovered from your page graph." },
    { icon: <Globe2 className="h-5 w-5" />, title: "Competitor Analysis", body: "Publicly visible competitor signals — titles, topics, schema, content gaps. Never invented traffic numbers." },
  ];

  const aiFeatures = [
    { icon: <Bot className="h-5 w-5" />, title: "AI Growth Plan", body: "Gemini reads your audit signals and produces a prioritized, plain-language SEO roadmap." },
    { icon: <ListChecks className="h-5 w-5" />, title: "Task Workflow", body: "Every recommendation becomes a task: Suggested → Approved → In Progress → Completed. Nothing fake-applied." },
    { icon: <Sparkles className="h-5 w-5" />, title: "Approved Metadata", body: "Approve AI-improved titles & descriptions with full version history — then your one-line script applies them." },
    { icon: <Gauge className="h-5 w-5" />, title: "SEO Health Score", body: "A transparent 0–100 score computed from measurable signals. Clearly labelled, never passed off as a Google metric." },
    { icon: <BarChart3 className="h-5 w-5" />, title: "Search Console Ready", body: "The data layer is built for real clicks, impressions and positions the moment you connect GSC — until then we show nothing made up." },
    { icon: <ShieldCheck className="h-5 w-5" />, title: "Honest by Architecture", body: "No fake rankings, no fake backlinks, no fake traffic. If data isn't connected, we say so." },
  ];

  return (
    <div className="uprankly-bg min-h-screen">
      <Navbar siteName={site.siteName} />

      {/* ------------------------------- Hero ------------------------------ */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -top-32 left-1/2 h-96 w-[42rem] -translate-x-1/2 rounded-full bg-emerald-400/10 blur-3xl" />
        <div className="pointer-events-none absolute right-10 top-40 h-64 w-64 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-20 text-center sm:px-6 sm:pt-28">
          <div className="animate-fade-up mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs text-zinc-400">
            <Sparkles className="h-3.5 w-3.5 text-emerald-300" />
            AI SEO Growth Operating System for Businesses
          </div>
          <h1 className="animate-fade-up font-display text-4xl font-bold leading-[1.08] tracking-tight text-white sm:text-6xl lg:text-7xl">
            Turn Your Website Into a
            <br />
            <span className="glow-text">Search Growth Engine.</span>
          </h1>
          <p className="animate-fade-up mx-auto mt-6 max-w-2xl text-base leading-relaxed text-zinc-400 sm:text-lg">
            {site.siteName} audits your website, understands your business, and builds a continuously-updated,
            prioritized SEO strategy — powered by AI, grounded in real data, honest about results.
          </p>
          <div className="animate-fade-up mt-8 flex flex-wrap items-center justify-center gap-3">
            <a
              href="#audit"
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-6 py-3 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-300"
            >
              Get Free SEO Audit
              <ArrowRight className="h-4 w-4" />
            </a>
            <Link
              href="/pricing"
              className="rounded-xl border border-white/15 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/5"
            >
              View Pricing
            </Link>
          </div>

          {/* Floating stat chips (real capabilities, no fake numbers) */}
          <div className="animate-float-slow mx-auto mt-16 hidden max-w-3xl grid-cols-3 gap-3 sm:grid">
            {[
              { icon: <ScanSearch className="h-4 w-4 text-emerald-300" />, t: "20+ real technical checks" },
              { icon: <Bot className="h-4 w-4 text-violet-300" />, t: "AI-generated growth plan" },
              { icon: <Workflow className="h-4 w-4 text-sky-300" />, t: "Task-based execution flow" },
            ].map((c) => (
              <div key={c.t} className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs text-zinc-300">
                {c.icon}
                {c.t}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ----------------------------- Free audit --------------------------- */}
      <section id="audit" className="border-y border-white/5 bg-white/[0.015]">
        <div className="mx-auto max-w-4xl px-4 py-20 sm:px-6">
          <div className="mb-10 text-center">
            <h2 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Get your free SEO audit
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-zinc-500">
              Real signals from your real page — fetched safely, analyzed instantly. Add business context for sharper
              AI recommendations.
            </p>
          </div>
          <AuditForm />
        </div>
      </section>

      {/* ----------------------------- Strategy & Tasks Section ------------------------- */}
      <section id="strategy" className="scroll-mt-24 mx-auto max-w-6xl px-4 py-12">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-500">
          SEO Strategy & Tasks <span className="text-zinc-600">({tasks.length})</span>
        </h2>
        <InternalLinkScanButton projectId={project.id} />

        <div className="mt-4 space-y-4">
          {t.type === "internal_link" && t.payload ? (
            <div className="mt-2 rounded-lg border border-white/10 bg-white/[0.03] p-3 text-xs">
              <p className="flex items-center gap-1.5 text-zinc-400">
                <span className="font-medium text-zinc-300">From:</span>
                <span className="truncate font-mono text-[11px] text-zinc-500">
                  {(t.payload as { sourceUrl?: string }).sourceUrl}
                </span>
              </p>
              <p className="mt-1 flex items-center gap-1.5 text-zinc-400">
                <span className="font-medium text-zinc-300">To:</span>
                <span className="truncate font-mono text-[11px] text-emerald-400/80">
                  {(t.payload as { targetUrl?: string }).targetUrl}
                </span>
              </p>
              <p className="mt-2 text-zinc-500">
                <span className="font-medium text-zinc-300">Context:</span>{" "}
                {(t.payload as { snippet?: string }).snippet}
              </p>
            </div>
          ) : null}

          {t.type === "metadata" && t.payload?.suggestedMeta ? (
            <div />
          ) : null}
        </div>
      </section>

      {/* ----------------------------- How it works ------------------------- */}
      <section id="how" className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
        <div className="mb-14 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">How {site.siteName} works</p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
            From audit to ongoing growth loop
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {[
            { n: "01", t: "Tell us about your business", d: "Website, category, audience, locations, competitors, keywords. The AI understands your context." },
            { n: "02", t: "Deep audit + AI strategy", d: "Real technical signals plus a Gemini-generated, prioritized growth plan with clear 'why' behind every task." },
            { n: "03", t: "Approve & execute", d: "Review tasks, approve metadata changes, follow copy-ready instructions. You stay in control." },
            { n: "04", t: "Integrate & compound", d: "One-line script applies approved changes. Re-audits track progress. Connect GSC when ready." },
          ].map((s) => (
            <div key={s.n} className="group relative rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition hover:border-emerald-400/30">
              <span className="font-display text-3xl font-bold text-white/10 transition group-hover:text-emerald-400/30">{s.n}</span>
              <h3 className="mt-3 text-sm font-semibold text-white">{s.t}</h3>
              <p className="mt-2 text-xs leading-relaxed text-zinc-500">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ----------------------------- Capabilities ------------------------- */}
      <section id="capabilities" className="border-y border-white/5 bg-white/[0.015]">
        <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
          <div className="mb-14 max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">Capabilities</p>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
              A complete SEO operating layer
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-zinc-500">
              Every capability is either fully working today or clearly marked as integration-ready. Nothing pretend.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {capabilities.map((c) => (
              <div key={c.title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-white/20">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-emerald-300">
                  {c.icon}
                </div>
                <h3 className="mt-4 text-sm font-semibold text-white">{c.title}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-zinc-500">{c.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------ AI engine --------------------------- */}
      <section className="relative mx-auto max-w-6xl overflow-hidden px-4 py-24 sm:px-6">
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="relative mb-14 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-300">AI Engine</p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
            AI that respects the truth
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-zinc-500">
            Gemini-powered strategy — validated, auditable, and never allowed to fabricate metrics.
          </p>
        </div>
        <div className="relative grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {aiFeatures.map((f) => (
            <div key={f.title} className="rounded-2xl border border-white/10 bg-[#0a0d14]/80 p-6 backdrop-blur transition hover:border-violet-400/30">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-violet-400/20 bg-violet-400/10 text-violet-300">
                {f.icon}
              </div>
              <h3 className="mt-4 text-sm font-semibold text-white">{f.title}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-zinc-500">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ------------------------------- Pricing ---------------------------- */}
      <section id="pricing" className="border-y border-white/5 bg-white/[0.015]">
        <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
          <div className="mb-14 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">Pricing</p>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Simple plans, honest billing
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-sm text-zinc-500">
              Prices are set by our team and verified manually via UPI. Your countdown starts only after approval.
            </p>
          </div>
          <PricingSection pricing={pricing} />
        </div>
      </section>

      {/* ------------------------------ Why UpRankly -------------------------- */}
      <section className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">Why {site.siteName}</p>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Built for trust, not hype
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-zinc-400">
              Most SEO tools either drown you in dashboards or promise the moon. {site.siteName} is the accountable
              middle: a system that tells you exactly what&rsquo;s measured, what&rsquo;s AI-suggested, what&rsquo;s
              approved, what&rsquo;s applied — and what still needs a human.
            </p>
          </div>
          <div className="space-y-3">
            {[
              "Every metric shown is traceable to a real measurement or account record.",
              "AI suggestions require your approval before anything is applied.",
              "Subscription enforcement is server-side — no plugin can keep working after expiry.",
              "Integration-ready for Search Console, WordPress, Shopify & rank providers.",
            ].map((t) => (
              <div key={t} className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                <p className="text-sm text-zinc-300">{t}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --------------------------------- FAQ ------------------------------ */}
      <section id="faq" className="border-y border-white/5 bg-white/[0.015]">
        <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
          <div className="mb-14 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">FAQ</p>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Straight answers
            </h2>
          </div>
          <FaqSection />
        </div>
      </section>

      {/* ------------------------------- Contact ---------------------------- */}
      <section id="contact" className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
        <div className="mb-12">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">Contact</p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Talk to a human
          </h2>
        </div>
        <ContactSection contact={contact} />
      </section>

      <Footer site={site} contact={contact} />
    </div>
  );
}