import Link from "next/link";
import {
  Clock,
  IndianRupee,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Rocket,
  Send,
} from "lucide-react";

/* Brand marks (lucide no longer ships brand icons) */
function InstagramIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}
function FacebookIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}
function LinkedinIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect width="4" height="12" x="2" y="9" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );
}
function XIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M4 4l16 16" />
      <path d="M20 4L4 20" />
    </svg>
  );
}
function YoutubeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
      <path d="m10 15 5-3-5-3z" />
    </svg>
  );
}
import type { ContactSettings, PricingSettings, SiteSettings } from "@/lib/settings";
import { formatInr } from "@/components/ui";
import { PLAN_LABEL } from "@/lib/subscription";

/* -------------------------------- Navbar -------------------------------- */

export function Navbar({ siteName }: { siteName: string }) {
  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-[#05070c]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-violet-500">
            <Rocket className="h-4 w-4 text-white" />
          </span>
          <span className="font-display text-lg font-semibold tracking-tight text-white">{siteName}</span>
        </Link>
        <nav className="hidden items-center gap-7 text-sm text-zinc-400 md:flex">
          <a href="/#how" className="transition hover:text-white">How it works</a>
          <a href="/#capabilities" className="transition hover:text-white">Capabilities</a>
          <Link href="/pricing" className="transition hover:text-white">Pricing</Link>
          <a href="/#faq" className="transition hover:text-white">FAQ</a>
          <Link href="/contact" className="transition hover:text-white">Contact</Link>
        </nav>
        <div className="flex items-center gap-2">
          <Link
            href="/auth"
            className="hidden rounded-lg px-3.5 py-2 text-sm font-medium text-zinc-300 transition hover:text-white sm:block"
          >
            Sign in
          </Link>
          <Link
            href="/#audit"
            className="rounded-lg bg-emerald-400 px-4 py-2 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-300"
          >
            Free SEO Audit
          </Link>
        </div>
      </div>
    </header>
  );
}

/* -------------------------------- Pricing ------------------------------- */

export function PricingSection({ pricing }: { pricing: PricingSettings }) {
  const plans: { id: keyof PricingSettings; label: string; blurb: string; features: string[] }[] = [
    {
      id: "monthly",
      label: PLAN_LABEL.monthly,
      blurb: "Start growing your search presence month by month.",
      features: ["Full AI SEO audit & strategy", "Prioritized task backlog", "One-line integration script", "Email support"],
    },
    {
      id: "six_month",
      label: PLAN_LABEL.six_month,
      blurb: "A full growth cycle — enough time for compounding results.",
      features: ["Everything in Monthly", "Competitor tracking", "Content opportunity engine", "Priority support"],
    },
    {
      id: "yearly",
      label: PLAN_LABEL.yearly,
      blurb: "Best for businesses serious about long-term visibility.",
      features: ["Everything in 6 Months", "Quarterly deep re-audits", "Local SEO playbooks", "Priority support"],
    },
    {
      id: "lifetime",
      label: PLAN_LABEL.lifetime,
      blurb: "One payment. UpRankly stays with your business for good.",
      features: ["Everything in Yearly", "Lifetime updates", "Founding-member support", "No renewals, ever"],
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {plans.map((p) => {
        const price = pricing[p.id];
        return (
          <div
            key={p.id}
            className={`flex flex-col rounded-2xl border p-6 transition ${
              p.id === "yearly"
                ? "border-emerald-400/40 bg-emerald-400/[0.06]"
                : "border-white/10 bg-white/[0.03] hover:border-white/20"
            }`}
          >
            {p.id === "yearly" ? (
              <span className="mb-3 w-fit rounded-full border border-emerald-400/40 bg-emerald-400/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
                Most committed
              </span>
            ) : null}
            <h3 className="font-display text-lg font-semibold text-white">{p.label}</h3>
            <p className="mt-1 text-xs leading-relaxed text-zinc-500">{p.blurb}</p>
            <div className="mt-4 flex items-baseline gap-1">
              {price !== null && price !== undefined ? (
                <>
                  <IndianRupee className="h-5 w-5 self-center text-emerald-300" />
                  <span className="font-display text-3xl font-bold text-white">{price.toLocaleString("en-IN")}</span>
                  {p.id !== "lifetime" ? <span className="text-xs text-zinc-500">/ {p.id === "monthly" ? "mo" : p.id === "six_month" ? "6 mo" : "yr"}</span> : <span className="text-xs text-zinc-500">one-time</span>}
                </>
              ) : (
                <span className="text-sm font-medium text-zinc-400">Contact us for pricing</span>
              )}
            </div>
            <ul className="mt-5 flex-1 space-y-2">
              {p.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-xs text-zinc-400">
                  <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-emerald-400" />
                  {f}
                </li>
              ))}
            </ul>
            <Link
              href="/auth"
              className={`mt-6 rounded-xl py-2.5 text-center text-sm font-semibold transition ${
                p.id === "yearly"
                  ? "bg-emerald-400 text-emerald-950 hover:bg-emerald-300"
                  : "border border-white/15 text-white hover:bg-white/5"
              }`}
            >
              {price !== null && price !== undefined ? "Choose plan" : "Contact us"}
            </Link>
          </div>
        );
      })}
    </div>
  );
}

