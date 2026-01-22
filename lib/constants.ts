export const ITEM_TYPES = ["anime", "movie", "tv", "game", "book"] as const;
export const STATUSES = [
  "planned",
  "watching",
  "paused",
  "completed",
  "dropped",
] as const;

export type ItemType = (typeof ITEM_TYPES)[number];
export type ItemStatus = (typeof STATUSES)[number];
