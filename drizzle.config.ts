import { defineConfig } from "drizzle-kit";
import dotenv from "dotenv";

// .env.local से URL पढ़ो
dotenv.config({ path: ".env.local" });

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
});