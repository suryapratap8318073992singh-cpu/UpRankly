import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const globalForDb = globalThis as typeof globalThis & {
  __uprankly_pgPool?: Pool;
};

export const pool =
  globalForDb.__uprankly_pgPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    ssl: {
      rejectUnauthorized: false,
    },
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__uprankly_pgPool = pool;
}

export const db = drizzle(pool, { schema });