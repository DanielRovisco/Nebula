-- Testes de comportamento do schema.sql. Correr depois do scaffold.sql:
--   psql -d nebula_test -f supabase/tests/security.sql
-- Todos devem dizer SIM.

\set ON_ERROR_STOP on
\pset format unaligned
\pset tuples_only on

-- ── Uma conta nossa, com direitos de administrador ───────────────────────────
--
-- Isto faltava, e os testes deixaram de correr sem ninguém dar por isso: o
-- `set_gallery_password` passou a exigir que quem o chama seja administrador, e
-- a partir daí o ficheiro rebentava na primeira linha. Ficou assim meses, porque
-- nada no CI os corria. A lição está no runner (scripts/testar-sql.sh), que
-- agora falha quando um teste diz NAO ou quando nenhum diz nada.
insert into auth.users (id, email)
values ('11111111-1111-1111-1111-111111111111','nos@teste.pt')
  on conflict (id) do nothing;
insert into admins (user_id) values ('11111111-1111-1111-1111-111111111111')
  on conflict do nothing;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

-- Repetível: limpa o que uma corrida anterior tenha deixado.
delete from galleries where slug in ('teste','teste2');
delete from access_attempts where slug in ('teste','teste2');

-- Galeria de teste, publicada, sem prazo
insert into galleries (slug, title, password_hash, published)
values ('teste', 'Teste', 'pending', true);

select set_gallery_password((select id from galleries where slug='teste'), 'segredo-1234');

select '1. hash guardado é bcrypt: ' ||
  case when (select password_hash from galleries where slug='teste') like '$2%'
       then 'SIM' else 'NAO (' || (select password_hash from galleries where slug='teste') || ')' end;

select '2. password em claro NAO está na tabela: ' ||
  case when (select count(*) from galleries where password_hash = 'segredo-1234') = 0
       then 'SIM' else 'NAO' end;

select '3. password certa devolve a galeria: ' ||
  case when (select count(*) from verify_gallery_password('teste','segredo-1234')) = 1
       then 'SIM' else 'NAO' end;

select '4. password errada nao devolve nada: ' ||
  case when (select count(*) from verify_gallery_password('teste','errada')) = 0
       then 'SIM' else 'NAO' end;

select '5. slug inexistente nao devolve nada: ' ||
  case when (select count(*) from verify_gallery_password('nao-existe','segredo-1234')) = 0
       then 'SIM' else 'NAO' end;

-- Em rascunho não abre nem com a password certa
update galleries set published = false where slug='teste';
select '6. rascunho recusa a password certa: ' ||
  case when (select count(*) from verify_gallery_password('teste','segredo-1234')) = 0
       then 'SIM' else 'NAO' end;

-- Expirada não abre
update galleries set published = true, expires_at = now() - interval '1 day' where slug='teste';
select '7. expirada recusa a password certa: ' ||
  case when (select count(*) from verify_gallery_password('teste','segredo-1234')) = 0
       then 'SIM' else 'NAO' end;

-- Prazo no futuro volta a abrir
update galleries set expires_at = now() + interval '1 day' where slug='teste';
select '8. prazo futuro volta a abrir: ' ||
  case when (select count(*) from verify_gallery_password('teste','segredo-1234')) = 1
       then 'SIM' else 'NAO' end;

-- Bloqueio por tentativas: 10 falhas na última hora fecham o acesso
delete from access_attempts;
select verify_gallery_password('teste','errada') from generate_series(1,10);
select '9. apos 10 falhas bloqueia mesmo com password certa: ' ||
  case when (select count(*) from verify_gallery_password('teste','segredo-1234')) = 0
       then 'SIM' else 'NAO' end;

-- Passada a hora, volta a abrir
update access_attempts set at = now() - interval '2 hours';
select '10. passada a hora desbloqueia: ' ||
  case when (select count(*) from verify_gallery_password('teste','segredo-1234')) = 1
       then 'SIM' else 'NAO' end;

