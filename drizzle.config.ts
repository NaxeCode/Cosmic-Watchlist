import { config } from "dotenv";
import type { Config } from "drizzle-kit";

config(); // load .env
config({ path: ".env.local", override: true }); // prefer local overrides

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set for Drizzle config");
}

export default {
  schema: "./db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
} satisfies Config;
