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
  source: "tmdb" | "omdb" | "anilist" | "igdb" | "openlibrary" | "googlebooks";
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
  if (type === "anime") {
    const anilist = await fetchFromAnilist(title);
    if (anilist) return anilist;
    return null;
  }

  if (type === "game") {
    const igdb = await fetchFromIgdb(title);
    if (igdb) return igdb;
    return null;
  }

  if (type === "book") {
    const openLibrary = await fetchFromOpenLibrary(title);
    if (openLibrary) return openLibrary;
    const googleBooks = await fetchFromGoogleBooks(title);
    if (googleBooks) return googleBooks;
    return null;
  }

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

    const episodeRuntime =
      (Array.isArray(details.episode_run_time) ? details.episode_run_time[0] : undefined) ??
      details.last_episode_to_air?.runtime ??
      null;

    let runtimeMinutes =
      details.runtime ??
      episodeRuntime ??
      null;

    // For TV/anime, store approximate total runtime = episode runtime * episode count when available.
    if (tmdbType === "tv" && episodeRuntime && details.number_of_episodes) {
      runtimeMinutes = episodeRuntime * details.number_of_episodes;
    }

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

async function fetchFromAnilist(title: string): Promise<MetadataResult | null> {
  const query = `
    query ($search: String) {
      Page(page: 1, perPage: 1) {
        media(search: $search, type: ANIME) {
          title { romaji english }
          startDate { year }
          coverImage { extraLarge large }
          description
          genres
          studios(isMain: true) { nodes { name } }
          episodes
          duration
        }
      }
    }
  `;
  try {
    const res = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ query, variables: { search: title } }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const media = data?.data?.Page?.media?.[0];
    if (!media) return null;

    const description = typeof media.description === "string" ? stripHtml(media.description) : null;
    const year = media?.startDate?.year ?? null;
    const posterUrl = media?.coverImage?.extraLarge || media?.coverImage?.large || null;
    const genres = Array.isArray(media.genres) ? media.genres.filter(Boolean) : [];
    const studios = Array.isArray(media?.studios?.nodes)
      ? media.studios.nodes.map((s: any) => s?.name).filter(Boolean)
      : [];
    const episodeCount = Number.isFinite(media?.episodes) ? Number(media.episodes) : null;
    const duration = Number.isFinite(media?.duration) ? Number(media.duration) : null;
    const runtimeMinutes =
      duration && episodeCount ? duration * episodeCount : duration ?? null;

    return {
      source: "anilist",
      tmdbId: null,
      imdbId: null,
      posterUrl,
      releaseYear: year,
      runtimeMinutes,
      synopsis: description ? description.trim().slice(0, 2000) : null,
      genres: genres.length ? genres : undefined,
      studios: studios.length ? studios : undefined,
    };
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[metadata] anilist fetch failed", error);
    }
    return null;
  }
}

