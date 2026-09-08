-- Esquema das galerias privadas da NEBULA.
-- Correr no Supabase: SQL Editor → New query → colar → Run.
-- É idempotente: pode voltar a correr sem estragar dados existentes.

-- O pgcrypto dá-nos crypt() e gen_salt(). No Supabase já vem instalado no
-- schema `extensions` (não no `public`), por isso não basta pedi-lo: as funções
-- abaixo têm de o procurar lá. Ver o search_path de cada uma.
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
  -- Fecha o acesso ao fim de dez tentativas falhadas numa hora. Desliga-se no
  -- painel, por galeria, para se poder testar uma entrega sem ficar trancado.
  lock_attempts boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Para bases criadas antes desta coluna existir.
alter table galleries add column if not exists lock_attempts boolean not null default true;

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
  -- 'serif' | 'sans' | 'label'. Ver COVER_FONTS no frontend.
  add column if not exists cover_font text not null default 'serif',
  -- 'white' | 'black' | 'none': qual dos logos aparece na capa.
  add column if not exists logo_variant text not null default 'white';

alter table photos
  -- Distingue foto de vídeo sem depender da extensão do nome do ficheiro.
  add column if not exists content_type text,
  -- Quando a fotografia foi tirada, lido do EXIF durante o upload. Permite
  -- ordenar a galeria pela ordem em que o dia aconteceu, em vez de por nomes de
  -- ficheiro que, com duas máquinas, não têm relação nenhuma entre si.
  add column if not exists taken_at timestamptz;

create index if not exists photos_gallery_idx on photos (gallery_id, sort_order);
create index if not exists galleries_slug_idx on galleries (slug);

-- A capa de uma galeria aponta para uma fotografia. Sem índice, apagar uma
-- fotografia obriga a percorrer todas as galerias à procura de quem a usa.
create index if not exists galleries_capa_idx on galleries (cover_photo_id);

-- Mantém updated_at fresco em qualquer alteração.
-- `set search_path` fixo: sem isto a função resolve os nomes pelo caminho de
-- quem a chama, e quem consegue criar um esquema seu à frente do public passa a
-- decidir que `now()` é executado. É o aviso de search_path mutável do linter.
create or replace function touch_updated_at() returns trigger
language plpgsql
set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists galleries_touch on galleries;
create trigger galleries_touch before update on galleries
  for each row execute function touch_updated_at();

-- ─── Quem é o admin ─────────────────────────────────────────────────────────
-- As políticas diziam "qualquer conta autenticada pode tudo". Isso só é seguro
-- enquanto ninguém conseguir criar conta: com o registo aberto, qualquer pessoa
-- fazia uma conta e ficava com acesso às galerias dos clientes. Uma definição
-- no painel não é sítio para guardar uma garantia dessas.
--
-- Passa a haver uma lista explícita. Quem não estiver nela está autenticado e
-- não é ninguém.

create table if not exists admins (
  -- Sem chave estrangeira para auth.users de propósito: uma linha órfã aqui é
  -- inofensiva, porque um id que já não existe nunca corresponde a ninguém, e
  -- evita que este script dependa de permissões sobre o esquema de autenticação.
  user_id uuid primary key,
  added_at timestamptz not null default now()
);

alter table admins enable row level security;
-- Sem políticas de propósito: ninguém lê esta tabela pelo PostgREST. Só a
-- função abaixo lá chega, e ela corre com as permissões de quem a criou.

create or replace function is_admin() returns boolean
language sql stable security definer
set search_path = public as $$
  select exists (select 1 from admins where user_id = auth.uid());
$$;

revoke all on function is_admin() from public, anon;
grant execute on function is_admin() to authenticated;

-- Semeia com as contas que já existem, que hoje são as vossas. Sem isto, correr
-- este script tirava o acesso ao painel a toda a gente, incluindo a vocês.
insert into admins (user_id) select id from auth.users on conflict do nothing;

-- ─── Row Level Security ─────────────────────────────────────────────────────
-- Ninguém anónimo lê estas tabelas. O cliente nunca fala com elas diretamente:
-- passa sempre pela Edge Function, que corre com a service role e só devolve
-- dados depois de validar a password.

