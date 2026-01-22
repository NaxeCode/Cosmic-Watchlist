import { pgTable, foreignKey, text, timestamp, unique, boolean, jsonb, serial, varchar, integer, primaryKey, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const eventStatus = pgEnum("event_status", ['open', 'done', 'archived'])
export const itemStatus = pgEnum("item_status", ['planned', 'watching', 'paused', 'completed', 'dropped'])
export const itemType = pgEnum("item_type", ['anime', 'movie', 'tv', 'game', 'book'])


export const sessions = pgTable("sessions", {
	sessionToken: text("session_token").primaryKey().notNull(),
	userId: text("user_id").notNull(),
	expires: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "sessions_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const users = pgTable("users", {
	id: text().primaryKey().notNull(),
	name: text(),
	email: text().notNull(),
	emailVerified: timestamp("email_verified", { withTimezone: true, mode: 'string' }),
	image: text(),
	publicHandle: text("public_handle"),
	publicEnabled: boolean("public_enabled").default(false).notNull(),
	admin: boolean().default(false).notNull(),
	preferences: jsonb().default({}).notNull(),
}, (table) => [
	unique("users_email_unique").on(table.email),
	unique("users_public_handle_unique").on(table.publicHandle),
]);

export const items = pgTable("items", {
	id: serial().primaryKey().notNull(),
	title: varchar({ length: 256 }).notNull(),
	type: itemType().default('movie').notNull(),
	status: itemStatus().default('planned').notNull(),
	rating: integer(),
	tags: text(),
	notes: text(),
	userId: text("user_id"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	releaseYear: integer("release_year"),
	runtimeMinutes: integer("runtime_minutes"),
	posterUrl: text("poster_url"),
	synopsis: text(),
	cast: text(),
	genres: text(),
	studios: text(),
	imdbId: varchar("imdb_id", { length: 32 }),
	tmdbId: integer("tmdb_id"),
	metadataSource: varchar("metadata_source", { length: 24 }),
	completedAt: timestamp("completed_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "items_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const events = pgTable("events", {
	id: serial().primaryKey().notNull(),
	name: varchar({ length: 128 }).notNull(),
	payload: jsonb().default({}).notNull(),
	userId: text("user_id"),
	userAgent: text("user_agent"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	status: eventStatus().default('open').notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "events_user_id_users_id_fk"
		}).onDelete("set null"),
]);

export const verificationTokens = pgTable("verification_tokens", {
	identifier: text().notNull(),
	token: text().notNull(),
	expires: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
}, (table) => [
	primaryKey({ columns: [table.identifier, table.token], name: "verification_tokens_identifier_token_pk"}),
]);

export const accounts = pgTable("accounts", {
	userId: text("user_id").notNull(),
	type: text().notNull(),
	provider: text().notNull(),
	providerAccountId: text("provider_account_id").notNull(),
	refreshToken: text("refresh_token"),
	accessToken: text("access_token"),
	expiresAt: integer("expires_at"),
	tokenType: text("token_type"),
	scope: text(),
	idToken: text("id_token"),
	sessionState: text("session_state"),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "accounts_user_id_users_id_fk"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.provider, table.providerAccountId], name: "accounts_provider_provider_account_id_pk"}),
]);
