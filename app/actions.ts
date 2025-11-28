"use server";

import { revalidatePath } from "next/cache";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
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
import { fetchMetadata, metadataToUpdate } from "@/lib/metadata";

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

function resolveCompletedAt(
  previousStatus: string | undefined,
  nextStatus: string,
  previousCompletedAt?: Date | null,
) {
  if (nextStatus === "completed") return previousCompletedAt ?? new Date();
  if (previousStatus === "completed" && nextStatus !== "completed") return null;
  return previousCompletedAt ?? null;
}

async function enrichItemRecord(id: number, title: string, type: string) {
  const meta = await fetchMetadata(title, type);
  if (!meta) return;
  const update = metadataToUpdate(meta);
  if (!Object.keys(update).length) return;
  try {
    await db.update(items).set(update as any).where(eq(items.id, id));
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[metadata] failed to persist metadata", error);
    }
  }
}

function parseDate(value?: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
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
    const [created] = await db
      .insert(items)
      .values({
        title: payload.title,
        type: payload.type,
        status: payload.status,
        rating: payload.rating ?? null,
        tags: payload.tags ?? null,
        notes: payload.notes ?? null,
        completedAt: resolveCompletedAt(undefined, payload.status),
        userId,
      })
      .returning({ id: items.id });
    if (created?.id) {
      await enrichItemRecord(created.id, payload.title, payload.type);
    }
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
    const existing = await db.query.items.findFirst({
      where: and(eq(items.id, payload.id), eq(items.userId, userId)),
    });
    if (!existing) {
      return { error: "Item not found." };
    }

    const completedAt = resolveCompletedAt(existing.status, payload.status, existing.completedAt);

    await db
      .update(items)
      .set({
        title: payload.title,
        type: payload.type,
        status: payload.status,
        rating: payload.rating ?? null,
        tags: payload.tags ?? null,
        notes: payload.notes ?? null,
        completedAt,
        updatedAt: new Date(),
      })
      .where(and(eq(items.id, payload.id), eq(items.userId, userId)));

    const needsMetadata =
      existing.title.trim().toLowerCase() !== payload.title.trim().toLowerCase() ||
      existing.type !== payload.type ||
      !existing.posterUrl ||
      !existing.synopsis ||
      existing.runtimeMinutes === null ||
      existing.runtimeMinutes === undefined;

    if (needsMetadata) {
      await enrichItemRecord(payload.id, payload.title, payload.type);
    }

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
  const rows = parsed.slice(0, 300).map((row) => {
    const completedAt = parseDate(row.watchedDate);
    const yearNumeric = row.year ? Number(row.year) : undefined;
    const releaseYear =
      yearNumeric !== undefined && Number.isFinite(yearNumeric) ? Math.trunc(yearNumeric) : null;
    const status = completedAt ? ("completed" as const) : ("planned" as const);

    return {
      title: row.title,
      type: "movie" as const,
      status,
      rating: row.rating ?? null,
      tags: row.tags ?? null,
      notes: row.notes ?? null,
      releaseYear,
      completedAt,
      userId,
    };
  });

  try {
    const inserted = await db
      .insert(items)
      .values(rows)
      .returning({ id: items.id, title: items.title, type: items.type });

    const toEnrich = inserted.slice(0, 20);
    for (const row of toEnrich) {
      await enrichItemRecord(row.id, row.title, row.type);
    }

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
    const completedAtUpdate =
      status === "completed"
        ? (sql`coalesce("items"."completed_at", now())` as any)
        : null;

    await db
      .update(items)
      .set({ status, completedAt: completedAtUpdate, updatedAt: new Date() })
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

export async function aiCategorizeAction(
  limit = 40,
  ids?: number[],
): Promise<AiCategorizeResult> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { error: "Please sign in first." };
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { error: "OPENAI_API_KEY is not set." };

  const whereBase = eq(items.userId, userId);
  const itemsToProcess = ids?.length
    ? await db.query.items.findMany({
        where: and(whereBase, inArray(items.id, ids)),
        orderBy: [desc(items.createdAt)],
        limit,
      })
    : await db.query.items.findMany({
        where: whereBase,
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
          {
            role: "system",
            content:
              "You are a terse JSON-only genre tagging assistant. Respond with machine-readable JSON only.",
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `
Given entries, output only JSON with shape: {"results":[{"id":<number>,"genres":[<1-3 short genre strings>]}]}.
Allowed genres: broad film/TV/anime/game categories (e.g., horror, sci-fi, romance, fantasy, thriller, drama, comedy, action, adventure, mystery, documentary, family, sports). No explanations, no code fences.

Input:
${JSON.stringify(payload, null, 2)}
`,
              },
            ],
          },
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

    const parsed = safeParseArray(content);
    if (!parsed) {
      if (process.env.NODE_ENV === "development") {
        console.debug("[ai-categorize] raw content:", content);
      }
      return { error: `Failed to parse AI response: ${content.slice(0, 400)}` };
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
      await db.update(items).set({ tags: merged } as any).where(eq(items.id, id));
    }

    revalidatePath("/");
    return { success: `AI categorized ${updates.length} item(s).` };
  } catch (err) {
    return { error: (err as Error).message || "Failed to run AI categorize." };
  }
}

function safeParseArray(content: string): { id: number; genres: string[] }[] | null {
  const tryParse = (text: string) => {
    try {
      const value = JSON.parse(text);
      if (Array.isArray(value)) return value;
      if (value && typeof value === "object") {
        // support { results: [...] } or { data: [...] }
        if (Array.isArray((value as any).results)) return (value as any).results;
        if (Array.isArray((value as any).data)) return (value as any).data;
        // support map of id -> genres
        const entries = Object.entries(value as Record<string, unknown>);
        if (entries.length && entries.every(([, v]) => Array.isArray(v))) {
          return entries.map(([k, v]) => ({
            id: Number(k),
            genres: (v as unknown[]).map((g) => String(g)),
          }));
        }
      }
      return null;
    } catch {
      return null;
    }
  };

  // direct parse
  const direct = tryParse(content.trim());
  if (direct) return direct;

  // strip code fences
  const fenceMatch = content.match(/```(?:json)?([\s\S]*?)```/i);
  if (fenceMatch) {
    const fenced = tryParse(fenceMatch[1].trim());
    if (fenced) return fenced;
  }

  // find first [ ... ] block
  const start = content.indexOf("[");
  const end = content.lastIndexOf("]");
  if (start !== -1 && end !== -1 && end > start) {
    const slice = content.slice(start, end + 1);
    const sliced = tryParse(slice);
    if (sliced) return sliced;
  }

  // try replacing single quotes (sometimes models return them)
  const singleToDouble = content.replace(/'/g, '"');
  const converted = tryParse(singleToDouble);
  if (converted) return converted;

  // regex fallback to extract id/genres pairs from messy text
  const matches = [...content.matchAll(/"id"\s*:\s*(\d+)[^[]*\[\s*([^\]]*?)\s*\]/g)];
  if (matches.length) {
    const result = matches.map((m) => {
      const id = Number(m[1]);
      const genres = m[2]
        .split(",")
        .map((g) => g.replace(/["']/g, "").trim())
        .filter(Boolean);
      return { id, genres };
    });
    if (result.length) return result;
  }

  return null;
}
