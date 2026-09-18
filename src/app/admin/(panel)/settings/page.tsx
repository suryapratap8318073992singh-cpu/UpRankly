import Link from "next/link";
import { redirect } from "next/navigation";
import { Bot, Globe2, KeyRound, Mail, PhoneCall } from "lucide-react";
import { getAdminOrNull, isSuperAdmin } from "@/lib/auth";
import { getAiSettings, getContact, getSite } from "@/lib/settings";
import { Card, PageHeader } from "@/components/ui";
import { AiForm, ChangeEmailForm, ChangePasswordForm, ContactForm, SiteForm } from "@/components/admin-forms";

export const dynamic = "force-dynamic";

type SearchParams = { searchParams: Promise<{ tab?: string }> };

const TABS = [
  { id: "contact", label: "Contact Settings", icon: <PhoneCall className="h-3.5 w-3.5" /> },
  { id: "site", label: "Site Settings", icon: <Globe2 className="h-3.5 w-3.5" /> },
  { id: "ai", label: "AI Engine", icon: <Bot className="h-3.5 w-3.5" /> },
  { id: "account", label: "Admin Account", icon: <KeyRound className="h-3.5 w-3.5" /> },
];

export default async function AdminSettingsPage({ searchParams }: SearchParams) {
  const admin = await getAdminOrNull();
  if (!isSuperAdmin(admin)) redirect("/admin/login");
  const { tab } = await searchParams;
  const active = TABS.some((t) => t.id === tab) ? tab! : "contact";

  const [contact, site, ai] = await Promise.all([getContact(), getSite(), getAiSettings()]);

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Settings" subtitle="Control what the public site shows and how the platform behaves" />

      <div className="mb-6 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={`/admin/settings?tab=${t.id}`}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
              active === t.id ? "border-violet-400/50 bg-violet-400/10 text-violet-200" : "border-white/10 text-zinc-400 hover:bg-white/5"
            }`}
          >
            {t.icon}
            {t.label}
          </Link>
        ))}
      </div>

      {active === "contact" ? (
        <Card className="p-7">
          <h2 className="mb-1 text-sm font-semibold uppercase tracking-wider text-zinc-500">Contact Settings</h2>
          <p className="mb-5 text-xs text-zinc-600">
            Shown on the contact page, footer, support sections and pricing page. Empty fields are hidden on the
            frontend.
          </p>
          <ContactForm contact={contact as unknown as Record<string, string>} />
        </Card>
      ) : null}

      {active === "site" ? (
        <Card className="p-7">
          <h2 className="mb-5 text-sm font-semibold uppercase tracking-wider text-zinc-500">Site Settings</h2>
          <SiteForm site={site as unknown as Record<string, string>} />
        </Card>
      ) : null}

      {active === "ai" ? (
        <Card className="p-7">
          <h2 className="mb-5 text-sm font-semibold uppercase tracking-wider text-zinc-500">AI Engine Controls</h2>
          <AiForm ai={ai} />
          <p className="mt-4 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-xs leading-relaxed text-zinc-500">
            The Gemini API key is configured as a server-only environment variable (<span className="font-mono">GEMINI_API_KEY</span>)
            and is never exposed to the browser. When unset, deterministic audits keep working and AI features are
            marked as &ldquo;not configured&rdquo; — never faked.
          </p>
        </Card>
      ) : null}

      {active === "account" ? (
        <div className="space-y-6">
          <Card className="p-7">
            <h2 className="mb-5 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-zinc-500">
              <Mail className="h-4 w-4" /> Change Admin Email
            </h2>
            <ChangeEmailForm currentEmail={admin.email} />
          </Card>
          <Card className="p-7">
            <h2 className="mb-5 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-zinc-500">
              <KeyRound className="h-4 w-4" /> Change Admin Password
            </h2>
            <ChangePasswordForm />
          </Card>
        </div>
      ) : null}
    </div>
  );
}
