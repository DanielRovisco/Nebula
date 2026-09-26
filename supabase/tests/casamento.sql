-- Testes dos dois caminhos que abrem ao público no dia do casamento: a galeria
-- dos convidados e a mostra da estação de impressão.
--
--   psql -d nebula_test -f supabase/tests/scaffold.sql
--   psql -d nebula_test -f supabase/schema.sql
--   psql -d nebula_test -f supabase/tests/casamento.sql
--
-- Todos devem dizer SIM.
--
-- O security.sql ao lado trata das galerias de cliente, que têm password. Estas
-- duas não têm: quem entra é um convidado sem conta, a partir de um código QR
-- em cima de uma mesa. O que as protege são as regras aqui em baixo, e por isso
-- é que elas têm de ser verificadas e não assumidas.

\pset format unaligned
\pset tuples_only on

-- ── Duas contas: a nossa e a de outra pessoa qualquer ────────────────────────
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111','nos@teste.pt'),
  ('22222222-2222-2222-2222-222222222222','outro@teste.pt')
  on conflict (id) do nothing;
insert into admins (user_id) values ('11111111-1111-1111-1111-111111111111')
  on conflict do nothing;

-- Repetível: limpa o que uma corrida anterior deixou.
delete from events where slug in ('casamento-teste','casamento-outro');
delete from print_galleries where slug in ('mostra-teste','mostra-outra');

set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

insert into events (slug, couple_name, event_date, upload_window_ends_at, owner_id)
values ('casamento-teste','Ana & Tiago', current_date, now() + interval '12 hours',
        '11111111-1111-1111-1111-111111111111');
insert into events (slug, couple_name, event_date, upload_window_ends_at, owner_id)
values ('casamento-outro','Outros', current_date, now() + interval '12 hours',
        '22222222-2222-2222-2222-222222222222');

-- ═══ A galeria dos convidados ════════════════════════════════════════════════

-- O convidado não tem conta: quem fala com estas tabelas é sempre a Edge
-- Function, com a chave de serviço. O papel anónimo não pode chegar-lhes.
select '1. anon nao le eventos: ' ||
  case when has_table_privilege('anon','events','select') = false
       then 'SIM' else 'NAO' end;

select '2. anon nao le fotografias de convidados: ' ||
  case when has_table_privilege('anon','event_media','select') = false
       then 'SIM' else 'NAO' end;

select '3. RLS ligado nas duas tabelas: ' ||
  case when (select bool_and(relrowsecurity) from pg_class
             where relname in ('events','event_media')) then 'SIM' else 'NAO' end;

-- O slug está impresso nas mesas: não muda nunca.
do $$
begin
  update events set slug = 'outro-endereco' where slug = 'casamento-teste';
  raise notice 'FALHOU: o slug mudou';
exception when check_violation then null;
end $$;
select '4. o endereco do evento nao muda: ' ||
  case when exists (select 1 from events where slug='casamento-teste')
       then 'SIM' else 'NAO' end;

-- Duas fotografias do mesmo convidado.
insert into event_media (event_id, kind, storage_key, size_bytes, uploader_key, client_id)
select id, 'foto', 'eventos/x/1.jpg', 1000, 'abc123', 'envio-1' from events where slug='casamento-teste';
insert into event_media (event_id, kind, storage_key, size_bytes, uploader_key, client_id)
select id, 'foto', 'eventos/x/2.jpg', 2500, 'abc123', 'envio-2' from events where slug='casamento-teste';

select '5. o total ocupado sobe com os envios: ' ||
  case when (select bytes_used from events where slug='casamento-teste') = 3500
       then 'SIM' else 'NAO (' || (select bytes_used from events where slug='casamento-teste') || ')' end;

-- O mesmo envio registado duas vezes é o caso da rede que piscou.
do $$
begin
  insert into event_media (event_id, kind, storage_key, size_bytes, client_id)
  select id, 'foto', 'eventos/x/1.jpg', 1000, 'envio-1' from events where slug='casamento-teste';
  raise notice 'FALHOU: o mesmo envio entrou duas vezes';
exception when unique_violation then null;
end $$;
select '6. o mesmo envio nao entra duas vezes: ' ||
  case when (select count(*) from event_media m join events e on e.id=m.event_id
             where e.slug='casamento-teste') = 2 then 'SIM' else 'NAO' end;

