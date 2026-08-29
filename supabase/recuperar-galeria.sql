-- Repor o acesso a uma galeria que deixou de abrir.
--
-- Serve para o caso em que o código (slug) foi gravado com maiúsculas,
-- espaços ou "&" pelo editor do painel, e o acesso deixou de o reconhecer.
-- Corre no SQL Editor do Supabase. É seguro repetir.

-- 1. Ver como está gravado. Se aparecer alguma coisa que não sejam letras
--    minúsculas, números e hífens, é esse o problema.
select id, slug, title, published, expires_at
from galleries
order by created_at desc;

-- 2. Limpar os códigos de todas as galerias: minúsculas, sem acentos, sem
--    espaços, "&" passa a "-e-". É o mesmo que o painel faz agora.
update galleries
set slug = trim(both '-' from regexp_replace(
      lower(translate(replace(slug, '&', ' e '),
                      'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ',
                      'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC')),
      '[^a-z0-9]+', '-', 'g'))
where slug is distinct from trim(both '-' from regexp_replace(
      lower(translate(replace(slug, '&', ' e '),
                      'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ',
                      'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC')),
      '[^a-z0-9]+', '-', 'g'));

-- 3. Limpar o bloqueio por tentativas falhadas.
--    Dez falhas na mesma hora fecham o acesso, mesmo com a password certa.
--    É a defesa contra quem anda a adivinhar. Depois de corrigir o código, as
--    tentativas anteriores já não dizem nada.
delete from access_attempts where not ok;

-- 4. Confirmar. `published` tem de estar a true, senão a galeria não abre a
--    ninguém, nem com a password certa.
select slug, title, published, expires_at from galleries order by created_at desc;
