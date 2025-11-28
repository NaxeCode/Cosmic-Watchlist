import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { items } from "../db/schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set for seeding");
}

const pool = new Pool({ connectionString });
const db = drizzle(pool);

async function seed() {
  console.log("🌱 Seeding watchlist data...");
  await db.delete(items);

  await db.insert(items).values([
    {
      title: "Spirited Away",
      type: "movie",
      status: "completed",
      rating: 9,
      tags: "studio ghibli,classic",
      notes: "Rewatch for the score and the bathhouse arc.",
      userId: null,
    },
    {
      title: "Frieren: Beyond Journey's End",
      type: "anime",
      status: "watching",
      rating: 10,
      tags: "seasonal,fantasy",
      notes: "Pure vibes and pacing. Track standout episodes.",
      userId: null,
    },
    {
      title: "Baldur's Gate 3",
      type: "game",
      status: "paused",
      rating: 8,
      tags: "crpg,act 2",
      notes: "Resume before latest patch changes balance.",
      userId: null,
    },
  ]);

  console.log("✅ Seed complete.");
}

seed()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