async function fetchFromIgdb(title: string): Promise<MetadataResult | null> {
  const clientId = process.env.IGDB_CLIENT_ID;
  const clientSecret = process.env.IGDB_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  const token = await getIgdbToken(clientId, clientSecret);
  if (!token) return null;

  const body = `search "${title}"; fields name,summary,first_release_date,cover.url; limit 1; where cover != null;`;
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
    if (!res.ok) return null;
    const data = await res.json();
    const first = data?.[0];
    if (!first) return null;

    const releaseYear = first?.first_release_date
      ? new Date(first.first_release_date * 1000).getFullYear()
      : null;

    return {
      source: "igdb",
      tmdbId: null,
      imdbId: null,
      posterUrl: normalizeIgdbCover(first?.cover?.url),
      releaseYear,
      runtimeMinutes: null,
      synopsis: typeof first?.summary === "string" ? first.summary.slice(0, 2000) : null,
    };
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[metadata] igdb fetch failed", error);
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

async function fetchFromOpenLibrary(title: string): Promise<MetadataResult | null> {
  const searchUrl = `https://openlibrary.org/search.json?title=${encodeURIComponent(title)}&limit=1`;
  try {
    const searchRes = await fetch(searchUrl, {
      headers: { Accept: "application/json", "User-Agent": "CosmicWatchlist/1.0" },
    });
    if (!searchRes.ok) return null;
    const search = await searchRes.json();
    const doc = search?.docs?.[0];
    if (!doc) return null;

    let synopsis: string | null = null;
    let subjects: string[] = [];
    const workKey = typeof doc?.key === "string" ? doc.key : null;
    if (workKey) {
      const workUrl = `https://openlibrary.org${workKey}.json`;
      const work = await fetchOpenLibraryJson(workUrl);
      if (work) {
        synopsis = extractOpenLibraryDescription(work?.description);
        subjects = Array.isArray(work?.subjects) ? work.subjects.filter(Boolean) : [];
      }
    }

    const authors = Array.isArray(doc?.author_name) ? doc.author_name.filter(Boolean) : [];
    const publishers = Array.isArray(doc?.publisher) ? doc.publisher.filter(Boolean) : [];
    const year = Number.isFinite(doc?.first_publish_year) ? Number(doc.first_publish_year) : null;
    const posterUrl = openLibraryCoverUrl(doc);

    return {
      source: "openlibrary",
      tmdbId: null,
      imdbId: null,
      posterUrl,
      releaseYear: year,
      runtimeMinutes: null,
      synopsis: synopsis ? synopsis.slice(0, 2000) : null,
      cast: authors.length ? authors : undefined,
      genres: subjects.length ? subjects.slice(0, 8) : undefined,
      studios: publishers.length ? publishers.slice(0, 4) : undefined,
    };
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[metadata] openlibrary fetch failed", error);
    }
    return null;
  }
}

async function fetchFromGoogleBooks(title: string): Promise<MetadataResult | null> {
  const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(title)}&maxResults=1`;
  try {
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    const data = await res.json();
    const item = data?.items?.[0];
    if (!item) return null;
    const info = item?.volumeInfo ?? {};
    const posterUrl = normalizeGoogleCover(info?.imageLinks?.thumbnail || info?.imageLinks?.smallThumbnail);
    const authors = Array.isArray(info?.authors) ? info.authors.filter(Boolean) : [];
    const categories = Array.isArray(info?.categories) ? info.categories.filter(Boolean) : [];
    const publisher = typeof info?.publisher === "string" ? [info.publisher] : [];

    return {
      source: "googlebooks",
      tmdbId: null,
      imdbId: null,
      posterUrl: posterUrl ?? null,
      releaseYear: parseYear(info?.publishedDate),
      runtimeMinutes: null,
      synopsis: typeof info?.description === "string" ? info.description.slice(0, 2000) : null,
      cast: authors.length ? authors : undefined,
      genres: categories.length ? categories.slice(0, 8) : undefined,
      studios: publisher.length ? publisher : undefined,
    };
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[metadata] google books fetch failed", error);
    }
    return null;
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
  if (!url) return null;
  let normalized = url.replace("//", "https://");
  normalized = normalized.replace("t_thumb", "t_cover_big");
  return normalized;
}

async function fetchOpenLibraryJson(url: string): Promise<any | null> {
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "CosmicWatchlist/1.0" },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

function openLibraryCoverUrl(row: any) {
  if (Number.isFinite(row?.cover_i)) {
    return `https://covers.openlibrary.org/b/id/${row.cover_i}-L.jpg`;
  }
  const isbn = Array.isArray(row?.isbn) ? row.isbn.find((v: any) => typeof v === "string") : null;
  if (isbn) {
    return `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`;
  }
  return null;
}

function normalizeGoogleCover(url?: string | null) {
  if (!url) return null;
  if (url.startsWith("http://")) return `https://${url.slice("http://".length)}`;
  return url;
}

function extractOpenLibraryDescription(input: unknown) {
  if (!input) return null;
  if (typeof input === "string") return stripHtml(input);
  if (typeof input === "object" && input && "value" in (input as any)) {
    const value = (input as any).value;
    if (typeof value === "string") return stripHtml(value);
  }
  return null;
}

function stripHtml(input: string) {
  return input.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function parseYear(input: string | undefined | null) {
  if (!input) return null;
  const match = String(input).match(/\d{4}/);
  return match ? Number(match[0]) : null;
}
