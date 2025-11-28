import { parse } from "csv-parse/sync";

type LetterboxdRow = Record<string, string>;

export type LetterboxdImportItem = {
  title: string;
  rating?: number;
  tags?: string;
  notes?: string;
  watchedDate?: string;
};

export function parseLetterboxdCsv(csv: string): LetterboxdImportItem[] {
  const rows = parse(csv, {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
    trim: true,
  }) as LetterboxdRow[];

  const parsed = rows
    .map((row) => {
      const title = row["Name"] || row["Title"] || row["Film Title"] || "";
      if (!title) return null;

      const tags = row["Tags"] || row["tag"] || row["Tag"];
      const notes = row["Notes"] || row["Review"] || undefined;
      const watchedDate = row["WatchedDate"] || row["Watched Date"] || row["Date"];

      // Letterboxd ratings are typically 0-5 (half steps). Convert to 0-10.
      const ratingRaw = row["Rating"] || row["Rating10"] || row["rating"];
      let rating: number | undefined;
      if (ratingRaw) {
        const num = Number(ratingRaw);
        if (!Number.isNaN(num) && num > 0) {
          rating = num <= 5 ? Math.round(num * 2) : Math.round(num);
          if (rating > 10) rating = 10;
        }
      }

      return {
        title: title.trim(),
        rating,
        tags,
        notes,
        watchedDate,
      };
    })
    .filter((item): item is LetterboxdImportItem => !!item);

  return parsed;
}
