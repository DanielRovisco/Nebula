import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const g = globalThis as unknown as { __pracaSql?: postgres.Sql; __pracaOrm?: postgres.Sql };

function connect(max: number) {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set — copy .env.example to .env.local");
  return postgres(url, {
    max,
    // PgBouncer (Supabase/Neon pooled URLs) in transaction mode does not support prepared statements.
    prepare: false,
    onnotice: () => {},
  });
}

/**
 * Raw postgres.js client for PostGIS-heavy SQL: dates arrive as `Date`, numerics as strings (cast in SQL).
 * Kept separate from the Drizzle client because drizzle-orm rewrites the type parsers of the client it wraps
 * (timestamps become strings), which would silently change the behaviour of raw queries.
 */
export const sql = g.__pracaSql ?? connect(Number(process.env.DB_POOL_MAX ?? 10));
const ormClient = g.__pracaOrm ?? connect(3);
if (process.env.NODE_ENV !== "production") {
  g.__pracaSql = sql;
  g.__pracaOrm = ormClient;
}

export const db = drizzle(ormClient, { schema });
export { schema };
