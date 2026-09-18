import type { Metadata } from "next";
import { getContact, getSite } from "@/lib/settings";
import { Navbar, Footer, ContactSection } from "@/components/marketing";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Contact — UpRankly",
  description: "Get in touch with the UpRankly team.",
};

export default async function ContactPage() {
  const [site, contact] = await Promise.all([getSite(), getContact()]);
  return (
    <div className="uprankly-bg min-h-screen">
      <Navbar siteName={site.siteName} />
      <main className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="mb-12">
          <h1 className="font-display text-4xl font-bold tracking-tight text-white sm:text-5xl">Contact us</h1>
          <p className="mt-4 max-w-xl text-sm text-zinc-500">
            Questions about plans, onboarding or integrations — we&rsquo;re here.
          </p>
        </div>
        <ContactSection contact={contact} />
      </main>
      <Footer site={site} contact={contact} />
    </div>
  );
}
