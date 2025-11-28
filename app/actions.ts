"use server";

import { revalidatePath } from "next/cache";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { items, users } from "@/db/schema";
import {
  createItemSchema,
  deleteItemSchema,
  updateItemSchema,
} from "@/lib/validation";
import { trackEvent } from "@/lib/analytics";
import { auth } from "@/auth";
import { parseLetterboxdCsv } from "@/lib/letterboxd";
import { STATUSES } from "@/lib/constants";
import { nanoid } from "nanoid";
import { tagsToArray } from "@/lib/utils";

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

export async function bulkUpdateStatusAction(
  _prevState: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { error: "Please sign in to bulk edit." };

  const idsRaw = (formData.get("ids") as string | null) ?? "";
  const status = (formData.get("status") as string | null)?.trim() as
    | (typeof STATUSES)[number]
    | undefined;

  const ids = idsRaw
    .split(",")
    .map((v) => Number(v))
    .filter((n) => Number.isInteger(n) && n > 0);

  if (!ids.length) return { error: "Select at least one item." };
  if (!status || !STATUSES.includes(status)) {
    return { error: "Choose a valid status." };
  }

  try {
    await db
      .update(items)
      .set({ status })
      .where(and(eq(items.userId, userId), inArray(items.id, ids)));

    revalidatePath("/");
    return { success: `Updated ${ids.length} item(s) to "${status}".` };
  } catch (err) {
    return { error: (err as Error).message || "Bulk update failed." };
  }
}

async function generateUniqueHandle() {
  let handle: string;
  // Try a few times to avoid collisions (very low probability with nanoid)
  for (let i = 0; i < 5; i++) {
    handle = nanoid(10);
    const existing = await db.query.users.findFirst({
      where: eq(users.publicHandle, handle),
      columns: { id: true },
    });
    if (!existing) break;
  }
  return handle!;
}

export async function enableSharingAction(): Promise<ActionState & { handle?: string }> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { error: "Please sign in to manage sharing." };

  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { publicHandle: true },
    });

    const handle = user?.publicHandle || (await generateUniqueHandle());
    await db
      .update(users)
      .set({ publicEnabled: true, publicHandle: handle })
      .where(eq(users.id, userId));

    revalidatePath("/");
    return { success: "Sharing enabled.", handle };
  } catch (err) {
    return { error: (err as Error).message || "Failed to enable sharing." };
  }
}

export async function disableSharingAction(): Promise<ActionState> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { error: "Please sign in to manage sharing." };

  try {
    await db
      .update(users)
      .set({ publicEnabled: false })
      .where(eq(users.id, userId));
    revalidatePath("/");
    return { success: "Sharing disabled." };
  } catch (err) {
    return { error: (err as Error).message || "Failed to disable sharing." };
  }
}

export async function regenerateShareHandleAction(): Promise<ActionState & { handle?: string }> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { error: "Please sign in to manage sharing." };

  try {
    const handle = await generateUniqueHandle();
    await db
      .update(users)
      .set({ publicEnabled: true, publicHandle: handle })
      .where(eq(users.id, userId));
    revalidatePath("/");
    return { success: "Share link regenerated.", handle };
  } catch (err) {
    return { error: (err as Error).message || "Failed to regenerate share link." };
  }
}

type AiCategorizeResult = {
  success?: string;
  error?: string;
};

export async function aiCategorizeAction(limit = 40): Promise<AiCategorizeResult> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { error: "Please sign in first." };
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { error: "OPENAI_API_KEY is not set." };

  const itemsToProcess = await db.query.items.findMany({
    where: eq(items.userId, userId),
    orderBy: [desc(items.createdAt)],
    limit,
  });

  if (!itemsToProcess.length) return { error: "No items to categorize." };

  const payload = itemsToProcess.map((item) => ({
    id: item.id,
    title: item.title,
    type: item.type,
    notes: item.notes ?? "",
    tags: item.tags ?? "",
  }));

  const prompt = `
You are a concise genre classifier. Given a list of entries, return a JSON array of objects with "id" and "genres" (1-3 short genre labels). Do not include explanations.
Allowed genres are free-form but keep to broad film/TV/anime/game categories (e.g., "horror", "sci-fi", "romance", "fantasy", "thriller", "drama", "comedy", "action", "adventure", "mystery", "documentary", "family", "sports").

Input:
${JSON.stringify(payload, null, 2)}

Output strictly as JSON (no code fences), e.g.:
[{"id":123,"genres":["horror","thriller"]}]
`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are a terse JSON-only genre tagging assistant." },
          { role: "user", content: prompt },
        ],
        temperature: 0.2,
        max_tokens: 400,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return { error: `OpenAI error: ${response.status} ${errText}` };
    }

    const data = (await response.json()) as any;
    const content: string | undefined = data?.choices?.[0]?.message?.content;
    if (!content) return { error: "No response from model." };

    let parsed: { id: number; genres: string[] }[];
    try {
      parsed = JSON.parse(content);
    } catch {
      return { error: "Failed to parse AI response." };
    }

    const updates = parsed
      .filter((row) => Number.isInteger(row.id) && Array.isArray(row.genres))
      .map((row) => ({
        id: row.id,
        genres: row.genres
          .map((g) => String(g).toLowerCase().trim())
          .filter(Boolean)
          .slice(0, 4),
      }));

    if (!updates.length) return { error: "No valid genres returned." };

    for (const { id, genres } of updates) {
      if (!genres.length) continue;
      const existing = itemsToProcess.find((i) => i.id === id);
      if (!existing) continue;
      const merged = Array.from(
        new Set([...tagsToArray(existing.tags), ...genres]),
      ).join(", ");
      await db.update(items).set({ tags: merged }).where(eq(items.id, id));
    }

    revalidatePath("/");
    return { success: `AI categorized ${updates.length} item(s).` };
  } catch (err) {
    return { error: (err as Error).message || "Failed to run AI categorize." };
  }
}
