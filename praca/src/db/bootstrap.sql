-- Idempotent bootstrap executed before the Drizzle migrations (see scripts/migrate.ts).
-- Supabase/Neon: the same extensions can be enabled from the dashboard; IF NOT EXISTS keeps this safe.
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- unaccent() is STABLE; this wrapper is the standard trick to use it in generated columns and indexes.
CREATE OR REPLACE FUNCTION immutable_unaccent(text) RETURNS text
  LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
  AS $$ SELECT unaccent('unaccent', $1) $$;

-- UUIDv7 (time-ordered). PostgreSQL 18 ships uuidv7() natively; this function keeps PG 14–17 compatible.
CREATE OR REPLACE FUNCTION uuid_generate_v7() RETURNS uuid
  LANGUAGE sql VOLATILE PARALLEL SAFE
  AS $$
    SELECT encode(
      set_bit(
        set_bit(
          overlay(uuid_send(gen_random_uuid())
                  placing substring(int8send(floor(extract(epoch FROM clock_timestamp()) * 1000)::bigint) FROM 3)
                  FROM 1 FOR 6),
          52, 1),
        53, 1),
      'hex')::uuid
  $$;

-- enum → text cast is STABLE; unique indexes over nullable enums need an IMMUTABLE wrapper.
CREATE OR REPLACE FUNCTION enum_text(anyenum) RETURNS text
  LANGUAGE sql IMMUTABLE PARALLEL SAFE
  AS $$ SELECT $1::text $$;
