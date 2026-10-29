import { sql } from "drizzle-orm";
import { customType, timestamp, uuid } from "drizzle-orm/pg-core";

/** UUIDv7 primary key (time-ordered → friendly B-tree locality). `uuid_generate_v7()` is created by db/bootstrap.sql. */
export const pk = () => uuid("id").primaryKey().default(sql`uuid_generate_v7()`);

export const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
export const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());
export const deletedAt = () => timestamp("deleted_at", { withTimezone: true });

export const ts = (name: string) => timestamp(name, { withTimezone: true });

/** PostGIS geometry(MultiPolygon, 4326). Written/read with ST_GeomFromGeoJSON / ST_AsGeoJSON in SQL. */
export const multiPolygon = customType<{ data: string }>({
  dataType: () => "geometry(MultiPolygon,4326)",
});

/** PostGIS geometry(Point, 4326). */
export const pointGeom = customType<{ data: string }>({
  dataType: () => "geometry(Point,4326)",
});

/** tsvector — only used as a generated column. */
export const tsvector = customType<{ data: string }>({
  dataType: () => "tsvector",
});
