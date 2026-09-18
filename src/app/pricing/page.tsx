import type { Metadata } from "next";
import { getContact, getPricing, getSite } from "@/lib/settings";
import { Navbar, Footer, PricingSection } from "@/components/marketing";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pricing — UpRankly",
  description: "UpRankly plans: Monthly, 6 Months, Yearly and Lifetime. Honest manual billing with admin-verified payments.",
};

export default async function PricingPage() {
  const [site, contact, pricing] = await Promise.all([getSite(), getContact(), getPricing()]);
  return (
    <div className="uprankly-bg min-h-screen">
      <Navbar siteName={site.siteName} />
      <main className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="mb-14 text-center">
          <h1 className="font-display text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Plans that grow with you
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm text-zinc-500">
            Four plans, zero tricks. Pay via UPI, get verified, and your subscription countdown starts the moment an
            admin approves. Lifetime never expires.
          </p>
        </div>
        <PricingSection pricing={pricing} />
        <div className="mx-auto mt-12 max-w-3xl rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <h2 className="text-sm font-semibold text-white">How verification works</h2>
          <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm text-zinc-400">
            <li>Choose a plan and pay via UPI using the details shown at checkout.</li>
            <li>Submit your transaction reference (UTR) in your dashboard.</li>
            <li>An admin verifies and approves — your subscription activates with a live countdown.</li>
            <li>If anything looks off, you&rsquo;re notified with the reason. No silent failures.</li>
          </ol>
        </div>
      </main>
      <Footer site={site} contact={contact} />
    </div>
  );
}
