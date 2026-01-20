# Cosmic Watchlist

Premium, server-first watchlist for anime, movies, TV, and games. Fast CRUD, shareable filters, and smart stats.

[![demo](https://img.shields.io/badge/demo-live-0ea5e9?logo=vercel&logoColor=white&style=flat)](https://stargazers-cosmic-watchlist.vercel.app/?utm_source=github&utm_medium=readme&utm_campaign=career-portfolio-2026&utm_content=badge)
![nextjs](https://img.shields.io/badge/next.js-16-000000?logo=nextdotjs&logoColor=white&style=flat)
![react](https://img.shields.io/badge/react-19-149eca?logo=react&logoColor=white&style=flat)
![tailwind](https://img.shields.io/badge/tailwindcss-3.4-38bdf8?logo=tailwindcss&logoColor=white&style=flat)
![postgres](https://img.shields.io/badge/postgres-16-316192?logo=postgresql&logoColor=white&style=flat)
![drizzle](https://img.shields.io/badge/drizzle-orm-6366f1?style=flat)

## Demo
- Live: [Open live demo](https://stargazers-cosmic-watchlist.vercel.app/?utm_source=github&utm_medium=readme&utm_campaign=career-portfolio-2026&utm_content=demo)

## Screenshots

<p align="center">
  <img src="docs/screenshots/landing-header.png" width="80%" alt="Landing hero" />
</p>

<p align="center">
  <img src="docs/screenshots/demo-your-collection.png" width="46%" alt="Dashboard / collection" />
  <img src="docs/screenshots/demo-recommendations.png" width="52%" alt="Stats + recommendations" />
</p>

![Command center palette](docs/screenshots/demo-command-center-palette.png)

## Architecture

![Architecture diagram](docs/screenshots/architecture.png)

## Tradeoffs
Serverless hosting keeps costs low and scales cleanly without always-on servers. It reduces ops overhead and is a good fit here, even though it is not ideal for every workload.

Tradeoff notes:
- Cold starts can add latency for rarely-hit routes.
- Long-running jobs and heavy background processing are a poor fit without external workers.
- You trade fine-grained server tuning for simplicity and lower cost.

## Features
- Server-first CRUD with type-safe validation (Zod) and Server Actions.
- Shareable filters via URL params.
- Smart stats: completion rate, runtime totals, activity heatmap, and breakdowns.
- Optional enrichment + recommendations (TMDB/OMDb).
- Google sign-in via Auth.js/NextAuth v5 beta with Postgres sessions.

## Stack
Next.js 16 App Router · React 19 · TypeScript · Tailwind CSS · Drizzle ORM · PostgreSQL · Auth.js

## Quickstart

```bash
cd Stargazers-Cosmic-Watchlist
npm install
cp .env.example .env.local
npm run db:push
npm run db:seed
npm run dev
```

Open `http://localhost:3000`.

## Config

Required:
- `DATABASE_URL`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `NEXTAUTH_SECRET`

Optional:
- `NEXT_PUBLIC_GA_MEASUREMENT_ID`
- `TMDB_API_KEY`
- `OMDB_API_KEY`
- `OPENAI_API_KEY`
- `IGDB_CLIENT_ID`
- `IGDB_CLIENT_SECRET`
- `ADMIN_EMAILS`