-- Trocar a password invalida a antiga
select set_gallery_password((select id from galleries where slug='teste'), 'nova-5678');
delete from access_attempts;
select '11. password antiga deixa de servir: ' ||
  case when (select count(*) from verify_gallery_password('teste','segredo-1234')) = 0
       then 'SIM' else 'NAO' end;
select '12. password nova funciona: ' ||
  case when (select count(*) from verify_gallery_password('teste','nova-5678')) = 1
       then 'SIM' else 'NAO' end;

-- Duas galerias com a mesma password têm hashes diferentes (salt por galeria)
insert into galleries (slug,title,password_hash,published) values ('teste2','Teste 2','pending',true);
select set_gallery_password((select id from galleries where slug='teste2'), 'nova-5678');
select '13. mesma password gera hashes diferentes: ' ||
  case when (select password_hash from galleries where slug='teste')
          <> (select password_hash from galleries where slug='teste2')
       then 'SIM' else 'NAO' end;

-- A view do admin não expõe o hash
select '14. galleries_admin nao expoe o hash: ' ||
  case when (select count(*) from information_schema.columns
             where table_name='galleries_admin' and column_name='password_hash') = 0
       then 'SIM' else 'NAO' end;

-- Apagar a galeria leva as fotos atrás (cascade)
insert into photos (gallery_id, storage_path, file_name)
values ((select id from galleries where slug='teste2'), 'x/y.jpg', 'y.jpg');
delete from galleries where slug='teste2';
select '15. apagar galeria apaga as fotos: ' ||
  case when (select count(*) from photos) = 0 then 'SIM' else 'NAO' end;

-- O papel anon não pode chamar a verificação
select '16. anon nao pode executar verify_gallery_password: ' ||
  case when has_function_privilege('anon','verify_gallery_password(text,text)','execute')
       then 'NAO' else 'SIM' end;
select '17. service_role pode executar: ' ||
  case when has_function_privilege('service_role','verify_gallery_password(text,text)','execute')
       then 'SIM' else 'NAO' end;
select '18. anon nao pode mudar passwords: ' ||
  case when has_function_privilege('anon','set_gallery_password(uuid,text)','execute')
       then 'NAO' else 'SIM' end;

-- RLS ligado nas duas tabelas
select '19. RLS ligado em galleries e photos: ' ||
  case when (select bool_and(relrowsecurity) from pg_class
             where relname in ('galleries','photos')) then 'SIM' else 'NAO' end;

-- ═══ Arrumar a galeria: ordenar pela data e numerar ══════════════════════════

delete from galleries where slug = 'arrumar';
insert into galleries (slug, title, password_hash, published)
values ('arrumar', 'Arrumar', 'x', false);

-- Três fotografias fora de ordem, com nomes de máquina e extensões diferentes.
-- A do meio é a mais antiga, para a ordenação ter de fazer alguma coisa.
insert into photos (gallery_id, storage_path, file_name, taken_at, sort_order)
select g.id, 'p/' || n.nome, n.nome, n.quando, n.ordem
  from galleries g,
       (values ('DSC_4821.JPG', '2026-06-01 15:00+00'::timestamptz, 0),
               ('IMG_0032.HEIC','2026-06-01 09:00+00'::timestamptz, 1),
               ('MVI_7.mp4',    '2026-06-01 18:00+00'::timestamptz, 2)
       ) as n(nome, quando, ordem)
 where g.slug = 'arrumar';

select '20. arrumar mexe nas tres fotografias: ' ||
  case when arrumar_galeria((select id from galleries where slug='arrumar')) = 3
       then 'SIM' else 'NAO' end;

select '21. ordena pela hora em que foi tirada: ' ||
  case when (select string_agg(storage_path, ' ' order by sort_order)
               from photos where gallery_id = (select id from galleries where slug='arrumar'))
            = 'p/IMG_0032.HEIC p/DSC_4821.JPG p/MVI_7.mp4'
       then 'SIM' else 'NAO' end;

