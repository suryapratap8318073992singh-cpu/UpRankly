import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { projects, seoDataVersions, seoMeta, seoTasks } from "@/db/schema";
import { ok, fail, zodFail } from "@/lib/api";
import { getUserOrNull } from "@/lib/auth";
import { logActivity } from "@/lib/settings";

const schema = z.object({
  taskId: z.string().uuid(),
  status: z.enum(["suggested", "approved", "in_progress", "completed", "rejected"]),
});

type Params = { params: Promise<{ id: string }> };

/**
 * Task review workflow. Approving a metadata "suggestedMeta" task stages the
 * metadata into seo_meta (versioned), which the one-line script can then
 * apply while the subscription is active. Nothing is auto-applied.
 */
export async function PATCH(req: Request, { params }: Params) {
  const user = await getUserOrNull();
  if (!user) return fail(401, "UNAUTHORIZED", "Please sign in first.");
  const { id } = await params;

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return zodFail(parsed);
  const { taskId, status } = parsed.data;

  const [project] = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  if (!project || project.userId !== user.id) return fail(404, "NOT_FOUND", "Project not found.");

  const [task] = await db
    .select()
    .from(seoTasks)
    .where(and(eq(seoTasks.id, taskId), eq(seoTasks.projectId, id)))
    .limit(1);
  if (!task) return fail(404, "NOT_FOUND", "Task not found.");

  const [updated] = await db
    .update(seoTasks)
    .set({
      status,
      updatedAt: new Date(),
      completedAt: status === "completed" ? new Date() : null,
    })
    .where(eq(seoTasks.id, taskId))
    .returning();

  // Stage approved metadata into the script payload (with version history).
  if (status === "approved" && task.type === "metadata" && task.payload?.suggestedMeta) {
    const suggested = task.payload.suggestedMeta as { title?: string | null; description?: string | null };
    const [existing] = await db.select().from(seoMeta).where(eq(seoMeta.projectId, id)).limit(1);
    const versionRows: (typeof seoDataVersions.$inferInsert)[] = [];
    if (suggested.title && existing?.title !== suggested.title) {
      versionRows.push({ projectId: id, field: "title", oldValue: existing?.title ?? null, newValue: suggested.title, changedBy: user.email });
    }
    if (suggested.description && existing?.description !== suggested.description) {
      versionRows.push({ projectId: id, field: "description", oldValue: existing?.description ?? null, newValue: suggested.description, changedBy: user.email });
    }
    await db
      .insert(seoMeta)
      .values({
        projectId: id,
        title: suggested.title ?? existing?.title ?? null,
        description: suggested.description ?? existing?.description ?? null,
        enabled: true,
        updatedBy: user.email,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: seoMeta.projectId,
        set: {
          title: suggested.title ?? existing?.title ?? null,
          description: suggested.description ?? existing?.description ?? null,
          enabled: true,
          updatedBy: user.email,
          updatedAt: new Date(),
        },
      });
    if (versionRows.length) await db.insert(seoDataVersions).values(versionRows);
    await logActivity({
      actorType: "user",
      actorId: user.id,
      userId: user.id,
      projectId: id,
      action: "seo_meta_approved",
      details: { title: suggested.title, description: suggested.description },
    });
  }

  await logActivity({
    actorType: "user",
    actorId: user.id,
    userId: user.id,
    projectId: id,
    action: status === "completed" ? "seo_action_completed" : "seo_action_updated",
    details: { taskId, status, title: task.title },
  });

  return ok({ task: updated });
}
