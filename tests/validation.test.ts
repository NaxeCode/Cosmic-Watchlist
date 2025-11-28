import { describe, expect, it } from "vitest";
import { createItemSchema, updateItemSchema } from "../lib/validation";

describe("validation schemas", () => {
  it("accepts a valid create payload", () => {
    const data = createItemSchema.parse({
      title: "Spirited Away",
      type: "movie",
      status: "planned",
      rating: 8,
      tags: "classic,ghibli",
      notes: "Must rewatch with friends.",
    });
    expect(data.title).toBe("Spirited Away");
  });

  it("rejects out of range rating", () => {
    const result = createItemSchema.safeParse({
      title: "Test",
      type: "anime",
      status: "planned",
      rating: 12,
    });
    expect(result.success).toBe(false);
  });

  it("requires an id for update", () => {
    const result = updateItemSchema.safeParse({
      title: "Test",
      type: "anime",
      status: "planned",
      rating: 5,
    });
    expect(result.success).toBe(false);
  });
});
