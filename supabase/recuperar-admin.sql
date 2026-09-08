-- Socorro: recuperar o acesso ao painel.
--
-- Correr no SQL Editor do Supabase. Só é preciso se, depois de aplicar o
-- schema.sql, o painel deixar de mostrar galerias ou der erro a gravar.
--
-- O que aconteceu nesse caso: as políticas passaram a exigir que a conta esteja
-- na tabela `admins`, e a vossa não ficou lá. O `insert` do schema semeia-a a
-- partir das contas que já existem, mas se a conta tiver sido criada depois de
-- correr o schema, ela não foi apanhada.

-- 1. Ver quem tem conta e quem é admin.
select
  u.id,
  u.email,
  u.created_at,
  (a.user_id is not null) as e_admin
from auth.users u
left join admins a on a.user_id = u.id
order by u.created_at;

-- 2. Dar acesso a todas as contas que existem.
--
-- Só faz sentido enquanto as contas forem vossas. Se algum dia houver contas de
-- outra gente, usar antes a linha comentada em baixo, com o email certo.
insert into admins (user_id)
select id from auth.users
on conflict do nothing;

-- insert into admins (user_id)
-- select id from auth.users where email = 'escrever-aqui@exemplo.pt'
-- on conflict do nothing;

-- 3. Tirar o acesso a uma conta, se for preciso.
-- delete from admins where user_id = (
--   select id from auth.users where email = 'escrever-aqui@exemplo.pt'
-- );

-- 4. Confirmar que ficou.
select u.email from admins a join auth.users u on u.id = a.user_id;
