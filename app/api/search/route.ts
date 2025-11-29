import { NextResponse } from "next/server";

const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w185";

type SearchResult = {
  title: string;
  type: "movie" | "tv" | "anime" | "game";
  year?: number;
  posterUrl?: string | null;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim();
  const rawType = (searchParams.get("type") || "movie").trim().toLowerCase();

  if (!q || q.length < 2) {
    return NextResponse.json({ ok: false, error: "Query too short" }, { status: 400 });
  }

  let results: SearchResult[] = [];

  if (rawType === "anime") {
    results = await searchAnime(q);
  } else if (rawType === "game") {
    results = await searchIgdb(q);
  } else {
    const tmdbKey = process.env.TMDB_API_KEY;
    const omdbKey = process.env.OMDB_API_KEY;
    const typeParam: "movie" | "tv" = rawType === "tv" ? "tv" : "movie";

    if (tmdbKey) {
      results = await searchTmdb(q, typeParam, tmdbKey);
    }

    if (!results.length && omdbKey) {
      results = await searchOmdb(q, typeParam, omdbKey);
    }
  }

  if (!results.length) {
    return NextResponse.json({ ok: false, error: "No matches found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, results: results.slice(0, 8) });
}

async function searchTmdb(q: string, type: "movie" | "tv", apiKey: string): Promise<SearchResult[]> {
  const tmdbType = type === "tv" ? "tv" : "movie";
  const url = `${TMDB_BASE}/search/${tmdbType}?api_key=${apiKey}&language=en-US&query=${encodeURIComponent(
    q,
  )}&include_adult=false`;
  const data = await safeJsonFetch(url);
  return (
    data?.results
      ?.map((row: any) => ({
        title: row?.title ?? row?.name,
        type: tmdbType as "movie" | "tv",
        year: parseYear(row?.release_date || row?.first_air_date),
        posterUrl: row?.poster_path ? `${TMDB_IMAGE_BASE}${row.poster_path}` : undefined,
      }))
      .filter((r: SearchResult) => r.title)
      .slice(0, 8) ?? []
  );
}

async function searchOmdb(q: string, type: "movie" | "tv", apiKey: string): Promise<SearchResult[]> {
  const omdbType = type === "tv" ? "series" : "movie";
  const url = `https://www.omdbapi.com/?apikey=${apiKey}&s=${encodeURIComponent(q)}&type=${omdbType}`;
  const data = await safeJsonFetch(url);
  if (!data || data.Response === "False") return [];
  return (
    data.Search?.map((row: any) => ({
      title: row?.Title,
      type: type,
      year: parseYear(row?.Year),
      posterUrl: row?.Poster && row.Poster !== "N/A" ? row.Poster : undefined,
    })) ?? []
  );
}

async function searchAnime(q: string): Promise<SearchResult[]> {
  // AniList GraphQL (public)
  const query = `
    query ($search: String) {
      Page(page: 1, perPage: 8) {
        media(search: $search, type: ANIME) {
          id
          title { romaji english }
          startDate { year }
          coverImage { large }
        }
      }
    }
  `;
  try {
    const res = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ query, variables: { search: q } }),
    });
    const data = await res.json();
    const media = data?.data?.Page?.media ?? [];
    return media
      .map((m: any) => ({
        title: m?.title?.english || m?.title?.romaji,
        type: "anime" as const,
        year: m?.startDate?.year,
        posterUrl: m?.coverImage?.large ?? undefined,
      }))
      .filter((r: SearchResult) => r.title);
  } catch {
    return [];
  }
}

async function searchIgdb(q: string): Promise<SearchResult[]> {
  const clientId = process.env.IGDB_CLIENT_ID;
  const clientSecret = process.env.IGDB_CLIENT_SECRET;
  if (!clientId || !clientSecret) return [];

  const token = await getIgdbToken(clientId, clientSecret);
  if (!token) return [];

  const body = `search "${q}"; fields name,cover.url,first_release_date; limit 8; where cover != null;`;
  try {
    const res = await fetch("https://api.igdb.com/v4/games", {
      method: "POST",
      headers: {
        "Client-ID": clientId,
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      body,
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data
      .map((row: any) => ({
        title: row?.name,
        type: "game" as const,
        year: row?.first_release_date ? new Date(row.first_release_date * 1000).getFullYear() : undefined,
        posterUrl: normalizeIgdbCover(row?.cover?.url),
      }))
      .filter((r: SearchResult) => r.title);
  } catch {
    return [];
  }
}

async function getIgdbToken(clientId: string, clientSecret: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://id.twitch.tv/oauth2/token?client_id=${clientId}&client_secret=${clientSecret}&grant_type=client_credentials`,
      { method: "POST" },
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data?.access_token ?? null;
  } catch {
    return null;
  }
}

function normalizeIgdbCover(url?: string | null) {
  if (!url) return undefined;
  let normalized = url.replace("//", "https://");
  normalized = normalized.replace("t_thumb", "t_cover_big");
  return normalized;
}

async function safeJsonFetch(url: string) {
  try {
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

function parseYear(input?: string | null) {
  if (!input) return undefined;
  const match = String(input).match(/\d{4}/);
  return match ? Number(match[0]) : undefined;
}