alter table galleries enable row level security;
alter table photos enable row level security;

-- Uma política por tabela, e não duas.
--
-- Havia uma de leitura e outra de escrita, e a de escrita era `for all`, que
-- inclui a leitura. O Postgres avalia todas as políticas permissivas que se
-- apliquem, linha a linha, por isso cada leitura passava por duas verificações
-- que davam exactamente o mesmo resultado. É o aviso de políticas permissivas
-- múltiplas do linter do Supabase, e o desperdício cresce com o número de
-- linhas.
--
-- O `for all` sozinho faz o mesmo: quem está autenticado é o admin, e o admin
-- lê e escreve tudo.
drop policy if exists "admin lê galerias" on galleries;
drop policy if exists "admin escreve galerias" on galleries;
create policy "admin escreve galerias" on galleries
  for all to authenticated using ((select is_admin())) with check ((select is_admin()));

drop policy if exists "admin lê fotos" on photos;
drop policy if exists "admin escreve fotos" on photos;
create policy "admin escreve fotos" on photos
  for all to authenticated using ((select is_admin())) with check ((select is_admin()));

-- ─── Password ───────────────────────────────────────────────────────────────
-- Só o servidor faz hash e verificação. A app nunca recebe o hash: as políticas
-- acima dão select em galleries a utilizadores autenticados, por isso o admin
-- veria a coluna. A view abaixo é o que a app usa, sem o hash.

-- A verificação de admin lá dentro não é redundante com o `grant` abaixo.
--
-- Esta função corre com as permissões de quem a criou, ou seja passa por cima
-- do RLS da tabela: quem a conseguir chamar muda a password de qualquer
-- galeria. O `grant` dá-a a `authenticated`, e `authenticated` é qualquer conta
-- com sessão iniciada. É o aviso do linter sobre funções com privilégios
-- elevadas ao alcance de utilizadores com sessão, e tem razão.
--
-- Com o teste aqui dentro, mesmo que alguém consiga criar conta, chamar isto
-- dá-lhe um erro em vez do controlo das galerias.
create or replace function set_gallery_password(gallery_id uuid, new_password text)
returns void language plpgsql security definer
  set search_path = public, extensions as $$
begin
  if not is_admin() then
    raise exception 'sem permissão para definir a password desta galeria';
  end if;
  update galleries set password_hash = crypt(new_password, gen_salt('bf', 10))
  where id = gallery_id;
end $$;

revoke all on function set_gallery_password(uuid, text) from public, anon;
grant execute on function set_gallery_password(uuid, text) to authenticated;

-- `security_invoker = true` e não o comportamento por omissão do Postgres.
--
-- Sem isto, a view corre com as permissões de quem a criou e não com as de quem
-- a consulta, ou seja passa por cima do RLS da tabela galleries. E como o
-- PostgREST dá acesso por omissão ao que está em `public`, qualquer visitante
-- anónimo podia ler por aqui o que a política da tabela lhe nega: o nome, o
-- título e o código de todas as galerias de clientes. A password não, que essa
-- nem sequer está na view — mas os nomes dos clientes são dados deles, e o
-- código é metade do link privado que lhes mandámos.
--
-- Com `security_invoker`, a view volta a respeitar as políticas da tabela: o
-- admin autenticado lê tudo, como já lia, e o anónimo não lê nada. O revoke
-- abaixo é redundante com isso e fica na mesma, porque uma defesa que depende
-- de um único sinalizador é uma defesa a uma falha de distância.
drop view if exists galleries_admin;
create view galleries_admin with (security_invoker = true) as
  select id, slug, title, client_name, message, cover_path, cover_photo_id,
         cover_title, cover_font, logo_variant, published, download_enabled,
         lock_attempts, expires_at, created_at, updated_at
  from galleries;

revoke all on galleries_admin from anon;
grant select on galleries_admin to authenticated;

-- ─── Verificação de acesso do cliente ──────────────────────────────────────
-- Só a Edge Function (service role) pode chamar isto. Devolve a galeria apenas
-- se estiver publicada, dentro do prazo e a password bater certo. A comparação
-- é feita pelo crypt() do Postgres, e o hash nunca sai da base de dados.