-- Fotografias antigas não têm client_id: várias nulas têm de caber.
insert into event_media (event_id, kind, storage_key, size_bytes)
select id, 'foto', 'eventos/x/3.jpg', 10 from events where slug='casamento-teste';
insert into event_media (event_id, kind, storage_key, size_bytes)
select id, 'foto', 'eventos/x/4.jpg', 10 from events where slug='casamento-teste';
select '7. envios sem identificador nao colidem: ' ||
  case when (select count(*) from event_media m join events e on e.id=m.event_id
             where e.slug='casamento-teste') = 4 then 'SIM' else 'NAO' end;

-- Uma fotografia não muda de casamento.
do $$
declare outro uuid;
begin
  select id into outro from events where slug='casamento-outro';
  update event_media set event_id = outro
   where storage_key = 'eventos/x/1.jpg';
  raise notice 'FALHOU: a fotografia mudou de casamento';
exception when check_violation then null;
end $$;
select '8. a fotografia nao muda de casamento: ' ||
  case when (select count(*) from event_media m join events e on e.id=m.event_id
             where e.slug='casamento-outro') = 0 then 'SIM' else 'NAO' end;

-- Um estado escrito à mão fora dos três não entra: a Edge Function decide entre
-- 'pendente' e 'aprovado', e o painel entre 'aprovado' e 'escondido'.
do $$
begin
  update event_media set status = 'publico' where storage_key='eventos/x/1.jpg';
  raise notice 'FALHOU: aceitou um estado inventado';
exception when check_violation then null;
end $$;
select '9. o estado so aceita os tres valores: ' ||
  case when (select status from event_media where storage_key='eventos/x/1.jpg') = 'aprovado'
       then 'SIM' else 'NAO' end;

-- Apagar marca, não apaga: a linha fica e some da vista.
update event_media set deleted_at = now() where storage_key='eventos/x/3.jpg';
select '10. apagar e marcar, a linha fica: ' ||
  case when (select count(*) from event_media where storage_key='eventos/x/3.jpg') = 1
       then 'SIM' else 'NAO' end;

-- Apagar a sério devolve os bytes.
delete from event_media where storage_key='eventos/x/2.jpg';
select '11. apagar devolve os bytes: ' ||
  case when (select bytes_used from events where slug='casamento-teste') = 1020
       then 'SIM' else 'NAO (' || (select bytes_used from events where slug='casamento-teste') || ')' end;

select '12. cada evento tem o seu segredo de download: ' ||
  case when (select count(distinct download_token) from events
              where slug in ('casamento-teste','casamento-outro')) = 2
        and (select bool_and(length(download_token) = 48) from events) then 'SIM' else 'NAO' end;

-- ═══ A mostra da estação de impressão ════════════════════════════════════════

insert into print_galleries (slug, name, event_date, owner_id)
values ('mostra-teste','Ana & Tiago', current_date, '11111111-1111-1111-1111-111111111111');
insert into print_galleries (slug, name, event_date, owner_id)
values ('mostra-outra','Outros', current_date, '22222222-2222-2222-2222-222222222222');

select '13. mostra sem hora de fim esta aberta: ' ||
  case when (select expires_at is null from print_galleries where slug='mostra-teste')
       then 'SIM' else 'NAO' end;

-- Os ficheiros chegam com nome numerado: 1, 2, 10.
insert into print_photos (gallery_id, numero, storage_key, thumb_key)
select id, mostra_numero(id, 1), 'm/1.webp','m/1t.webp' from print_galleries where slug='mostra-teste';
insert into print_photos (gallery_id, numero, storage_key, thumb_key)
select id, mostra_numero(id, 2), 'm/2.webp','m/2t.webp' from print_galleries where slug='mostra-teste';
insert into print_photos (gallery_id, numero, storage_key, thumb_key)
select id, mostra_numero(id, 10), 'm/10.webp','m/10t.webp' from print_galleries where slug='mostra-teste';

select '14. o numero do nome do ficheiro e respeitado: ' ||
  case when (select array_agg(numero order by numero) from print_photos p
             join print_galleries g on g.id=p.gallery_id where g.slug='mostra-teste')
            = '{1,2,10}'::int[] then 'SIM' else 'NAO' end;

-- Um número repetido é recusado com uma frase que se percebe.
do $$
declare g uuid; n int;
begin
  select id into g from print_galleries where slug='mostra-teste';
  n := mostra_numero(g, 2);
  raise notice 'FALHOU: deu o numero 2 outra vez';
