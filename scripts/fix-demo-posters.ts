#!/usr/bin/env tsx

/**
 * Script to fetch correct poster URLs using the existing search API
 *
 * Usage:
 *   npx tsx scripts/fix-demo-posters.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });

const DEMO_ITEMS = [
  { id: 1, title: "Cowboy Bebop", type: "anime", year: 1998 },
  { id: 2, title: "Everything Everywhere All at Once", type: "movie", year: 2022 },
  { id: 3, title: "The Last of Us", type: "tv", year: 2023 },
  { id: 4, title: "Baldur's Gate 3", type: "game", year: 2023 },
  { id: 5, title: "Arcane", type: "anime", year: 2021 },
  { id: 6, title: "Dune: Part Two", type: "movie", year: 2024 },
];

const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w500"; // Using w500 for better quality

async function searchTmdb(title: string, type: "movie" | "tv", year?: number) {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    throw new Error("TMDB_API_KEY not found in environment");
  }

  const tmdbType = type === "tv" ? "tv" : "movie";
  const url = `${TMDB_BASE}/search/${tmdbType}?api_key=${apiKey}&language=en-US&query=${encodeURIComponent(title)}&include_adult=false`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`TMDB API error: ${res.status}`);

  const data = await res.json();
  const results = data?.results ?? [];

  // Try to find exact match by year if provided
  if (year && results.length > 0) {
    const yearMatch = results.find((r: any) => {
      const releaseYear = parseYear(r?.release_date || r?.first_air_date);
      return releaseYear === year;
    });
    if (yearMatch) {
      return yearMatch.poster_path ? `${TMDB_IMAGE_BASE}${yearMatch.poster_path}` : null;
    }
  }

  // Otherwise return first result
  const first = results[0];
  return first?.poster_path ? `${TMDB_IMAGE_BASE}${first.poster_path}` : null;
}

async function searchAnime(title: string, year?: number) {
  const query = `
    query ($search: String) {
      Page(page: 1, perPage: 10) {
        media(search: $search, type: ANIME) {
          id
          title { romaji english }
          startDate { year }
          coverImage { large extraLarge }
        }
      }
    }
  `;

  const res = await fetch("https://graphql.anilist.co", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query, variables: { search: title } }),
  });

  const data = await res.json();
  const media = data?.data?.Page?.media ?? [];

  // Try to find exact match by year
  if (year && media.length > 0) {
    const yearMatch = media.find((m: any) => m?.startDate?.year === year);
    if (yearMatch) {
      return yearMatch.coverImage?.extraLarge || yearMatch.coverImage?.large || null;
    }
  }

  // Otherwise return first result
  const first = media[0];
  return first?.coverImage?.extraLarge || first?.coverImage?.large || null;
}

async function searchGame(title: string) {
  const clientId = process.env.IGDB_CLIENT_ID;
  const clientSecret = process.env.IGDB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.warn("⚠️  IGDB credentials not found, skipping game search");
    return null;
  }

  // Get token
  const tokenRes = await fetch(
    `https://id.twitch.tv/oauth2/token?client_id=${clientId}&client_secret=${clientSecret}&grant_type=client_credentials`,
    { method: "POST" }
  );
  if (!tokenRes.ok) return null;
  const tokenData = await tokenRes.json();
  const token = tokenData?.access_token;
  if (!token) return null;

  // Search games
  const body = `search "${title}"; fields name,cover.url,first_release_date; limit 5; where cover != null;`;
  const res = await fetch("https://api.igdb.com/v4/games", {
    method: "POST",
    headers: {
      "Client-ID": clientId,
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    body,
  });

  if (!res.ok) return null;
  const data = await res.json();
  const first = data[0];
  if (!first?.cover?.url) return null;

  // Normalize IGDB URL
  let url = first.cover.url.replace("//", "https://");
  url = url.replace("t_thumb", "t_cover_big");
  return url;
}

function parseYear(input?: string | null) {
  if (!input) return undefined;
  const match = String(input).match(/\d{4}/);
  return match ? Number(match[0]) : undefined;
}

async function fixPoster(item: typeof DEMO_ITEMS[0]) {
  console.log(`\n🔍 Searching for: ${item.title} (${item.type}, ${item.year})`);

  let posterUrl: string | null = null;

  try {
    if (item.type === "anime") {
      posterUrl = await searchAnime(item.title, item.year);
    } else if (item.type === "game") {
      posterUrl = await searchGame(item.title);
    } else {
      posterUrl = await searchTmdb(item.title, item.type as "movie" | "tv", item.year);
    }

    if (posterUrl) {
      console.log(`✅ Found: ${posterUrl}`);
      return { ...item, posterUrl };
    } else {
      console.log(`❌ No poster found`);
      return { ...item, posterUrl: null };
    }
  } catch (error) {
    console.log(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return { ...item, posterUrl: null };
  }
}

async function main() {
  console.log('🎬 Fetching poster URLs using existing APIs...\n');
  console.log('=' .repeat(80));

  const results = [];

  for (const item of DEMO_ITEMS) {
    const result = await fixPoster(item);
    results.push(result);
    await new Promise(resolve => setTimeout(resolve, 500)); // Rate limit
  }

  console.log('\n' + '='.repeat(80));
  console.log('\n📋 Results:\n');

  console.log('Copy this into components/landing-page.tsx:\n');
  console.log('const DEMO_ITEMS = [');
  results.forEach((item, i) => {
    console.log(`  {`);
    console.log(`    id: ${item.id},`);
    console.log(`    title: "${item.title}",`);
    console.log(`    type: "${item.type}",`);
    console.log(`    posterUrl: ${item.posterUrl ? `"${item.posterUrl}"` : 'null'},`);
    console.log(`    // ... rest of item data`);
    console.log(`  }${i < results.length - 1 ? ',' : ''}`);
  });
  console.log('];');

  const successful = results.filter(r => r.posterUrl).length;
  const failed = results.filter(r => !r.posterUrl).length;

  console.log(`\n✅ Successful: ${successful}/${results.length}`);
  console.log(`❌ Failed: ${failed}/${results.length}`);
}

main();
