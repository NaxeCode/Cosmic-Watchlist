import { events } from "@/db/schema";

type AnalyticsPayload = Record<string, unknown>;

const MAX_PAYLOAD_CHARS = 5000;

export async function trackEvent(event: string, payload: AnalyticsPayload = {}) {
  const db = await getDb();
  if (!db) {
    if (process.env.NODE_ENV === "development") {
      console.debug(`[analytics] ${event}`, payload);
    }
    return;
  }

  try {
    const safeJson = safePayload(payload);
    const trimmed = trimPayload(safeJson);
    await db.insert(events).values({
      name: event,
      payload: trimmed,
      userId: typeof payload.userId === "string" ? payload.userId : null,
      userAgent: typeof payload.userAgent === "string" ? payload.userAgent : null,
      status: "open",
    });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[analytics] trackEvent failed", error);
    }
  }
}

let cachedDb: any | null = null;

async function getDb() {
  if (process.env.SKIP_ANALYTICS === "true") return null;
  if (!process.env.DATABASE_URL) return null;
  if (cachedDb) return cachedDb;
  try {
    const mod = await import("@/db");
    cachedDb = mod.db;
    return cachedDb;
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[analytics] failed to load db", error);
    }
    return null;
  }
}

function safePayload(payload: AnalyticsPayload) {
  try {
    return JSON.parse(JSON.stringify(payload ?? {})) as AnalyticsPayload;
  } catch {
    return {};
  }
}

function trimPayload(payload: AnalyticsPayload) {
  const json = JSON.stringify(payload);
  if (!json || json.length <= MAX_PAYLOAD_CHARS) return payload;
  // If payload is too large, keep a truncated message.
  return {
    truncated: true,
    snippet: json.slice(0, MAX_PAYLOAD_CHARS),
  };
}
