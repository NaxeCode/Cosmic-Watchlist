"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { items } from "@/db/schema";
import {
  createItemSchema,
  deleteItemSchema,
  updateItemSchema,
} from "@/lib/validation";
import { trackEvent } from "@/lib/analytics";
import { auth } from "@/auth";
import { parseLetterboxdCsv } from "@/lib/letterboxd";

type ActionState = {
  success?: string;
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

function buildFieldErrors(error: unknown) {
  if (error && typeof error === "object" && "flatten" in (error as any)) {
    const flat = (error as any).flatten?.();
    return flat?.fieldErrors;
  }
  return undefined;
}

export async function createItemAction(
  _prevState: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return { error: "Please sign in to add to your watchlist." };
  }

  const parsed = createItemSchema.safeParse({
    title: formData.get("title"),
    type: formData.get("type"),
    status: formData.get("status"),
    rating: formData.get("rating"),
    tags: formData.get("tags"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const payload = parsed.data;

  try {
    await db.insert(items).values({
      title: payload.title,
      type: payload.type,
      status: payload.status,
      rating: payload.rating ?? null,
      tags: payload.tags ?? null,
      notes: payload.notes ?? null,
      userId,
    });
    await trackEvent("item_created", { type: payload.type, status: payload.status });
    revalidatePath("/");
    return { success: "Added to your watchlist." };
  } catch (err) {
    return { error: (err as Error).message || "Failed to create item." };
  }
}

export async function updateItemAction(
  _prevState: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return { error: "Please sign in to update items." };
  }

  const parsed = updateItemSchema.safeParse({
    id: formData.get("id"),
    title: formData.get("title"),
    type: formData.get("type"),
    status: formData.get("status"),
    rating: formData.get("rating"),
    tags: formData.get("tags"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const payload = parsed.data;

  try {
    await db
      .update(items)
      .set({
        title: payload.title,
        type: payload.type,
        status: payload.status,
        rating: payload.rating ?? null,
        tags: payload.tags ?? null,
        notes: payload.notes ?? null,
        updatedAt: new Date(),
      })
      .where(and(eq(items.id, payload.id), eq(items.userId, userId)));

    await trackEvent("item_updated", { id: payload.id });
    revalidatePath("/");
    return { success: "Saved changes." };
  } catch (err) {
    return { error: (err as Error).message || "Failed to update item." };
  }
}

export async function deleteItemAction(
  _prevState: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return { error: "Please sign in to delete items." };
  }

  const parsed = deleteItemSchema.safeParse({
    id: formData.get("id"),
  });

  if (!parsed.success) {
    return {
      error: "Could not validate delete request.",
      fieldErrors: buildFieldErrors(parsed.error),
    };
  }

  const { id } = parsed.data;

  try {
    await db.delete(items).where(and(eq(items.id, id), eq(items.userId, userId)));
    await trackEvent("item_deleted", { id });
    revalidatePath("/");
    return { success: "Item removed." };
  } catch (err) {
    return { error: (err as Error).message || "Failed to delete item." };
  }
}

export async function importLetterboxdAction(
  _prevState: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { error: "Please sign in to import." };

  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return {
      error:
        "Please upload a CSV export from Letterboxd (no file detected). Accepted delimiters: comma, semicolon, tab.",
    };
  }

  const text = await file.text();
  const parsed = parseLetterboxdCsv(text);
  if (!parsed.length) {
    return {
      error:
        "No rows found in CSV. Make sure headers include Name/Title (and optional Year/Rating/Tags). If you used semicolons, ensure UTF-8 encoding and try re-exporting. We support CSV delimiters: comma, semicolon, tab.",
    };
  }

  // Limit bulk insert to avoid huge uploads.
  const rows = parsed.slice(0, 300).map((row) => ({
    title: row.title,
    type: "movie" as const,
    status: row.watchedDate ? ("completed" as const) : ("planned" as const),
    rating: row.rating ?? null,
    tags: row.tags ?? null,
    notes: row.notes ?? null,
    userId,
  }));

  try {
    await db.insert(items).values(rows);
    revalidatePath("/");
    return { success: `Imported ${rows.length} movies from Letterboxd.` };
  } catch (err) {
    return { error: (err as Error).message || "Failed to import Letterboxd data." };
  }
}
