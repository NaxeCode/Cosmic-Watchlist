# AGENTS.md

Cosmic Watchlist is a server-first Next.js 16 / React 19 app. It uses Auth.js v5 (Google, database sessions via the Drizzle adapter), Drizzle ORM on Postgres, and metadata enrichment from TMDB, OMDb, AniList, IGDB, Open Library, and Google Books (`lib/metadata.ts`). Mutations are Server Actions in `app/actions.ts` and `app/admin/feedback/actions.ts`, and the schema is in `db/schema.ts` with SQL migrations in `drizzle/`.

Setup: `npm install`, `cp .env.example .env.local`, `npm run db:push`, `npm run dev`. Checks: `npm test` (Vitest in `tests/`), `npm run lint`, `npm run build`.

## Code Review Rules

Focus on per-user isolation, the public share surface, and abuse limits on a free-tier deployment. Formatting and lint are left to CI.

### Always flag (P0/P1)

- **Missing ownership filter.** Every Server Action that reads or mutates `items` must call `auth()`, bail if there's no `session.user.id`, and filter on both item id and `eq(items.userId, userId)`. For bulk operations, filter with `inArray(items.id, ids)` together with the `userId` condition. Flag any update or delete keyed on id alone.
- **Admin checks.** Admin actions (`app/admin/feedback/*`) must re-check `users.admin` from the DB on every call, not trust a client-supplied flag. Flag new admin surfaces that skip this, and flag changes that grant `admin` outside the `ADMIN_EMAILS` allowlist in `auth.ts`.
- **Share page leaks.** `/share/[handle]` is public and must return `notFound()` unless `publicEnabled` is true. Flag it exposing user email, the internal `userId`, or private fields beyond what the page renders today. Disabling sharing or regenerating the handle must invalidate the old link immediately (`disableSharingAction`, `regenerateShareHandleAction`). Handles must stay unguessable.
- **Bypassed write quotas.** Every insert path, including `createItemAction`, `importLetterboxdAction`, and any new bulk or AI path, must call `assertItemWriteCapacity(userId, n)` with the real row count before inserting. Flag new insert paths that skip it, and flag large default increases in `lib/limits.ts`.
- **External query injection or SSRF.** `lib/metadata.ts` builds provider queries from user titles. Titles must stay `encodeURIComponent`-escaped in URLs. Flag unescaped interpolation into the IGDB Apicalypse body (`search "${title}"`) that could break out of the quoted string. Flag fetching arbitrary user-supplied URLs server-side, and adding hosts to `next.config.ts` `images.remotePatterns` without a need.
- **Secrets.** Provider keys (`TMDB_API_KEY`, `OMDB_API_KEY`, `IGDB_CLIENT_SECRET`, `OPENAI_API_KEY`) must never reach the client or logs. Only `NEXT_PUBLIC_GA_MEASUREMENT_ID` is public.

### Flag when relevant

- Zod validation (`lib/validation.ts`) skipped for Server Action or route input, or Letterboxd CSV import without row caps and parse error handling (`lib/letterboxd.ts`).
- Unauthenticated routes (`/api/metadata`, `/api/search`, `/api/feedback`, `/api/bug-report`) that get more expensive or write data without rate limiting or bounds.
- Mutations that don't `revalidatePath` the pages they affect.
- Schema changes without a matching `drizzle/*.sql` migration, and edits to already-applied migrations. Changes to Postgres enums (`item_type`, status) need an explicit migration.
- `/demo` code paths that write to the DB or require a session. The demo must stay read-only with seeded data.
- `dangerouslySetInnerHTML` outside `components/google-analytics.tsx`.

### Don't flag

- Raw `<img>` in item form previews, where `eslint-disable` is intentional for arbitrary provider URLs.
- Provider fallbacks returning `null` when a key is not configured.
- Styling, copy, and component structure.