select '22. numera de um a tres e guarda a extensao: ' ||
  case when (select string_agg(file_name, ' ' order by sort_order)
               from photos where gallery_id = (select id from galleries where slug='arrumar'))
            = 'Nebula1.heic Nebula2.jpg Nebula3.mp4'
       then 'SIM' else 'NAO (' || (select string_agg(file_name, ' ' order by sort_order)
               from photos where gallery_id = (select id from galleries where slug='arrumar')) || ')' end;

-- Chamar a função e ler o resultado têm de ser comandos separados: dentro do
-- mesmo comando, o `select` ao lado da chamada lê a fotografia do instante em
-- que o comando começou e não vê o que a função acabou de escrever. Com os dois
-- juntos, este teste passava sem verificar nada.
select arrumar_galeria((select id from galleries where slug='arrumar'));
select '23. correr outra vez da o mesmo: ' ||
  case when (select string_agg(file_name, ' ' order by sort_order)
               from photos where gallery_id = (select id from galleries where slug='arrumar'))
            = 'Nebula1.heic Nebula2.jpg Nebula3.mp4'
       then 'SIM' else 'NAO' end;

select '24. o caminho no armazenamento nao muda: ' ||
  case when (select count(*) from photos
              where gallery_id = (select id from galleries where slug='arrumar')
                and storage_path like 'p/%') = 3
       then 'SIM' else 'NAO' end;

-- Sem datas: mantém-se a ordem que já lá estava e só se numera.
delete from photos where gallery_id = (select id from galleries where slug='arrumar');
insert into photos (gallery_id, storage_path, file_name, taken_at, sort_order)
select g.id, 'q/' || n.nome, n.nome, null, n.ordem
  from galleries g,
       (values ('zz.jpg', 0), ('aa.jpg', 1)) as n(nome, ordem)
 where g.slug = 'arrumar';

select '25. sem datas mantem a ordem escolhida a mao: ' ||
  case when (select arrumar_galeria((select id from galleries where slug='arrumar'))) = 2
        and (select string_agg(storage_path, ' ' order by sort_order)
               from photos where gallery_id = (select id from galleries where slug='arrumar'))
            = 'q/zz.jpg q/aa.jpg'
       then 'SIM' else 'NAO' end;

-- ═══ E o caminho de volta ════════════════════════════════════════════════════

-- Repete-se o cenário das datas, para se poder desfazer o que ele fez.
delete from photos where gallery_id = (select id from galleries where slug='arrumar');
insert into photos (gallery_id, storage_path, file_name, taken_at, sort_order, created_at)
select g.id, 'p/' || n.nome, n.nome, n.quando, n.ordem, n.entrou
  from galleries g,
       (values ('DSC_4821.JPG', '2026-06-01 15:00+00'::timestamptz, 0, '2026-06-02 10:00+00'::timestamptz),
               ('IMG_0032.HEIC','2026-06-01 09:00+00'::timestamptz, 1, '2026-06-02 10:01+00'::timestamptz),
               ('MVI_7.mp4',    '2026-06-01 18:00+00'::timestamptz, 2, '2026-06-02 10:02+00'::timestamptz)
       ) as n(nome, quando, ordem, entrou)
 where g.slug = 'arrumar';

select arrumar_galeria((select id from galleries where slug='arrumar'));

select '27. arrumar guarda o nome de origem: ' ||
  case when (select string_agg(original_name, ' ' order by sort_order)
               from photos where gallery_id = (select id from galleries where slug='arrumar'))
            = 'IMG_0032.HEIC DSC_4821.JPG MVI_7.mp4'
       then 'SIM' else 'NAO' end;

select '28. arrumar marca a galeria como por data: ' ||
  case when (select ordem from galleries where slug='arrumar') = 'data'
       then 'SIM' else 'NAO' end;

select repor_galeria((select id from galleries where slug='arrumar'));
select '29. repor devolve os nomes de origem e a ordem do upload: ' ||
  case when (select string_agg(file_name, ' ' order by sort_order)
               from photos where gallery_id = (select id from galleries where slug='arrumar'))
            = 'DSC_4821.JPG IMG_0032.HEIC MVI_7.mp4'
       then 'SIM' else 'NAO (' || (select string_agg(file_name, ' ' order by sort_order)
               from photos where gallery_id = (select id from galleries where slug='arrumar')) || ')' end;

