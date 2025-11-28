import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchMetadata, fetchSimilarTitles } from "../lib/metadata";

describe("fetchMetadata", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("prefers TMDB when api key is set", async () => {
    process.env.TMDB_API_KEY = "tmdb-key";
    process.env.OMDB_API_KEY = "omdb-key";

    const tmdbResponse = {
      results: [{ id: 1, poster_path: "/poster.jpg", genre_ids: [12] }],
    };
    const tmdbDetails = {
      id: 1,
      runtime: 110,
      release_date: "2024-01-01",
      overview: "Great movie",
      credits: { cast: [{ name: "Actor One" }] },
      genres: [{ name: "Adventure" }],
      production_companies: [{ name: "Studio One" }],
      external_ids: { imdb_id: "tt123" },
      poster_path: "/poster.jpg",
    };

    const fetchMock = vi.fn()
      // search
      .mockResolvedValueOnce(okJson(tmdbResponse))
      // details
      .mockResolvedValueOnce(okJson(tmdbDetails));

    vi.stubGlobal("fetch", fetchMock as any);

    const meta = await fetchMetadata("Test Movie", "movie");
    expect(meta?.source).toBe("tmdb");
    expect(meta?.posterUrl).toContain("image.tmdb.org");
    expect(meta?.runtimeMinutes).toBe(110);
    expect(meta?.genres).toContain("Adventure");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("falls back to OMDb when TMDB not set", async () => {
    delete process.env.TMDB_API_KEY;
    process.env.OMDB_API_KEY = "omdb-key";

    const omdbPayload = {
      Response: "True",
      imdbID: "tt456",
      Poster: "poster.jpg",
      Runtime: "95 min",
      Year: "2020",
      Plot: "Plot",
      Actors: "A,B",
      Genre: "Drama",
      Production: "Studio X",
    };

    const fetchMock = vi.fn().mockResolvedValue(okJson(omdbPayload));
    vi.stubGlobal("fetch", fetchMock as any);

    const meta = await fetchMetadata("Fallback", "movie");
    expect(meta?.source).toBe("omdb");
    expect(meta?.runtimeMinutes).toBe(95);
    expect(meta?.genres).toContain("Drama");
    expect(meta?.studios).toContain("Studio X");
  });

  it("returns null when TMDB search has no results", async () => {
    process.env.TMDB_API_KEY = "tmdb-key";
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(okJson({ results: [] })); // search no results

    vi.stubGlobal("fetch", fetchMock as any);
    const meta = await fetchMetadata("Unknown", "movie");
    expect(meta).toBeNull();
  });

  it("returns null when fetch throws (tmdb) but stays quiet via safeJsonFetch", async () => {
    process.env.TMDB_API_KEY = "tmdb-key";
    process.env.NODE_ENV = "development";
    vi.stubGlobal("fetch", vi.fn(() => { throw new Error("boom"); }) as any);

    const meta = await fetchMetadata("Error", "movie");
    expect(meta).toBeNull();
  });

  it("returns null when omdb fetch fails silently", async () => {
    delete process.env.TMDB_API_KEY;
    process.env.OMDB_API_KEY = "omdb";
    vi.stubGlobal("fetch", vi.fn(() => { throw new Error("omdb boom"); }) as any);

    const meta = await fetchMetadata("Err", "movie");
    expect(meta).toBeNull();
  });

  it("fetchSimilarTitles uses search when tmdbId missing", async () => {
    process.env.TMDB_API_KEY = "tmdb";
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(okJson({ results: [{ id: 7 }] })) // search
      .mockResolvedValueOnce(
        okJson({
          results: [
            {
              name: "Show Name",
              overview: "desc",
              poster_path: "/path.jpg",
              first_air_date: "2022-03-01",
              id: 77,
            },
          ],
        }),
      );
    vi.stubGlobal("fetch", fetchMock as any);

    const results = await fetchSimilarTitles({ title: "My Show", type: "tv" });
    expect(results[0]).toMatchObject({
      title: "Show Name",
      posterUrl: expect.stringContaining("image.tmdb.org"),
      year: 2022,
    });
  });

  it("fetchSimilarTitles short-circuits with provided tmdbId", async () => {
    process.env.TMDB_API_KEY = "tmdb";
    const fetchMock = vi.fn().mockResolvedValue(
      okJson({
        results: [
          { title: "Direct Similar", overview: "x", poster_path: "/d.jpg", release_date: "2020-01-01", id: 5 },
        ],
      }),
    );
    vi.stubGlobal("fetch", fetchMock as any);

    const results = await fetchSimilarTitles({ title: "Seed", type: "movie", tmdbId: 10 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(results[0].title).toBe("Direct Similar");
  });

  it("fetchSimilarTitles returns empty when fetch fails", async () => {
    process.env.TMDB_API_KEY = "tmdb";
    vi.stubGlobal("fetch", vi.fn(() => { throw new Error("fail"); }) as any);
    const results = await fetchSimilarTitles({ title: "Seed", type: "movie", tmdbId: 10 });
    expect(results).toEqual([]);
  });

  it("fetchSimilarTitles returns empty when response is not ok", async () => {
    process.env.TMDB_API_KEY = "tmdb";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }) as any);
    const results = await fetchSimilarTitles({ title: "Seed", type: "game", tmdbId: 10 });
    expect(results).toEqual([]);
  });

  it("uses TV episode runtime and networks fallback", async () => {
    process.env.TMDB_API_KEY = "tmdb-key";
    const tmdbResponse = { results: [{ id: 2, genre_ids: [99, 5] }] };
    const tmdbDetails = {
      id: 2,
      episode_run_time: [45],
      first_air_date: "2023-01-01",
      overview: "Docu series",
      credits: { cast: [{ name: "Host" }] },
      genres: undefined,
      production_companies: undefined,
      networks: [{ name: "Net A" }],
      external_ids: { imdb_id: "tt999" },
      poster_path: "/tv.jpg",
    };

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(okJson(tmdbResponse))
      .mockResolvedValueOnce(okJson(tmdbDetails));
    vi.stubGlobal("fetch", fetchMock as any);

    const meta = await fetchMetadata("TV Doc", "tv");
    expect(meta?.runtimeMinutes).toBe(45);
    expect(meta?.genres).toEqual(["99", "5"]);
    expect(meta?.studios).toEqual(["Net A"]);
  });
});

function okJson(data: any) {
  return {
    ok: true,
    json: async () => data,
  };
}
