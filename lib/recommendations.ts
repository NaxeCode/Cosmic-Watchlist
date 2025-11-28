import { fetchMetadata, fetchSimilarTitles } from "./metadata";
import type { items } from "@/db/schema";

type Item = typeof items.$inferSelect;

export type Recommendation = {
  title: string;
  overview?: string;
  posterUrl?: string;
  year?: number;
  reason: string;
  tmdbId?: number;
};

export async function buildRecommendationsFromItems(items: Item[]): Promise<Recommendation[]> {
  if (!items.length) return [];

  const hasTmdb = Boolean(process.env.TMDB_API_KEY);
  const sortedSeeds = items
    .filter((item) => item.status === "completed" || (item.rating ?? 0) >= 8)
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
    .slice(0, 5);

  if (!sortedSeeds.length) return [];

  if (!hasTmdb) {
    return fallbackRecommendations(items);
  }

  const seenTitles = new Set(items.map((i) => i.title.toLowerCase()));
  const recommendations: Recommendation[] = [];

  for (const seed of sortedSeeds) {
    if (recommendations.length >= 9) break;
    let tmdbId = seed.tmdbId ?? undefined;
    if (!tmdbId) {
      const meta = await fetchMetadata(seed.title, seed.type);
      if (meta?.tmdbId) tmdbId = meta.tmdbId ?? undefined;
    }

    const similars = await fetchSimilarTitles({
      title: seed.title,
      type: seed.type,
      tmdbId,
    });

    for (const match of similars) {
      if (!match.title) continue;
      const normalized = match.title.toLowerCase();
      if (seenTitles.has(normalized)) continue;
      seenTitles.add(normalized);

      recommendations.push({
        title: match.title,
        overview: match.overview,
        posterUrl: match.posterUrl,
        year: match.year,
        tmdbId: match.tmdbId,
        reason: `Because you watched ${seed.title}${seed.rating ? ` (${seed.rating}/10)` : ""}`,
      });

      if (recommendations.length >= 9) break;
    }
  }

  return recommendations;
}

function fallbackRecommendations(items: Item[]): Recommendation[] {
  const planned = items.filter((i) => i.status === "planned");
  if (!planned.length) return [];

  const tagCounts = new Map<string, number>();
  for (const item of items) {
    const tags = `${item.tags ?? ""},${item.genres ?? ""}`
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    for (const tag of tags) {
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    }
  }

  const topTag = Array.from(tagCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0];

  return planned.slice(0, 6).map((item) => ({
    title: item.title,
    overview: item.synopsis ?? item.notes ?? undefined,
    posterUrl: item.posterUrl ?? undefined,
    year: item.releaseYear ?? undefined,
    reason: topTag ? `Matches your frequent tag "${topTag}"` : "From your backlog",
  }));
}
