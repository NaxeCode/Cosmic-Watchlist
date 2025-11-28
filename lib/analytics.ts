type AnalyticsPayload = Record<string, unknown>;

export async function trackEvent(event: string, payload: AnalyticsPayload = {}) {
  // Placeholder for future analytics provider. Currently noop.
  if (process.env.NODE_ENV === "development") {
    console.debug(`[analytics] ${event}`, payload);
  }
}
