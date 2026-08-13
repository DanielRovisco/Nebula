-- Testes de comportamento do schema.sql. Correr depois do scaffold.sql:
--   psql -d nebula_test -f supabase/tests/security.sql
-- Todos devem dizer SIM.

\set ON_ERROR_STOP on
\pset format unaligned
\pset tuples_only on

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

-- Não deixar lixo para trás.
delete from galleries where slug in ('teste','teste2');
delete from access_attempts where slug in ('teste','teste2');