create table if not exists access_attempts (
  id bigserial primary key,
  slug text not null,
  ok boolean not null,
  at timestamptz not null default now()
);

create index if not exists access_attempts_idx on access_attempts (slug, at desc);

-- RLS ligado e sem políticas nenhumas, de propósito: assim ninguém lê nem
-- escreve esta tabela pelo PostgREST, nem anónimo nem autenticado. Quem lhe
-- toca é a Edge Function, que corre com a service role e passa por cima do RLS.
-- O linter assinala isto como informação, não como problema, e é o que se quer.
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
  logo_variant text,
  -- Vai para o cliente para a galeria poder avisar até quando está disponível.
  expires_at timestamptz
) language plpgsql security definer
  set search_path = public, extensions as $$
declare
  recent_failures int;
  travar boolean;
  -- Falhas na última hora que fecham o acesso, mesmo com a password certa.
  -- A defesa a sério é o comprimento da password gerada; isto é o segundo
  -- cadeado, para quem anda a adivinhar desistir depressa.
  max_falhas constant int := 10;
begin
  /*
    O travão liga-se e desliga-se por galeria, no painel. Serve para testar
    uma entrega sem ficar fechado à décima tentativa.

    Um slug que não existe é tratado como se tivesse travão: senão, a
    diferença entre bloquear e não bloquear dizia a quem está do lado de fora
    se a galeria existe.
  */
  select g.lock_attempts into travar
  from galleries g where lower(g.slug) = lower(p_slug);

  if coalesce(travar, true) then
    select count(*) into recent_failures
    from access_attempts a
    where lower(a.slug) = lower(p_slug) and not a.ok and a.at > now() - interval '1 hour';

    if recent_failures >= max_falhas then
      insert into access_attempts (slug, ok) values (p_slug, false);
      return;
    end if;
  end if;

  return query
  select g.id, g.slug, g.title, g.client_name, g.message, g.download_enabled,
         g.cover_photo_id, g.cover_title, g.cover_font, g.logo_variant,
         g.expires_at
  from galleries g
  -- Comparação sem distinguir maiúsculas: o código chega em minúsculas do
  -- lado do cliente, e houve galerias gravadas com maiúsculas por o editor do
  -- painel não as limpar. Sem isto, uma galeria dessas recusava a password
  -- certa e não havia como a abrir sem mexer na base de dados.
  where lower(g.slug) = lower(p_slug)
    and g.published = true
    and (g.expires_at is null or g.expires_at > now())
    and g.password_hash = crypt(p_password, g.password_hash);

  insert into access_attempts (slug, ok) values (p_slug, found);
end $$;

revoke all on function verify_gallery_password(text, text) from public, anon, authenticated;
grant execute on function verify_gallery_password(text, text) to service_role;

-- ─── Registo de atividade ───────────────────────────────────────────────────
-- O que o cliente fez na galeria dele. Serve para o fotógrafo saber se a
-- entrega foi vista e descarregada, não para perfilar ninguém: guarda-se o
-- que aconteceu e quando, e mais nada.

create table if not exists gallery_events (
  id bigserial primary key,
  gallery_id uuid not null references galleries(id) on delete cascade,
  -- 'open' | 'download_all' | 'download_one' | 'download_favorites'
  kind text not null check (kind in ('open', 'download_all', 'download_one')),
  -- Nome legível do ficheiro, para o registo continuar a fazer sentido mesmo
  -- depois de a foto ser apagada.
  file_name text,
  photo_id uuid,
  at timestamptz not null default now()
);

create index if not exists gallery_events_idx on gallery_events (gallery_id, at desc);

-- O download só das escolhidas é posterior à criação da tabela: quem já correu
-- este ficheiro tem a restrição antiga, que recusaria o tipo novo. Recriá-la é
-- a forma de este ficheiro continuar a poder ser corrido de novo sem estragar
-- nada.
alter table gallery_events drop constraint if exists gallery_events_kind_check;
alter table gallery_events add constraint gallery_events_kind_check
  check (kind in ('open', 'download_all', 'download_one', 'download_favorites'));

alter table gallery_events enable row level security;

drop policy if exists "admin lê eventos" on gallery_events;
create policy "admin lê eventos" on gallery_events
  for select to authenticated using ((select is_admin()));

