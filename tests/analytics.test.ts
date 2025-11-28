import { describe, expect, it, vi } from "vitest";
import { trackEvent } from "../lib/analytics";

describe("trackEvent", () => {
  it("logs in development", async () => {
    process.env.NODE_ENV = "development";
    const debug = vi.spyOn(console, "debug").mockImplementation(() => {});
    await trackEvent("test_event", { foo: "bar" });
    expect(debug).toHaveBeenCalledWith("[analytics] test_event", { foo: "bar" });
    debug.mockRestore();
  });

  it("is silent outside development", async () => {
    process.env.NODE_ENV = "production";
    const debug = vi.spyOn(console, "debug").mockImplementation(() => {});
    await trackEvent("test_event");
    expect(debug).not.toHaveBeenCalled();
    debug.mockRestore();
  });
});
