const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w500";

export type MetadataResult = {
  posterUrl?: string | null;
  releaseYear?: number | null;
  runtimeMinutes?: number | null;
  synopsis?: string | null;
  cast?: string[];
  genres?: string[];
  studios?: string[];
  imdbId?: string | null;
  tmdbId?: number | null;
  source: "tmdb" | "omdb";
};

export type SimilarTitle = {
  title: string;
  overview?: string;
  posterUrl?: string;
  year?: number;
  tmdbId?: number;
};

export function metadataToUpdate(meta: MetadataResult) {
  const update: Record<string, unknown> = {};
  if (meta.posterUrl) update.posterUrl = meta.posterUrl;
  if (meta.releaseYear) update.releaseYear = meta.releaseYear;
  if (meta.runtimeMinutes !== undefined && meta.runtimeMinutes !== null)
    update.runtimeMinutes = meta.runtimeMinutes;
  if (meta.synopsis) update.synopsis = meta.synopsis;
  if (meta.cast?.length) update.cast = meta.cast.join(", ");
  if (meta.genres?.length) update.genres = meta.genres.join(", ");
  if (meta.studios?.length) update.studios = meta.studios.join(", ");
  if (meta.imdbId) update.imdbId = meta.imdbId;
  if (meta.tmdbId) update.tmdbId = meta.tmdbId;
  if (meta.source) update.metadataSource = meta.source;
  return update;
}

export async function fetchMetadata(title: string, type: string): Promise<MetadataResult | null> {
  const tmdbKey = process.env.TMDB_API_KEY;
  if (tmdbKey) {
    const tmdb = await fetchFromTmdb(title, type, tmdbKey);
    if (tmdb) return tmdb;
  }

  const omdbKey = process.env.OMDB_API_KEY;
  if (omdbKey) {
    const omdb = await fetchFromOmdb(title, type, omdbKey);
    if (omdb) return omdb;
  }

  return null;
}

export async function fetchSimilarTitles(seed: {
  title: string;
  type: string;
  tmdbId?: number | null;
}): Promise<SimilarTitle[]> {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) return [];

  const tmdbType = normalizeType(seed.type);
  let tmdbId = seed.tmdbId;

  if (!tmdbId) {
    const searchUrl = `${TMDB_BASE}/search/${tmdbType}?api_key=${apiKey}&language=en-US&query=${encodeURIComponent(
      seed.title,
    )}&include_adult=false`;
    const searchRes = await safeJsonFetch(searchUrl);
    tmdbId = searchRes?.results?.[0]?.id;
  }

  if (!tmdbId) return [];

  const similarUrl = `${TMDB_BASE}/${tmdbType}/${tmdbId}/similar?api_key=${apiKey}&language=en-US&page=1`;
  const similarRes = await safeJsonFetch(similarUrl);
  const results: SimilarTitle[] =
    similarRes?.results
      ?.map((row: any) => ({
        title: row?.title ?? row?.name,
        overview: row?.overview,
        posterUrl: row?.poster_path ? `${TMDB_IMAGE_BASE}${row.poster_path}` : undefined,
        year: parseYear(row?.release_date || row?.first_air_date),
        tmdbId: row?.id,
      }))
      .filter((row: SimilarTitle) => row.title) ?? [];

  return results.slice(0, 12);
}

async function fetchFromTmdb(title: string, type: string, apiKey: string): Promise<MetadataResult | null> {
  try {
    const tmdbType = normalizeType(type);
    const searchUrl = `${TMDB_BASE}/search/${tmdbType}?api_key=${apiKey}&language=en-US&query=${encodeURIComponent(
      title,
    )}&include_adult=false`;
    const search = await safeJsonFetch(searchUrl);
    const first = search?.results?.[0];
    if (!first) return null;

    const detailsUrl = `${TMDB_BASE}/${tmdbType}/${first.id}?api_key=${apiKey}&language=en-US&append_to_response=credits,external_ids,similar`;
    const details = await safeJsonFetch(detailsUrl);
    if (!details) return null;

    const runtimeMinutes =
      details.runtime ??
      (Array.isArray(details.episode_run_time) ? details.episode_run_time[0] : undefined) ??
      details.last_episode_to_air?.runtime ??
      null;

    const cast =
      details.credits?.cast
        ?.slice(0, 6)
        .map((c: any) => c?.name)
        .filter(Boolean) ?? [];

    const genres =
      details.genres?.map((g: any) => g?.name).filter(Boolean) ??
      (Array.isArray(first.genre_ids) ? first.genre_ids.map(String) : []);

    const studios =
      details.production_companies?.map((c: any) => c?.name).filter(Boolean) ??
      details.networks?.map((c: any) => c?.name).filter(Boolean) ??
      [];

    return {
      source: "tmdb",
      tmdbId: details.id,
      imdbId: details.external_ids?.imdb_id ?? details.imdb_id ?? null,
      posterUrl: details.poster_path ? `${TMDB_IMAGE_BASE}${details.poster_path}` : null,
      releaseYear: parseYear(details.release_date || details.first_air_date),
      runtimeMinutes: runtimeMinutes ?? null,
      synopsis: details.overview || null,
      cast,
      genres,
      studios,
    };
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[metadata] tmdb fetch failed", error);
    }
    return null;
  }
}

async function fetchFromOmdb(title: string, type: string, apiKey: string): Promise<MetadataResult | null> {
  try {
    const omdbType = omdbTypeFor(type);
    const url = `https://www.omdbapi.com/?apikey=${apiKey}&t=${encodeURIComponent(title)}${
      omdbType ? `&type=${omdbType}` : ""
    }`;
    const data = await safeJsonFetch(url);
    if (!data || data.Response === "False") return null;

    const runtime = typeof data.Runtime === "string" ? parseInt(data.Runtime, 10) : undefined;
    const cast =
      typeof data.Actors === "string"
        ? data.Actors.split(",").map((a: string) => a.trim()).filter(Boolean)
        : [];
    const genres =
      typeof data.Genre === "string"
        ? data.Genre.split(",").map((g: string) => g.trim()).filter(Boolean)
        : [];
    const studios =
      typeof data.Production === "string"
        ? data.Production.split(",").map((s: string) => s.trim()).filter(Boolean)
        : [];

    return {
      source: "omdb",
      tmdbId: null,
      imdbId: data.imdbID ?? null,
      posterUrl: data.Poster && data.Poster !== "N/A" ? data.Poster : null,
      releaseYear: parseYear(data.Year),
      runtimeMinutes: Number.isFinite(runtime) ? runtime : null,
      synopsis: data.Plot && data.Plot !== "N/A" ? data.Plot : null,
      cast,
      genres,
      studios,
    };
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[metadata] omdb fetch failed", error);
    }
    return null;
  }
}

function normalizeType(type: string) {
  if (type === "movie") return "movie";
  if (type === "game") return "movie"; // TMDB has limited game data; treat as movie search
  return "tv";
}

function omdbTypeFor(type: string) {
  if (type === "movie") return "movie";
  if (type === "tv" || type === "anime") return "series";
  if (type === "game") return "game";
  return "";
}

async function safeJsonFetch(url: string): Promise<any | null> {
  try {
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

function parseYear(input: string | undefined | null) {
  if (!input) return null;
  const match = String(input).match(/\d{4}/);
  return match ? Number(match[0]) : null;
}
