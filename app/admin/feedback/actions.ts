"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { events, users } from "@/db/schema";

export type Status = "open" | "done" | "archived";

export async function updateEventStatusAction(formData: FormData) {
  const id = Number(formData.get("id"));
  const status = (formData.get("status") as Status | null) ?? "open";

  if (!Number.isInteger(id) || id <= 0) {
    return { error: "Invalid event id" };
  }
  if (!["open", "done", "archived"].includes(status)) {
    return { error: "Invalid status" };
  }

  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { error: "Not signed in" };

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { admin: true },
  });
  if (!user?.admin) return { error: "Not authorized" };

  await db.update(events).set({ status }).where(eq(events.id, id));
  revalidatePath("/admin/feedback");
  redirect(`/admin/feedback?status=${status}`);
}