-- Ninguém escreve aqui a partir do browser: os eventos entram pela Edge
-- Function, que exige o comprovativo de acesso emitido depois da password.

-- ─── Favoritas do cliente ───────────────────────────────────────────────────
-- O cliente marca as fotografias que quer (para o álbum, para ampliar, para o
-- que for) e nós vemos a lista no painel. É a alternativa a receber por email
-- uma lista de nomes de ficheiro.
--
-- Não há utilizadores nas galerias: quem entrou com a password é "o cliente".
-- Por isso a marca é da galeria, não de uma pessoa: a chave primária impede a
-- mesma fotografia de ser marcada duas vezes.

create table if not exists gallery_favorites (
  gallery_id uuid not null references galleries(id) on delete cascade,
  photo_id uuid not null references photos(id) on delete cascade,
  at timestamptz not null default now(),
  primary key (gallery_id, photo_id)
);

create index if not exists gallery_favorites_idx on gallery_favorites (gallery_id);

-- Pela mesma razão: apagar uma fotografia procura as favoritas que lhe apontam.
create index if not exists gallery_favorites_foto_idx on gallery_favorites (photo_id);

alter table gallery_favorites enable row level security;

drop policy if exists "admin lê favoritas" on gallery_favorites;
create policy "admin lê favoritas" on gallery_favorites
  for select to authenticated using ((select is_admin()));

-- Tal como nos eventos, a escrita é exclusiva da Edge Function com o
-- comprovativo de acesso. Do browser, sem sessão, não se marca nada.

-- ─── Conteúdo do site ───────────────────────────────────────────────────────
-- Ao contrário das galerias de cliente, isto é público: o site lê-o sem estar
-- autenticado. Só o admin escreve.
--
-- As imagens do portfólio vivem num bucket R2 PÚBLICO (separado do privado das
-- galerias). Uma página pública não pode depender de URLs assinados, que
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
  -- Tipo do ficheiro. É por aqui que se sabe que é vídeo: a extensão no nome
  -- mente com facilidade, e o portfólio passa a aceitar os dois.
  content_type text,
  -- Recorte da miniatura: um `object-position` de CSS, "50% 50%" ao centro.
  -- Na grelha do site a fotografia é cortada para caber, e o que interessa
  -- raramente está no meio, e uma cara a dois terços da altura desaparecia.
  pos text not null default '50% 50%',
  sort_order int not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

-- Para bases criadas antes desta coluna existir: o `create table if not exists`
-- acima não toca numa tabela que já exista, por isso a coluna entra aqui.
alter table site_photos add column if not exists pos text not null default '50% 50%';
alter table site_photos add column if not exists content_type text;


create index if not exists site_photos_idx on site_photos (sort_order);

-- Índice na chave estrangeira. Sem ele, apagar uma categoria obriga o Postgres
-- a percorrer a tabela toda das fotografias para ver quais lhe apontam.
create index if not exists site_photos_categoria_idx on site_photos (category_id);

