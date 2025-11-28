import { parse } from "csv-parse/sync";

type LetterboxdRow = Record<string, string>;

export type LetterboxdImportItem = {
  title: string;
  rating?: number;
  tags?: string;
  notes?: string;
  watchedDate?: string;
  year?: string;
};

export function parseLetterboxdCsv(csv: string): LetterboxdImportItem[] {
  const baseOptions = {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
    trim: true,
    delimiter: [",", ";", "\t"] as string[],
    bom: true,
  };

  const headerRows = parse(csv, baseOptions) as LetterboxdRow[];
  const parsedFromHeader = mapRows(headerRows);
  if (parsedFromHeader.length) return parsedFromHeader;

  // Fallback: CSV without headers (e.g., "ID;Name;Year").
  const rawRows = parse(csv, {
    ...baseOptions,
    columns: false,
  }) as string[][];
  const rowsAsObjects: LetterboxdRow[] = rawRows.map((cells) => ({
    Name: cells[1] || "",
    Year: cells[2] || "",
    Rating: cells[3] || "",
  }));
  return mapRows(rowsAsObjects);
}

function mapRows(rows: LetterboxdRow[]): LetterboxdImportItem[] {
  const parsed: LetterboxdImportItem[] = [];

  for (const row of rows) {
    const title = row["Name"] || row["Title"] || row["Film Title"] || "";
    if (!title) continue;

    const tags = row["Tags"] || row["tag"] || row["Tag"];
    const notes = row["Notes"] || row["Review"] || undefined;
    const watchedDate = row["WatchedDate"] || row["Watched Date"] || row["Date"];
    const year = row["Year"] || row["Release Year"] || undefined;

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

    const item: LetterboxdImportItem = {
      title: title.trim(),
      ...(rating !== undefined ? { rating } : {}),
      ...(tags ? { tags } : {}),
      ...(notes ? { notes } : {}),
      ...(watchedDate ? { watchedDate } : {}),
      ...(year ? { year } : {}),
    };

    parsed.push(item);
  }

  return parsed;
}
