import { describe, expect, it } from "vitest";
import { metadataToUpdate } from "../lib/metadata";

describe("metadataToUpdate", () => {
  it("joins arrays and omits empty values", () => {
    const update = metadataToUpdate({
      source: "tmdb",
      cast: ["Actor A", "Actor B"],
      genres: ["Sci-Fi", "Action"],
      studios: ["Studio X"],
      runtimeMinutes: 123,
      synopsis: "Great movie",
      posterUrl: "https://example.com/poster.jpg",
      releaseYear: 2020,
      imdbId: "tt12345",
      tmdbId: 42,
    });

    expect(update).toMatchObject({
      cast: "Actor A, Actor B",
      genres: "Sci-Fi, Action",
      studios: "Studio X",
      runtimeMinutes: 123,
      synopsis: "Great movie",
      posterUrl: "https://example.com/poster.jpg",
      releaseYear: 2020,
      imdbId: "tt12345",
      tmdbId: 42,
      metadataSource: "tmdb",
    });
  });

  it("ignores nullish fields", () => {
    const update = metadataToUpdate({
      source: "omdb",
      cast: [],
      genres: [],
      studios: [],
      runtimeMinutes: null,
      synopsis: null,
      posterUrl: null,
      releaseYear: null,
    });

    expect(update).toEqual({ metadataSource: "omdb" });
  });
});