select '30. repor marca a galeria como de origem: ' ||
  case when (select ordem from galleries where slug='arrumar') = 'origem'
       then 'SIM' else 'NAO' end;

select arrumar_galeria((select id from galleries where slug='arrumar'));
select '31. arrumar outra vez volta a numerar: ' ||
  case when (select string_agg(file_name, ' ' order by sort_order)
               from photos where gallery_id = (select id from galleries where slug='arrumar'))
            = 'Nebula1.heic Nebula2.jpg Nebula3.mp4'
       then 'SIM' else 'NAO' end;

-- Sem nome de origem guardado (fotografias anteriores a isto existir), o nome
-- resgata-se do caminho no armazenamento.
update photos set original_name = null, file_name = 'Nebula9.jpg',
       storage_path = (select id::text from galleries where slug='arrumar')
                      || '/1750000000000-ab12cd34-Primeiro_beijo.mp4'
 where gallery_id = (select id from galleries where slug='arrumar')
   and sort_order = 0;

select repor_galeria((select id from galleries where slug='arrumar'));
select '32. sem nome guardado, resgata-o do caminho: ' ||
  case when (select count(*) from photos
              where gallery_id = (select id from galleries where slug='arrumar')
                and file_name = 'Primeiro_beijo.mp4') = 1
       then 'SIM' else 'NAO' end;

select '33. anon nao pode repor: ' ||
  case when has_function_privilege('anon', 'repor_galeria(uuid)', 'EXECUTE')
       then 'NAO' else 'SIM' end;

select '26. anon nao pode arrumar: ' ||
  case when has_function_privilege('anon', 'arrumar_galeria(uuid, text)', 'EXECUTE')
       then 'NAO' else 'SIM' end;

-- ═══ Histórias: o que é público e o que não é ════════════════════════════════
--
-- A regra que interessa é a dos blocos. Uma história por publicar não se lê, e
-- os blocos dela também não: sem isso, bastava pedir a tabela dos blocos para
-- ler uma história que ainda estamos a escrever.
--
-- Testa-se com o papel trocado e não só com as permissões da tabela, porque o
-- que está em causa é a política e não o `grant`: a política é que distingue a
-- história publicada da que não está.

delete from site_stories where slug in ('publicada','escondida');
insert into site_stories (slug, title, published) values
  ('publicada', 'Publicada', true),
  ('escondida', 'Escondida', false);
insert into site_story_blocks (story_id, kind, texto, sort_order)
select id, 'texto', 'olá', 0 from site_stories where slug in ('publicada','escondida');

grant select on site_stories, site_story_blocks to anon;

set role anon;
select '34. anon le a historia publicada: ' ||
  case when (select count(*) from site_stories where slug='publicada') = 1
       then 'SIM' else 'NAO' end;

select '35. anon nao le a historia por publicar: ' ||
  case when (select count(*) from site_stories where slug='escondida') = 0
       then 'SIM' else 'NAO' end;

select '36. anon le os blocos da publicada: ' ||
  case when (select count(*) from site_story_blocks) = 1
       then 'SIM' else 'NAO' end;

select '37. anon nao escreve historias: ' ||
  case when (select has_table_privilege('anon','site_stories','insert')) = false
       then 'SIM' else 'NAO' end;
reset role;

-- Apagar a história leva os blocos atrás, senão ficavam linhas órfãs a apontar
-- para nada e fotografias no bucket sem ninguém que as reclame.
delete from site_stories where slug='publicada';
select '38. apagar a historia apaga os blocos: ' ||
  case when (select count(*) from site_story_blocks b
             where not exists (select 1 from site_stories h where h.id=b.story_id)) = 0
       then 'SIM' else 'NAO' end;

delete from site_stories where slug in ('publicada','escondida');

-- Não deixar lixo para trás.
delete from galleries where slug = 'arrumar';
delete from galleries where slug in ('teste','teste2');
delete from access_attempts where slug in ('teste','teste2');
