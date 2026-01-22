import { relations } from "drizzle-orm/relations";
import { users, sessions, items, events, accounts } from "./schema";

export const sessionsRelations = relations(sessions, ({one}) => ({
	user: one(users, {
		fields: [sessions.userId],
		references: [users.id]
	}),
}));

export const usersRelations = relations(users, ({many}) => ({
	sessions: many(sessions),
	items: many(items),
	events: many(events),
	accounts: many(accounts),
}));

export const itemsRelations = relations(items, ({one}) => ({
	user: one(users, {
		fields: [items.userId],
		references: [users.id]
	}),
}));

export const eventsRelations = relations(events, ({one}) => ({
	user: one(users, {
		fields: [events.userId],
		references: [users.id]
	}),
}));

export const accountsRelations = relations(accounts, ({one}) => ({
	user: one(users, {
		fields: [accounts.userId],
		references: [users.id]
	}),
}));