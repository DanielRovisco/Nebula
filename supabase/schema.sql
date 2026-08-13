-- Esquema das galerias privadas da NEBULA.
-- Correr no Supabase: SQL Editor → New query → colar → Run.
-- É idempotente: pode voltar a correr sem estragar dados existentes.

create extension if not exists pgcrypto;

-- ─── Tabelas ────────────────────────────────────────────────────────────────

create table if not exists galleries (
  id uuid primary key default gen_random_uuid(),
  -- Aparece no URL: /galeria/<slug>. É o "código" que o cliente recebe.
  slug text not null unique,
  title text not null,
  client_name text,
  -- Mensagem opcional mostrada ao cliente depois de entrar.
  message text,
  -- Caminho no storage da foto usada como capa (opcional).
  cover_path text,
  -- Hash bcrypt. A password em claro nunca é guardada nem sai do servidor.
  password_hash text not null,
  -- Enquanto false, a galeria não abre nem com a password certa.
  published boolean not null default false,
  -- Permite ao cliente descarregar. Se false, só vê.
  download_enabled boolean not null default true,
  -- Depois desta data a galeria deixa de abrir. Null = sem prazo.
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists photos (
  id uuid primary key default gen_random_uuid(),
  gallery_id uuid not null references galleries(id) on delete cascade,
  -- Caminho dentro do bucket privado 'galleries'.
  storage_path text not null,
  -- Miniatura gerada no browser durante o upload. Sem isto a grelha teria de
  -- carregar as fotos em tamanho real, e as transformações de imagem do
  -- Supabase só existem nos planos pagos.
  thumb_path text,
  file_name text not null,
  width int,
  height int,
  size_bytes bigint,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists photos_gallery_idx on photos (gallery_id, sort_order);
create index if not exists galleries_slug_idx on galleries (slug);

-- Mantém updated_at fresco em qualquer alteração.
create or replace function touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists galleries_touch on galleries;
create trigger galleries_touch before update on galleries
  for each row execute function touch_updated_at();

-- ─── Row Level Security ─────────────────────────────────────────────────────
-- Ninguém anónimo lê estas tabelas. O cliente nunca fala com elas diretamente:
-- passa sempre pela Edge Function, que corre com a service role e só devolve
-- dados depois de validar a password.

alter table galleries enable row level security;
alter table photos enable row level security;

drop policy if exists "admin lê galerias" on galleries;
create policy "admin lê galerias" on galleries
  for select to authenticated using (true);

drop policy if exists "admin escreve galerias" on galleries;
create policy "admin escreve galerias" on galleries
  for all to authenticated using (true) with check (true);

drop policy if exists "admin lê fotos" on photos;
create policy "admin lê fotos" on photos
  for select to authenticated using (true);

drop policy if exists "admin escreve fotos" on photos;
create policy "admin escreve fotos" on photos
  for all to authenticated using (true) with check (true);

-- ─── Password ───────────────────────────────────────────────────────────────
-- Só o servidor faz hash e verificação. A app nunca recebe o hash: as políticas
-- acima dão select em galleries a utilizadores autenticados, por isso o admin
-- veria a coluna — a view abaixo é o que a app usa, sem o hash.

create or replace function set_gallery_password(gallery_id uuid, new_password text)
returns void language sql security definer set search_path = public as $$
  update galleries set password_hash = crypt(new_password, gen_salt('bf', 10))
  where id = gallery_id;
$$;

revoke all on function set_gallery_password(uuid, text) from public, anon;
grant execute on function set_gallery_password(uuid, text) to authenticated;

create or replace view galleries_admin as
  select id, slug, title, client_name, message, cover_path, published,
         download_enabled, expires_at, created_at, updated_at
  from galleries;

-- ─── Verificação de acesso do cliente ──────────────────────────────────────
-- Só a Edge Function (service role) pode chamar isto. Devolve a galeria apenas
-- se estiver publicada, dentro do prazo e a password bater certo. A comparação
-- é feita pelo crypt() do Postgres — o hash nunca sai da base de dados.

create table if not exists access_attempts (
  id bigserial primary key,
  slug text not null,
  ok boolean not null,
  at timestamptz not null default now()
);

create index if not exists access_attempts_idx on access_attempts (slug, at desc);

alter table access_attempts enable row level security;

create or replace function verify_gallery_password(p_slug text, p_password text)
returns table (
  id uuid,
  slug text,
  title text,
  client_name text,
  message text,
  download_enabled boolean
) language plpgsql security definer set search_path = public as $$
declare
  recent_failures int;
begin
  -- Trava tentativas à força bruta: 10 falhas na última hora para o mesmo slug
  -- e o acesso fica fechado, mesmo com a password correta.
  select count(*) into recent_failures
  from access_attempts a
  where a.slug = p_slug and not a.ok and a.at > now() - interval '1 hour';

  if recent_failures >= 10 then
    insert into access_attempts (slug, ok) values (p_slug, false);
    return;
  end if;

  return query
  select g.id, g.slug, g.title, g.client_name, g.message, g.download_enabled
  from galleries g
  where g.slug = p_slug
    and g.published = true
    and (g.expires_at is null or g.expires_at > now())
    and g.password_hash = crypt(p_password, g.password_hash);

  insert into access_attempts (slug, ok) values (p_slug, found);
end $$;

revoke all on function verify_gallery_password(text, text) from public, anon, authenticated;
grant execute on function verify_gallery_password(text, text) to service_role;

-- ─── Storage ────────────────────────────────────────────────────────────────
-- Bucket privado: sem política de leitura pública, nada é servido por URL
-- direto. O acesso do cliente é sempre por signed URL de curta duração emitido
-- pela Edge Function.

insert into storage.buckets (id, name, public)
values ('galleries', 'galleries', false)
on conflict (id) do update set public = false;

drop policy if exists "admin gere ficheiros" on storage.objects;
create policy "admin gere ficheiros" on storage.objects
  for all to authenticated
  using (bucket_id = 'galleries')
  with check (bucket_id = 'galleries');
