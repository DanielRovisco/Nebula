-- Porque é que uma galeria não abre.
--
-- A galeria responde sempre a mesma coisa a quem erra ("código ou password
-- incorretos"), e é assim de propósito: dizer "a galeria existe mas a password
-- está errada" é entregar meia resposta a quem anda a tentar. O senão é que
-- também não diz nada a quem a criou. Esta consulta diz.
--
-- Correr no SQL Editor do Supabase. Só lê, não altera nada.

select
  g.slug                                   as codigo,
  g.title                                  as titulo,
  case
    when g.slug <> lower(g.slug)           then 'CÓDIGO COM MAIÚSCULAS: o acesso procura em minúsculas'
    when g.slug ~ '[^a-z0-9-]'             then 'CÓDIGO COM CARACTERES A MAIS: só letras, números e hífens'
    when not g.published                   then 'EM RASCUNHO: não abre a ninguém, nem com a password certa'
    when g.expires_at is not null
     and g.expires_at <= now()             then 'EXPIRADA em ' || g.expires_at::date
    when g.password_hash = 'pending'       then 'SEM PASSWORD VÁLIDA: define uma nova no painel'
    when g.password_hash !~ '^\$2[aby]\$'  then 'HASH DA PASSWORD ESTRANHO: define uma nova no painel'
    when (select count(*) from access_attempts a
          where lower(a.slug) = lower(g.slug)
            and not a.ok and a.at > now() - interval '1 hour') >= 10
                                           then 'MUITAS TENTATIVAS FALHADAS na última hora'
    else 'Deve abrir. Se não abre, é a password que está errada.'
  end                                      as diagnostico,
  g.published                              as publicada,
  g.expires_at                             as expira,
  (select count(*) from photos p where p.gallery_id = g.id)          as fotografias,
  (select count(*) from access_attempts a
    where lower(a.slug) = lower(g.slug)
      and not a.ok and a.at > now() - interval '1 hour')             as falhas_1h,
  'https://proj3ctnebula.pt/galeria/' || g.slug                      as link
from galleries g
order by g.created_at desc;

-- Se o diagnóstico apontar para tentativas falhadas, isto limpa-as:
-- delete from access_attempts where not ok;
