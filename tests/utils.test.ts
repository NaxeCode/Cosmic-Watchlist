import { describe, expect, it } from "vitest";
import { tagsToArray } from "../lib/utils";

describe("tagsToArray", () => {
  it("splits and trims comma-separated tags", () => {
    expect(tagsToArray(" horror, sci-fi ,thriller ")).toEqual(["horror", "sci-fi", "thriller"]);
  });

  it("returns empty array for empty or null input", () => {
    expect(tagsToArray("")).toEqual([]);
    expect(tagsToArray(null)).toEqual([]);
    expect(tagsToArray(undefined)).toEqual([]);
  });
});
