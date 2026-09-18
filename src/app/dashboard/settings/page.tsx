import { redirect } from "next/navigation";
import { LifeBuoy, UserRound } from "lucide-react";
import { getUserOrNull } from "@/lib/auth";
import { getContact } from "@/lib/settings";
import { Card, PageHeader, formatDateTime } from "@/components/ui";
import { ContactSection } from "@/components/marketing";

export const dynamic = "force-dynamic";

export default async function UserSettingsPage() {
  const user = await getUserOrNull();
  if (!user) redirect("/auth");
  const contact = await getContact();

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Settings & Support" subtitle="Your account details and how to reach us" />

      <Card className="mb-8 p-6">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5">
            <UserRound className="h-5 w-5 text-zinc-400" />
          </span>
          <div>
            <p className="text-sm font-medium text-white">{user.fullName ?? "Business Owner"}</p>
            <p className="text-xs text-zinc-500">{user.email}</p>
          </div>
        </div>
        <div className="mt-5 grid gap-3 text-xs text-zinc-500 sm:grid-cols-2">
          <p>Account created: <span className="text-zinc-300">{formatDateTime(user.createdAt)}</span></p>
          <p>Last login: <span className="text-zinc-300">{formatDateTime(user.lastLoginAt)}</span></p>
          <p>User ID: <span className="font-mono text-zinc-400">{user.id}</span></p>
        </div>
      </Card>

      <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-zinc-500">
        <LifeBuoy className="h-4 w-4" /> Support
      </h2>
      <Card className="p-6">
        <ContactSection contact={contact} />
      </Card>
    </div>
  );
}
