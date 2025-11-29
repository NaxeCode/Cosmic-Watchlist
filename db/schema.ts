import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export const itemType = pgEnum("item_type", [
  "anime",
  "movie",
  "tv",
  "game",
]);
export const itemStatus = pgEnum("item_status", [
  "planned",
  "watching",
  "paused",
  "completed",
  "dropped",
]);
export const eventStatus = pgEnum("event_status", ["open", "done", "archived"]);

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("email_verified", { withTimezone: true }),
  image: text("image"),
  publicHandle: text("public_handle").unique(),
  publicEnabled: boolean("public_enabled").notNull().default(false),
  admin: boolean("admin").notNull().default(false),
});

export const accounts = pgTable(
  "accounts",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<"oauth" | "email" | "oidc">().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => ({
    compoundKey: primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
  }),
);

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { withTimezone: true }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { withTimezone: true }).notNull(),
  },
  (vt) => ({
    compositePk: primaryKey({ columns: [vt.identifier, vt.token] }),
  }),
);

export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  payload: jsonb("payload").$type<Record<string, unknown>>().default({}).notNull(),
  userId: text("user_id")
    .references(() => users.id, { onDelete: "set null" }),
  userAgent: text("user_agent"),
  status: eventStatus("status").notNull().default("open"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const items = pgTable("items", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 256 }).notNull(),
  type: itemType("type").notNull().default("movie"),
  status: itemStatus("status").notNull().default("planned"),
  rating: integer("rating"), // 0..10, nullable
  tags: text("tags"),
  notes: text("notes"),
  releaseYear: integer("release_year"),
  runtimeMinutes: integer("runtime_minutes"),
  posterUrl: text("poster_url"),
  synopsis: text("synopsis"),
  cast: text("cast"),
  genres: text("genres"),
  studios: text("studios"),
  imdbId: varchar("imdb_id", { length: 32 }),
  tmdbId: integer("tmdb_id"),
  metadataSource: varchar("metadata_source", { length: 24 }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});
