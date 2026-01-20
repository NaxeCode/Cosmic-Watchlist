# Cosmic Watchlist

A premium, server-first watchlist for anime, movies, TV, and games: fast CRUD, shareable filters, and smart stats that make your backlog feel intentional instead of endless.

Design note: this app uses `@stargazers-stella/cosmic-ui` for shared design DNA (token-first theming, Radix-based primitives, and the cosmic/glass visual language).

## Demo
- Live: [Open live demo](https://stargazers-cosmic-watchlist.vercel.app/?utm_source=github&utm_medium=readme&utm_campaign=career-portfolio-2026&utm_content=demo)

## Screenshots
Screens from the live demo.

![Landing hero](docs/screenshots/landing-header.png)
![Dashboard / collection](docs/screenshots/demo-your-collection.png)
![Stats + recommendations](docs/screenshots/demo-recommendations.png)
![Command center palette](docs/screenshots/demo-command-center-palette.png)
![Architecture diagram](docs/screenshots/architecture.png)

## Features
- Server-first CRUD with type-safe validation (Zod) and mutations (Next.js Server Actions).
- Filters/search via URL params (shareable, bookmarkable state).
- Smart stats: completion rate, runtime totals, activity heatmap, and breakdowns by genre/studio.
- Optional enrichment + recommendations (TMDB/OMDb) when API keys are provided.
- Google sign-in via Auth.js/NextAuth v5 beta with Postgres-backed sessions.

## Tech Stack
- Framework: Next.js 16 App Router (React 19, TypeScript)
- UI: Tailwind CSS, Radix UI, `@stargazers-stella/cosmic-ui`, `lucide-react`, `framer-motion`, `sonner`
- Data: PostgreSQL + Drizzle ORM + `drizzle-kit` migrations, Drizzle Studio
- Auth: Auth.js / NextAuth (Google) + Drizzle adapter
- Testing: Vitest
- Analytics: Google Analytics (optional)

## Architecture Highlights
- Database is the source of truth; pages render server-first.
- Mutations run through Server Actions with strict Zod parsing (no separate REST/GraphQL layer).
- UI refreshes after writes via revalidation (minimal client state).

## Tradeoffs
- Serverless hosting keeps costs low and scales cleanly without always-on servers. It reduces ops overhead and is a good fit for a watchlist app, even though it’s not ideal for every workload.

## Quickstart
**Prereqs:** Node 20+ recommended, Postgres 16+.

1) Install dependencies
```bash
cd Stargazers-Cosmic-Watchlist
npm install
```

2) Create `.env.local`
```bash
cp .env.example .env.local
```
Set `DATABASE_URL` to your Postgres connection string.

3) Start Postgres (example via Docker)
```bash
docker run --name watchlist-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=watchlist -p 5432:5432 -d postgres:16
```

4) Apply schema (+ optional seed)
```bash
npm run db:push
npm run db:seed
```

5) Run the app
```bash
npm run dev
```
Open `http://localhost:3000`.

## Google Auth Setup (Optional)
- Create OAuth credentials in Google Cloud Console (Web).
- Add redirect URL: `http://localhost:3000/api/auth/callback/google`
- Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `NEXTAUTH_SECRET` in `.env.local`.

## Configuration
Common env vars (see `.env.example`):

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | Postgres connection string |
| `GOOGLE_CLIENT_ID` | Optional | Google OAuth |
| `GOOGLE_CLIENT_SECRET` | Optional | Google OAuth |
| `NEXTAUTH_SECRET` | Optional | Session signing/encryption |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | Optional | Google Analytics tracking ID (e.g., G-XXXXXXXXXX) |
| `TMDB_API_KEY` | Optional | Enrichment + recommendations |
| `OMDB_API_KEY` | Optional | Enrichment fallback |
| `OPENAI_API_KEY` | Optional | AI-powered features (if enabled) |
| `IGDB_CLIENT_ID` | Optional | Game metadata (if enabled) |
| `IGDB_CLIENT_SECRET` | Optional | Game metadata (if enabled) |
| `ADMIN_EMAILS` | Optional | Comma-separated admin emails |

## Scripts
- `npm run dev` - start dev server
- `npm run build` / `npm run start` - production build/run
- `npm run lint` - ESLint
- `npm run test` - Vitest
- `npm run db:push` - apply schema to DB
- `npm run db:studio` - open Drizzle Studio
- `npm run db:seed` - seed sample data

## Deployment Notes (Vercel + Neon)
- Create a Neon database, set `DATABASE_URL` in Vercel, then run `npm run db:push` once against production.
- Add Google OAuth + `NEXTAUTH_SECRET` to enable sign-in and user-scoped data.

## Roadmap
- [ ] Import/export (Letterboxd/CSV) polish
- [ ] Command palette actions beyond the stub UI
- [ ] More enrichment sources and smarter recs
