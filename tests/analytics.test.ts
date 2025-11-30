import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/db/schema", () => ({
  events: {},
}));

const mockValues = vi.fn(async () => undefined);
const mockInsert = vi.fn(() => ({ values: mockValues }));

vi.mock("@/db", () => ({
  db: {
    insert: mockInsert,
  },
}));

beforeEach(() => {
  vi.resetModules();
  mockValues.mockClear();
  mockInsert.mockClear();
  delete process.env.DATABASE_URL;
  process.env.SKIP_ANALYTICS = "true";
  process.env.NODE_ENV = "test";
});

describe("trackEvent", () => {
  it("logs in development", async () => {
    process.env.NODE_ENV = "development";
    process.env.DATABASE_URL = undefined;
    const { trackEvent } = await import("../lib/analytics");
    await trackEvent("test_event", { foo: "bar" });
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("is silent outside development", async () => {
    process.env.NODE_ENV = "production";
    process.env.DATABASE_URL = undefined;
    const { trackEvent } = await import("../lib/analytics");
    const debug = vi.spyOn(console, "debug").mockImplementation(() => {});
    await trackEvent("test_event");
    expect(debug).not.toHaveBeenCalled();
    debug.mockRestore();
  });

  it("persists when db available", async () => {
    process.env.NODE_ENV = "production";
    process.env.SKIP_ANALYTICS = "false";
    process.env.DATABASE_URL = "postgres://user:pass@localhost/db";
    const { trackEvent } = await import("../lib/analytics");
    await trackEvent("test_event", { foo: "bar" });
    expect(mockInsert).toHaveBeenCalled();
    expect(mockValues).toHaveBeenCalled();
  });
});