-- Testemunhos de clientes. Escritos à mão no painel a partir do que os clientes
-- nos enviam. Não há recolha automática, e é de propósito: um testemunho que
-- ninguém verificou vale menos do que nenhum.
create table if not exists site_testimonials (
  id uuid primary key default gen_random_uuid(),
  -- Quem assina. Nomes próprios chegam ("Ana & Miguel").
  author text not null,
  -- Contexto: "Casamento na Quinta do Sanguinhal, setembro de 2026".
  context text not null default '',
  quote text not null,
  sort_order int not null default 0,
  -- Permite preparar um testemunho e só o mostrar quando o cliente autorizar.
  published boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists site_testimonials_idx on site_testimonials (sort_order);

alter table site_categories enable row level security;
alter table site_photos enable row level security;
alter table site_testimonials enable row level security;

-- Leitura pública: é isto que o site mostra a quem o visita.
-- Leitura pública só para o `anon`, e não também para o `authenticated`.
--
-- Quem está autenticado é o admin, e já lê por via da política de escrita, que
-- é `for all`. Ter as duas a aplicar-se a ele fazia cada leitura do painel
-- passar por duas verificações com o mesmo resultado — o aviso de políticas
-- permissivas múltiplas.
--
-- E há uma diferença que importa: as políticas públicas de fotos e testemunhos
-- filtram por `published`, a de escrita não. É a de escrita que dá ao painel a
-- visão do que ainda não está publicado, e é isso que ele precisa de mostrar.
drop policy if exists "todos leem categorias" on site_categories;
create policy "todos leem categorias" on site_categories
  for select to anon using (true);

drop policy if exists "todos leem fotos do site" on site_photos;
create policy "todos leem fotos do site" on site_photos
  for select to anon using (published);

drop policy if exists "todos leem testemunhos" on site_testimonials;
create policy "todos leem testemunhos" on site_testimonials
  for select to anon using (published);

-- Escrita só para quem fez login no painel.
drop policy if exists "admin escreve categorias" on site_categories;
create policy "admin escreve categorias" on site_categories
  for all to authenticated using ((select is_admin())) with check ((select is_admin()));

drop policy if exists "admin escreve fotos do site" on site_photos;
create policy "admin escreve fotos do site" on site_photos
  for all to authenticated using ((select is_admin())) with check ((select is_admin()));

-- Capa de cada serviço na página de serviços.
--
-- Uma linha por serviço, com o serviço a servir de chave: são quatro, são
-- fixos, e são nomeados no código. Uma tabela com id próprio e uma coluna a
-- dizer a que serviço pertence permitiria duas capas para o mesmo serviço, e
-- depois havia que escolher uma. Assim é impossível por construção.
--
-- Sem linha, a página usa a fotografia que vem no repositório. Mudar a capa é
-- acrescentar uma linha; repor a original é apagá-la.
create table if not exists site_service_covers (
  -- 'casamentos', 'maternidade', 'retratos', 'eventos', e ainda 'hero' para a
  -- fotografia de entrada da página inicial. Ver src/lib/servicosCapas.ts.
  --
  -- O 'hero' não é um serviço e o nome da tabela fica a dever-lhe. Entrou aqui
  -- em vez de numa tabela própria porque é exactamente o mesmo problema — uma
  -- fotografia do site que se troca no painel — e uma segunda tabela com as
  -- mesmas quatro colunas e as mesmas duas políticas era duplicação a fingir
  -- de arrumação.
  service_id text primary key,
  -- Chave no bucket público, como em site_photos.
  storage_key text not null,
  alt text not null default '',
  -- Recorte, um `object-position` do CSS. A capa é cortada para caber em 3:4 e
  -- o que interessa raramente está ao centro.
  pos text not null default '50% 50%',
  updated_at timestamptz not null default now()
);

alter table site_service_covers enable row level security;

drop policy if exists "todos leem capas dos servicos" on site_service_covers;
create policy "todos leem capas dos servicos" on site_service_covers
  for select to anon using (true);

drop policy if exists "admin escreve capas dos servicos" on site_service_covers;
create policy "admin escreve capas dos servicos" on site_service_covers
  for all to authenticated using ((select is_admin())) with check ((select is_admin()));

drop policy if exists "admin escreve testemunhos" on site_testimonials;
create policy "admin escreve testemunhos" on site_testimonials
  for all to authenticated using ((select is_admin())) with check ((select is_admin()));

-- Categorias de arranque, iguais às que o site já mostra.
insert into site_categories (slug, label, sort_order) values
  ('casamentos', 'Casamentos', 1),
  ('maternidade', 'Maternidade', 2),
  ('eventos', 'Eventos', 3)
on conflict (slug) do nothing;

-- ─── Storage ────────────────────────────────────────────────────────────────
-- As fotografias NÃO vivem no Supabase: vivem num bucket privado do
-- Cloudflare R2, que tem 10 GB gratuitos e não cobra tráfego de saída, e o
-- tráfego é o custo real quando o produto é clientes a descarregar galerias.
--
-- O Supabase fica com a base de dados, a autenticação e as Edge Functions,
-- que cabem de sobra no plano gratuito. Não há bucket nem políticas de storage
-- para criar aqui; o acesso ao R2 é feito com URLs pré-assinados emitidos pelas
-- funções, com as credenciais guardadas nos secrets.
--
-- As colunas storage_path e thumb_path guardam a chave do objeto no R2.
