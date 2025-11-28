# Watchlist

A premium, server-first CRUD watchlist for anime, movies, TV, YouTube, and games. Built with Next.js App Router, Tailwind + shadcn/ui, Drizzle + Postgres, Zod validation, and server actions.

## Tech Stack
- Next.js 16 (App Router, TypeScript, server components-first)
- Tailwind CSS 3 + shadcn/ui primitives (Radix) + Lucide icons + Framer Motion + sonner toasts
- Drizzle ORM + drizzle-kit migrations, PostgreSQL (Neon for prod)
- Validation via Zod; mutations via Next.js Server Actions (no client state as source of truth)

## Architecture Notes
- Server-rendered pages; DB is source of truth. UI refreshes by `revalidatePath("/")` after mutations.
- No separate REST/GraphQL layer—create/update/delete are server actions with strict Zod parsing.
- Minimal client state: only for form pending state, toasts, and the placeholder command palette (⌘/Ctrl + K).
- Styling uses dark neutral base with indigo/violet accents, glass cards, and subtle motion on cards.

## Getting Started (Local)
1) Install deps
```bash
npm install
```
2) Set env
```bash
cp .env.example .env.local
# Edit DATABASE_URL to point to your Postgres (local or Docker)
```
Sample Docker command:
```bash
docker run --name watchlist-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=watchlist -p 5432:5432 -d postgres:16
```
3) Push schema & inspect
```bash
npm run db:push         # create tables/enums
npm run db:studio       # optional Drizzle Studio UI
```
If you want Google auth:
- Create OAuth credentials (Web) in Google Cloud console.
- Add authorized redirect: `http://localhost:3000/api/auth/callback/google`
- Put `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `NEXTAUTH_SECRET` in `.env.local`.

4) Seed sample data
```bash
npm run db:seed
```
5) Dev server
```bash
npm run dev
# open http://localhost:3000
```

## Scripts
- `npm run dev` – start Next.js dev server
- `npm run build` / `start` – production build & run
- `npm run lint` – ESLint
- `npm run test` – Vitest unit tests (validation schemas)
- `npm run db:push` – apply schema to DB
- `npm run db:studio` – Drizzle Studio
- `npm run db:seed` – seed sample watchlist rows

## Features & Acceptance Criteria
- Create items with title/type/status/rating/tags/notes; inline validation via Zod.
- List items in reverse chronological order with glassy cards, badges, subtle motion, responsive layout.
- Edit items in a dialog; delete with immediate feedback.
- Filters for type/status + title search (URL search params).
- Toast feedback on create/update/delete; server actions revalidate the list.
- Dark premium theme with indigo/violet accents, rounded corners, focus states, hover lift.
- Placeholder command palette (⌘/Ctrl + K or button) ready for future shortcuts.
- Google OAuth sign-in with session-backed data separation (items scoped to the signed-in user).

## Manual E2E Flow (MVP)
1) Add an item (e.g., “Spirited Away”) with status/rating/tags/notes.  
2) Confirm it appears at the top of the list.  
3) Edit via the “pencil” dialog; save and confirm the card updates.  
4) Delete via the trash icon; the card disappears.  
5) Filter by type/status and search by title—list updates accordingly.

## Deployment (Vercel + Neon)
1) Create a Neon project and database; copy the connection string.
2) In Vercel project settings, add `DATABASE_URL` (Neon connection string).
3) Add `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `NEXTAUTH_SECRET` env vars.
3) Set the build command to `npm run build` (defaults are fine).
4) Run `npm run db:push` once against the Neon connection to provision tables/enums.
5) Deploy. Server actions run on Vercel’s serverless runtime; secrets stay server-side.

## Known Limitations / Next Steps
- No auth/multi-user yet (ideal future: Auth.js/NextAuth).
- Command palette is a stub (no real shortcuts or quick-add yet).
- No TMDB/YT enrichment or import/export.
- No keyboard shortcuts beyond ⌘/Ctrl + K.

## Why This Stack
- **Server Actions + Drizzle**: keeps data-layer type-safe and colocated with UI, no extra API boilerplate.
- **Zod**: strict parsing for every mutation path, preventing invalid rows.
- **Tailwind + shadcn/ui**: fast iteration with consistent primitives and accessible Radix under the hood.
- **Neon + Vercel**: fast Postgres + serverless pairing with minimal ops.
