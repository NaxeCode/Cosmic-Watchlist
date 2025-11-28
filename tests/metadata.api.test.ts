import { describe, expect, it, vi } from "vitest";
import { GET } from "../app/api/metadata/route";

vi.mock("@/lib/metadata", () => ({
  fetchMetadata: vi.fn(async (title: string) => {
    if (!title) return null;
    return {
      source: "tmdb",
      posterUrl: "https://image.tmdb.org/t/p/w500/poster.jpg",
      releaseYear: 2024,
      runtimeMinutes: 120,
      synopsis: "A thrilling adventure.",
      cast: ["Actor One", "Actor Two"],
      genres: ["adventure"],
      studios: ["Studio A"],
      tmdbId: 123,
      imdbId: "tt123",
    };
  }),
}));

describe("GET /api/metadata", () => {
  it("returns metadata payload for valid title", async () => {
    const request = new Request("http://localhost/api/metadata?title=Test&type=movie");
    const res = await GET(request);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.metadata.posterUrl).toContain("image.tmdb.org");
    expect(json.metadata.releaseYear).toBe(2024);
  });

  it("returns 400 when title is missing", async () => {
    const request = new Request("http://localhost/api/metadata");
    const res = await GET(request);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.ok).toBe(false);
  });
});