/* -------------------------------- Contact ------------------------------- */

export function ContactSection({ contact }: { contact: Partial<ContactSettings> }) {
  const items: { icon: React.ReactNode; label: string; value?: string; href?: string }[] = [
    { icon: <Mail className="h-4 w-4" />, label: "Email", value: contact.email, href: contact.email ? `mailto:${contact.email}` : undefined },
    { icon: <Phone className="h-4 w-4" />, label: "Phone", value: contact.phone, href: contact.phone ? `tel:${contact.phone.replace(/\s/g, "")}` : undefined },
    { icon: <MessageCircle className="h-4 w-4" />, label: "WhatsApp", value: contact.whatsapp, href: contact.whatsapp ? `https://wa.me/${contact.whatsapp.replace(/\D/g, "")}` : undefined },
    { icon: <InstagramIcon className="h-4 w-4" />, label: "Instagram", value: contact.instagram, href: contact.instagram },
    { icon: <FacebookIcon className="h-4 w-4" />, label: "Facebook", value: contact.facebook, href: contact.facebook },
    { icon: <LinkedinIcon className="h-4 w-4" />, label: "LinkedIn", value: contact.linkedin, href: contact.linkedin },
    { icon: <XIcon className="h-4 w-4" />, label: "Twitter / X", value: contact.twitter, href: contact.twitter },
    { icon: <Send className="h-4 w-4" />, label: "Telegram", value: contact.telegram, href: contact.telegram },
    { icon: <YoutubeIcon className="h-4 w-4" />, label: "YouTube", value: contact.youtube, href: contact.youtube },
    { icon: <MapPin className="h-4 w-4" />, label: "Office", value: contact.address },
    { icon: <Clock className="h-4 w-4" />, label: "Support hours", value: contact.supportHours },
  ];
  const visible = items.filter((i) => i.value && i.value.trim());

  if (visible.length === 0 && !contact.supportMessage) {
    return (
      <p className="text-sm text-zinc-500">
        Contact details are being configured by our team. Please check back soon or create an account and reach out
        from your dashboard.
      </p>
    );
  }

  return (
    <div>
      {contact.supportMessage ? (
        <p className="mb-6 max-w-2xl text-sm leading-relaxed text-zinc-400">{contact.supportMessage}</p>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((i) => (
          <div key={i.label} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-emerald-300">
              {i.icon}
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">{i.label}</p>
              {i.href ? (
                <a href={i.href} target={i.href.startsWith("http") ? "_blank" : undefined} rel="noreferrer" className="block truncate text-sm text-zinc-200 transition hover:text-emerald-300">
                  {i.value}
                </a>
              ) : (
                <p className="truncate text-sm text-zinc-200">{i.value}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* --------------------------------- FAQ ---------------------------------- */

const FAQS = [
  {
    q: "Will UpRankly guarantee me the #1 position on Google?",
    a: "No — and you should be cautious of anyone who does. SEO results vary by competition, search intent, location, website quality and Google's algorithms. UpRankly focuses on what is real: deep technical audits, a prioritized growth plan, honest tracking and continuous optimization to improve your chances of stronger search visibility.",
  },
  {
    q: "How does the free SEO audit work?",
    a: "Enter your website URL and our engine safely fetches your page, parses the real HTML (titles, meta tags, headings, structured data, links, content depth and more), computes an UpRankly SEO Health Score and, when the AI engine is configured, generates a tailored growth strategy.",
  },
  {
    q: "Does the one-line script magically fix my SEO?",
    a: "No. The script applies metadata you explicitly approve while your subscription is active — it's a convenience layer. Proper SEO also needs server-rendered content, sitemaps, structured data and real content improvements, which is exactly what your UpRankly task plan walks you through.",
  },
  {
    q: "How do payments work?",
    a: "Plans are priced by our team and shown in INR. You pay via UPI, submit your transaction reference, and an admin verifies it before activating your subscription. Your subscription countdown only starts after approval. Nothing is auto-charged.",
  },
  {
    q: "What data does UpRankly show — is any of it estimated?",
    a: "Everything shown is measured directly from your website or taken from your account records. Features that need external data (rank tracking, Search Console metrics) stay marked as 'not connected' until a legitimate integration exists. We never show fake traffic, rankings or backlinks.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. Monthly, 6-month and yearly subscriptions simply expire at the end of their term if not renewed. Lifetime plans never expire. Cancellation stops protected automation immediately and is recorded with an exact timestamp.",
  },
];

export function FaqSection() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {FAQS.map((f) => (
        <div key={f.q} className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <h3 className="text-sm font-semibold text-white">{f.q}</h3>
          <p className="mt-2 text-sm leading-relaxed text-zinc-500">{f.a}</p>
        </div>
      ))}
    </div>
  );
}

/* -------------------------------- Footer -------------------------------- */

export function Footer({
  site,
  contact,
}: {
  site: SiteSettings;
  contact: Partial<ContactSettings>;
}) {
  const socials = [
    { icon: <InstagramIcon className="h-4 w-4" />, href: contact.instagram, label: "Instagram" },
    { icon: <XIcon className="h-4 w-4" />, href: contact.twitter, label: "Twitter/X" },
    { icon: <LinkedinIcon className="h-4 w-4" />, href: contact.linkedin, label: "LinkedIn" },
    { icon: <FacebookIcon className="h-4 w-4" />, href: contact.facebook, label: "Facebook" },
    { icon: <YoutubeIcon className="h-4 w-4" />, href: contact.youtube, label: "YouTube" },
  ].filter((s) => s.href && s.href.trim());

  return (
    <footer className="border-t border-white/5">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <Link href="/" className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-violet-500">
                <Rocket className="h-4 w-4 text-white" />
              </span>
              <span className="font-display text-lg font-semibold text-white">{site.siteName}</span>
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-zinc-500">{site.description}</p>
            {socials.length > 0 ? (
              <div className="mt-5 flex gap-2">
                {socials.map((s) => (
                  <a
                    key={s.label}
                    href={s.href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={s.label}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-zinc-400 transition hover:border-emerald-400/40 hover:text-emerald-300"
                  >
                    {s.icon}
                  </a>
                ))}
              </div>
            ) : null}
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Product</p>
            <ul className="mt-4 space-y-2.5 text-sm text-zinc-400">
              <li><a href="/#audit" className="transition hover:text-white">Free SEO Audit</a></li>
              <li><Link href="/pricing" className="transition hover:text-white">Pricing</Link></li>
              <li><Link href="/auth" className="transition hover:text-white">Dashboard</Link></li>
              <li><Link href="/contact" className="transition hover:text-white">Contact & Support</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Contact</p>
            <ul className="mt-4 space-y-2.5 text-sm text-zinc-400">
              {contact.email ? <li className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-zinc-600" />{contact.email}</li> : null}
              {contact.phone ? <li className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-zinc-600" />{contact.phone}</li> : null}
              {contact.address ? <li className="flex items-start gap-2"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-600" />{contact.address}</li> : null}
            </ul>
          </div>
        </div>
        <div className="mt-12 border-t border-white/5 pt-6">
          <p className="text-xs leading-relaxed text-zinc-600">
            SEO results vary by competition, search intent, location, website quality and Google&rsquo;s algorithms.
            {site.siteName} helps optimize and improve search visibility but does not guarantee a specific Google
            ranking.
          </p>
          <p className="mt-3 text-xs text-zinc-600">© {new Date().getFullYear()} {site.siteName}. Built with honest SEO in mind.</p>
        </div>
      </div>
    </footer>
  );
}
