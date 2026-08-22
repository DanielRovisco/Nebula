-- Passa os três testemunhos do código para o painel, onde podem ser
-- editados, reordenados ou apagados. Correr uma vez no SQL Editor.
--
-- O `where not exists` faz com que voltar a correr não duplique nada: se já
-- houver um testemunho com o mesmo autor, aquela linha é ignorada.
insert into site_testimonials (author, context, quote, sort_order, published)
select * from (values
  ('Carolina Vital', 'Revelação do sexo, maternidade e recém-nascido', 'Costuma-se dizer que a fotografia regista momentos, mas o que eles fazem é eternizar o amor. Acompanharam o capítulo mais importante da minha vida: desde a ansiedade da revelação do sexo, passando por cada curva da minha gravidez, até aos sorrisos da minha filha hoje. Não estão apenas a contratar fotógrafos, estão a confiar as vossas memórias a quem realmente sabe o valor de um momento.', 0, true),
  ('Andreia e Elton', 'Vídeo de revelação do sexo', 'Queremos agradecer de coração à Nebula pelo vídeo incrível de revelação do sexo dos nossos bebés. Foi um momento mágico, emocionante e inesquecível para nós e para toda a nossa família. O carinho, dedicação e profissionalismo ficaram visíveis em cada detalhe. Recomendamos a Nebula de olhos fechados!', 1, true),
  ('Mariana Roberto', 'Retratos', 'Gostei imenso de estar convosco. Sendo sincera, não estava à espera de me sentir tão confortável como senti. Gostei muito da vossa vibe, e sem dúvida que quero voltar a repetir.', 2, true)
) as novos(author, context, quote, sort_order, published)
where not exists (
  select 1 from site_testimonials t where t.author = novos.author
);

select author, context, sort_order, published from site_testimonials order by sort_order;
