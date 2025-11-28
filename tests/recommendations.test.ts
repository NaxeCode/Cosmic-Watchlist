import { afterEach, describe, expect, it, vi } from "vitest";

import { buildRecommendationsFromItems } from "../lib/recommendations";

vi.mock("../lib/metadata", () => ({
  fetchMetadata: vi.fn(async (title: string) => {
    if (title === "Seed Without TMDB") return { source: "tmdb", tmdbId: 999 };
    return { source: "tmdb", tmdbId: 123 };
  }),
  fetchSimilarTitles: vi.fn(async ({ title }: { title: string }) => {
    return [
      { title: `${title} 2`, overview: "Sequel", posterUrl: "p2.jpg", year: 2024, tmdbId: 2 },
      { title: `${title} 3`, overview: "Third", posterUrl: "p3.jpg", year: 2025, tmdbId: 3 },
    ];
  }),
}));

const baseItem = {
  id: 1,
  title: "Seed",
  type: "movie",
  status: "completed",
  rating: 9,
  tags: "action",
  genres: "action",
  notes: null,
  synopsis: null,
  posterUrl: null,
  releaseYear: 2020,
  runtimeMinutes: 120,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("buildRecommendationsFromItems", () => {
  afterEach(() => {
    vi.resetModules();
  });

  it("returns empty when no qualifying seeds", async () => {
    const recs = await buildRecommendationsFromItems([
      { ...baseItem, status: "planned", rating: 5 },
    ] as any);
    expect(recs).toEqual([]);
  });

  it("builds TMDB recommendations using similar titles", async () => {
    process.env.TMDB_API_KEY = "test";
    const recs = await buildRecommendationsFromItems([baseItem] as any);
    expect(recs.length).toBeGreaterThan(0);
    expect(recs[0]).toMatchObject({
      title: "Seed 2",
      reason: expect.stringContaining("Because you watched Seed"),
    });
  });

  it("deduplicates and caps at nine results", async () => {
    process.env.TMDB_API_KEY = "test";
    const noisyFetch = vi.mocked((await import("../lib/metadata")).fetchSimilarTitles);
    noisyFetch.mockResolvedValueOnce(
      Array.from({ length: 12 }, (_, i) => ({
        title: `Seed ${i}`,
        overview: "x",
        posterUrl: "p.jpg",
        year: 2024,
        tmdbId: i,
      })),
    );

    const recs = await buildRecommendationsFromItems([baseItem] as any);
    expect(recs.length).toBe(9);
    const unique = new Set(recs.map((r) => r.title));
    expect(unique.size).toBe(recs.length);
  });

  it("falls back to planned/backlog recommendations when TMDB key is missing", async () => {
    delete process.env.TMDB_API_KEY;
    const recs = await buildRecommendationsFromItems([
      baseItem,
      { ...baseItem, id: 2, title: "Planned Item", status: "planned", tags: "action" },
    ] as any);
    expect(recs[0]).toMatchObject({
      title: "Planned Item",
      reason: expect.stringContaining("tag"),
    });
  });

  it("returns backlog reason when no tag data exists", async () => {
    delete process.env.TMDB_API_KEY;
    const recs = await buildRecommendationsFromItems([
      { ...baseItem, id: 3, title: "Backlog", status: "planned", tags: "", genres: "" },
    ] as any);
    expect(recs[0].reason).toBe("From your backlog");
  });

  it("skips similars that already exist in list", async () => {
    process.env.TMDB_API_KEY = "tmdb";
    const similar = vi.mocked((await import("../lib/metadata")).fetchSimilarTitles);
    similar.mockResolvedValueOnce([{ title: "Seed", tmdbId: 1 } as any]); // duplicate title
    const recs = await buildRecommendationsFromItems([baseItem] as any);
    expect(recs).toHaveLength(0);
  });
});
