-- Esquema das galerias privadas da NEBULA.
-- Correr no Supabase: SQL Editor → New query → colar → Run.
-- É idempotente: pode voltar a correr sem estragar dados existentes.

-- O pgcrypto dá-nos crypt() e gen_salt(). No Supabase já vem instalado no
-- schema `extensions` (não no `public`), por isso não basta pedi-lo: as funções
-- abaixo têm de o procurar lá — ver o search_path de cada uma.
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

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

-- ─── Capa, tipografia e vídeos ──────────────────────────────────────────────
-- Aditivo de propósito: quem já correu este ficheiro pode voltar a corrê-lo.

alter table galleries
  -- Foto escolhida como capa. Se for apagada, a galeria fica sem capa em vez
  -- de apontar para o vazio.
  add column if not exists cover_photo_id uuid references photos(id) on delete set null,
  -- Texto centrado sobre a capa. Vazio = usa o título da galeria.
  add column if not exists cover_title text,
  -- 'serif' | 'sans' | 'label' — ver COVER_FONTS no frontend.
  add column if not exists cover_font text not null default 'serif',
  -- 'white' | 'black' | 'none' — qual dos logos aparece na capa.
  add column if not exists logo_variant text not null default 'white';

alter table photos
  -- Distingue foto de vídeo sem depender da extensão do nome do ficheiro.
  add column if not exists content_type text;

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
returns void language sql security definer
  set search_path = public, extensions as $$
  update galleries set password_hash = crypt(new_password, gen_salt('bf', 10))
  where id = gallery_id;
$$;

revoke all on function set_gallery_password(uuid, text) from public, anon;
grant execute on function set_gallery_password(uuid, text) to authenticated;

drop view if exists galleries_admin;
create view galleries_admin as
  select id, slug, title, client_name, message, cover_path, cover_photo_id,
         cover_title, cover_font, logo_variant, published, download_enabled,
         expires_at, created_at, updated_at
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

-- CREATE OR REPLACE não muda o tipo de retorno: para acrescentar colunas é
-- preciso apagar a função primeiro.
drop function if exists verify_gallery_password(text, text);

create function verify_gallery_password(p_slug text, p_password text)
returns table (
  id uuid,
  slug text,
  title text,
  client_name text,
  message text,
  download_enabled boolean,
  cover_photo_id uuid,
  cover_title text,
  cover_font text,
  logo_variant text
) language plpgsql security definer
  set search_path = public, extensions as $$
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
  select g.id, g.slug, g.title, g.client_name, g.message, g.download_enabled,
         g.cover_photo_id, g.cover_title, g.cover_font, g.logo_variant
  from galleries g
  where g.slug = p_slug
    and g.published = true
    and (g.expires_at is null or g.expires_at > now())
    and g.password_hash = crypt(p_password, g.password_hash);

  insert into access_attempts (slug, ok) values (p_slug, found);
end $$;

revoke all on function verify_gallery_password(text, text) from public, anon, authenticated;
grant execute on function verify_gallery_password(text, text) to service_role;

-- ─── Registo de atividade ───────────────────────────────────────────────────
-- O que o cliente fez na galeria dele. Serve para o fotógrafo saber se a
-- entrega foi vista e descarregada — não para perfilar ninguém: guarda-se o
-- que aconteceu e quando, e mais nada.

create table if not exists gallery_events (
  id bigserial primary key,
  gallery_id uuid not null references galleries(id) on delete cascade,
  -- 'open' | 'download_all' | 'download_one'
  kind text not null check (kind in ('open', 'download_all', 'download_one')),
  -- Nome legível do ficheiro, para o registo continuar a fazer sentido mesmo
  -- depois de a foto ser apagada.
  file_name text,
  photo_id uuid,
  at timestamptz not null default now()
);

create index if not exists gallery_events_idx on gallery_events (gallery_id, at desc);

alter table gallery_events enable row level security;

drop policy if exists "admin lê eventos" on gallery_events;
create policy "admin lê eventos" on gallery_events
  for select to authenticated using (true);

-- Ninguém escreve aqui a partir do browser: os eventos entram pela Edge
-- Function, que exige o comprovativo de acesso emitido depois da password.

-- ─── Conteúdo do site ───────────────────────────────────────────────────────
-- Ao contrário das galerias de cliente, isto é público: o site lê-o sem estar
-- autenticado. Só o admin escreve.
--
-- As imagens do portfólio vivem num bucket R2 PÚBLICO (separado do privado das
-- galerias) — uma página pública não pode depender de URLs assinados, que
-- expiram e não são cacheáveis nem indexáveis.

create table if not exists site_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  label text not null,
  sort_order int not null default 0
);

create table if not exists site_photos (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references site_categories(id) on delete set null,
  -- Chave no bucket público. O URL é <VITE_R2_PUBLIC_URL>/<storage_key>.
  storage_key text not null,
  thumb_key text,
  -- Texto alternativo: numa página pública é acessibilidade e é SEO.
  alt text not null default '',
  width int,
  height int,
  -- Fotos altas ocupam duas linhas na grelha, como no portfólio atual.
  tall boolean not null default false,
  sort_order int not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists site_photos_idx on site_photos (sort_order);

alter table site_categories enable row level security;
alter table site_photos enable row level security;

-- Leitura pública: é isto que o site mostra a quem o visita.
drop policy if exists "todos leem categorias" on site_categories;
create policy "todos leem categorias" on site_categories
  for select to anon, authenticated using (true);

drop policy if exists "todos leem fotos do site" on site_photos;
create policy "todos leem fotos do site" on site_photos
  for select to anon, authenticated using (published);

-- Escrita só para quem fez login no painel.
drop policy if exists "admin escreve categorias" on site_categories;
create policy "admin escreve categorias" on site_categories
  for all to authenticated using (true) with check (true);

drop policy if exists "admin escreve fotos do site" on site_photos;
create policy "admin escreve fotos do site" on site_photos
  for all to authenticated using (true) with check (true);

-- Categorias de arranque, iguais às que o site já mostra.
insert into site_categories (slug, label, sort_order) values
  ('casamentos', 'Casamentos', 1),
  ('maternidade', 'Maternidade', 2),
  ('eventos', 'Eventos', 3)
on conflict (slug) do nothing;

-- ─── Storage ────────────────────────────────────────────────────────────────
-- As fotografias NÃO vivem no Supabase: vivem num bucket privado do
-- Cloudflare R2, que tem 10 GB gratuitos e não cobra tráfego de saída — e o
-- tráfego é o custo real quando o produto é clientes a descarregar galerias.
--
-- O Supabase fica com a base de dados, a autenticação e as Edge Functions,
-- que cabem de sobra no plano gratuito. Não há bucket nem políticas de storage
-- para criar aqui; o acesso ao R2 é feito com URLs pré-assinados emitidos pelas
-- funções, com as credenciais guardadas nos secrets.
--
-- As colunas storage_path e thumb_path guardam a chave do objeto no R2.