exception when unique_violation then null;
end $$;
select '15. numero repetido e recusado: ' ||
  case when (select count(*) from print_photos p join print_galleries g on g.id=p.gallery_id
             where g.slug='mostra-teste') = 3 then 'SIM' else 'NAO' end;

-- Um lote sem nomes numerados continua a seguir ao maior que lá está.
insert into print_photos (gallery_id, numero, storage_key, thumb_key)
select id, mostra_numero(id), 'm/a.webp','m/at.webp' from print_galleries where slug='mostra-teste';
select '16. o automatico salta os ja usados: ' ||
  case when (select max(numero) from print_photos p join print_galleries g on g.id=p.gallery_id
             where g.slug='mostra-teste') = 11 then 'SIM' else 'NAO' end;

-- Apagar a última não faz o contador recuar: a 11 não volta a sair.
delete from print_photos where storage_key='m/a.webp';
insert into print_photos (gallery_id, numero, storage_key, thumb_key)
select id, mostra_numero(id), 'm/b.webp','m/bt.webp' from print_galleries where slug='mostra-teste';
select '17. o contador nunca recua: ' ||
  case when (select numero from print_photos where storage_key='m/b.webp') = 12
       then 'SIM' else 'NAO (' || (select numero from print_photos where storage_key='m/b.webp') || ')' end;

-- O número está no ecrã de quem o vai dizer em voz alta: não muda.
do $$
begin
  update print_photos set numero = 99 where storage_key='m/1.webp';
  raise notice 'FALHOU: o numero mudou';
exception when check_violation then null;
end $$;
select '18. o numero nao muda depois de atribuido: ' ||
  case when (select numero from print_photos where storage_key='m/1.webp') = 1
       then 'SIM' else 'NAO' end;

-- A mostra de outra pessoa não existe para nós.
do $$
declare g uuid; n int;
begin
  select id into g from print_galleries where slug='mostra-outra';
  n := mostra_numero(g, 1);
  raise notice 'FALHOU: numerou a mostra de outro dono';
exception when no_data_found then null;
end $$;
select '19. nao se numera a mostra de outro dono: ' ||
  case when (select count(*) from print_photos p join print_galleries g on g.id=p.gallery_id
             where g.slug='mostra-outra') = 0 then 'SIM' else 'NAO' end;

do $$
begin
  update print_galleries set slug='outro' where slug='mostra-teste';
  raise notice 'FALHOU: o endereco da mostra mudou';
exception when check_violation then null;
end $$;
select '20. o endereco da mostra nao muda: ' ||
  case when exists (select 1 from print_galleries where slug='mostra-teste')
       then 'SIM' else 'NAO' end;

-- Prolongar a meio da festa tem de ser possível.
update print_galleries set expires_at = now() + interval '3 hours' where slug='mostra-teste';
select '21. a hora de fim pode mudar: ' ||
  case when (select expires_at is not null from print_galleries where slug='mostra-teste')
       then 'SIM' else 'NAO' end;

select '22. RLS ligado nas duas tabelas da mostra: ' ||
  case when (select bool_and(relrowsecurity) from pg_class
             where relname in ('print_galleries','print_photos')) then 'SIM' else 'NAO' end;

select '23. anon nao le a mostra nem as fotografias: ' ||
  case when (select has_table_privilege('anon','print_galleries','select')) = false
        and (select has_table_privilege('anon','print_photos','select')) = false
       then 'SIM' else 'NAO' end;

select '24. anon nao pode numerar: ' ||
  case when (select has_function_privilege('anon','mostra_numero(uuid,int)','execute')) = false
       then 'SIM' else 'NAO' end;

-- Apagar a mostra leva as fotografias atrás.
delete from print_galleries where slug='mostra-teste';
select '25. apagar a mostra apaga as fotografias: ' ||
  case when (select count(*) from print_photos p
             where not exists (select 1 from print_galleries g where g.id=p.gallery_id)) = 0
       then 'SIM' else 'NAO' end;

-- Apagar o evento leva as fotografias atrás.
delete from events where slug='casamento-teste';
select '26. apagar o evento apaga as fotografias: ' ||
  case when (select count(*) from event_media m
             where not exists (select 1 from events e where e.id=m.event_id)) = 0
       then 'SIM' else 'NAO' end;

delete from events where slug='casamento-outro';
delete from print_galleries where slug='mostra-outra';
