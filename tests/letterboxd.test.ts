import { describe, expect, it } from "vitest";
import { parseLetterboxdCsv } from "../lib/letterboxd";

describe("parseLetterboxdCsv", () => {
  it("parses CSV with headers and converts ratings + year", () => {
    const csv = [
      'Name,Year,Rating,Tags,WatchedDate,Notes',
      'Spirited Away,2001,4.5,"classic,ghibli",2024-05-01,"Great!"',
    ].join("\n");

    const [row] = parseLetterboxdCsv(csv);
    expect(row.title).toBe("Spirited Away");
    expect(row.rating).toBe(9); // converts 0-5 scale to 0-10
    expect(row.year).toBe("2001");
    expect(row.tags).toBe("classic,ghibli");
    expect(row.watchedDate).toBe("2024-05-01");
    expect(row.notes).toBe("Great!");
  });

  it("handles semicolon delimiter and missing optional fields", () => {
    const csv = [
      "Name;Year;Rating;Tags",
      "Inception;2010;10;mindbender",
    ].join("\n");

    const [row] = parseLetterboxdCsv(csv);
    expect(row.title).toBe("Inception");
    expect(row.rating).toBe(10);
    expect(row.tags).toBe("mindbender");
    expect(row.notes).toBeUndefined();
  });

  it("falls back when headers are absent", () => {
    const csv = ["1;The Matrix;1999;5"].join("\n");
    const [row] = parseLetterboxdCsv(csv);
    expect(row.title).toBe("The Matrix");
    expect(row.rating).toBe(10);
    expect(row.year).toBe("1999");
  });

  it("ignores zero/invalid ratings and still maps tags/notes", () => {
    const csv = ['Title,Rating,Tag,Review', 'No Rating,0,tagged,"note here"'].join("\n");
    const [row] = parseLetterboxdCsv(csv);
    expect(row).not.toHaveProperty("rating");
    expect(row.tags).toBe("tagged");
    expect(row.notes).toBe("note here");
  });

  it("converts 10-point ratings and caps above 10", () => {
    const csv = ["Film Title,Rating10,Year", "Alt Column,11,2015"].join("\n");
    const [row] = parseLetterboxdCsv(csv);
    expect(row.rating).toBe(10);
    expect(row.year).toBe("2015");
    expect(row.title).toBe("Alt Column");
  });

  it("uses Film Title fallback when Name is missing", () => {
    const csv = ["Film Title,Rating", "Hidden Title,4"].join("\n");
    const [row] = parseLetterboxdCsv(csv);
    expect(row.title).toBe("Hidden Title");
    expect(row.rating).toBe(8);
  });

  it("supports lowercase rating column", () => {
    const csv = ["Title,rating", "Lowercase,3"].join("\n");
    const [row] = parseLetterboxdCsv(csv);
    expect(row.rating).toBe(6);
  });
});
