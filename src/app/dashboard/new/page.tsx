import { redirect } from "next/navigation";
import { getUserOrNull } from "@/lib/auth";
import { Card, PageHeader } from "@/components/ui";
import { OnboardingForm } from "@/components/user-forms";

export const dynamic = "force-dynamic";

export default async function NewProjectPage() {
  const user = await getUserOrNull();
  if (!user) redirect("/auth");

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Add your website"
        subtitle="Tell UpRankly about your business so the AI can build a strategy that actually fits."
      />
      <Card className="p-7">
        <OnboardingForm />
      </Card>
    </div>
  );
}
