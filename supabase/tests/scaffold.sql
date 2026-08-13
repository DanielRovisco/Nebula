-- Esqueleto que imita o Supabase, para poder testar o schema.sql num
-- PostgreSQL local antes de o correr a sério.
--
-- O detalhe que importa: no Supabase o pgcrypto vive no schema `extensions`,
-- não no `public`. Testar com ele em `public` dá falsos positivos — foi assim
-- que passou despercebido um `search_path` que fazia o gen_salt() não ser
-- encontrado no Supabase, apesar de 20 testes verdes localmente.
--
--   createdb nebula_test
--   psql -d nebula_test -f supabase/tests/scaffold.sql
--   psql -d nebula_test -f supabase/schema.sql
--   psql -d nebula_test -f supabase/tests/security.sql

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin;
  end if;
end $$;

-- O Supabase tem estas tabelas mesmo não as usando nós (as fotos estão no R2).
create schema if not exists storage;

create table if not exists storage.buckets (
  id text primary key,
  name text not null,
  public boolean default false,
  created_at timestamptz default now()
);

create table if not exists storage.objects (
  id uuid primary key default extensions.gen_random_uuid(),
  bucket_id text references storage.buckets(id),
  name text,
  created_at timestamptz default now()
);

alter table storage.objects enable row level security;
