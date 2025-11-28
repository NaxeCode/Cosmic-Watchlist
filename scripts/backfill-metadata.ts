import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { eq, isNull, or } from "drizzle-orm";

// Load env from .env.local first (Next.js convention), fallback to .env.
const localEnvPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(localEnvPath)) {
  dotenv.config({ path: localEnvPath });
} else {
  dotenv.config();
}

async function main() {
  const { db } = await import("../db");
  const { items } = await import("../db/schema");
  const { fetchMetadata, metadataToUpdate } = await import("../lib/metadata");

  const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
  const limit = limitArg ? Number(limitArg.split("=")[1]) : 200;

  if (!process.env.TMDB_API_KEY && !process.env.OMDB_API_KEY) {
    console.error("Set TMDB_API_KEY or OMDB_API_KEY before running backfill.");
    process.exit(1);
  }

  console.log(`Fetching up to ${limit} items missing poster/synopsis...`);

  const rows = await db.query.items.findMany({
    where: or(isNull(items.posterUrl), eq(items.posterUrl, "")),
    orderBy: (fields, operators) => operators.desc(fields.createdAt),
    limit,
  });

  console.log(`Found ${rows.length} item(s) to enrich.`);

  let updated = 0;
  for (const row of rows) {
    const meta = await fetchMetadata(row.title, row.type);
    if (!meta) {
      console.warn(`No metadata for "${row.title}"`);
      continue;
    }
    const update = metadataToUpdate(meta);
    if (!Object.keys(update).length) continue;
    await db.update(items).set({ ...update, updatedAt: new Date() }).where(eq(items.id, row.id));
    updated += 1;
    console.log(`Updated #${row.id} - ${row.title}`);
  }

  console.log(`Backfill complete. Updated ${updated} item(s).`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
