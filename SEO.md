# Plano de SEO

Estado a 9 de Setembro de 2026, depois da auditoria ao site construído.

Este ficheiro existe porque as recomendações abaixo não são código: são
decisões e trabalho de conteúdo. Ficam escritas para não se perderem entre
conversas.

---

## O que já está feito

Auditado sobre o HTML pré-renderizado, não estimado:

| | |
|---|---|
| Títulos | 32 a 57 caracteres, únicos, abaixo do corte do Google |
| Descrições | 113 a 156 caracteres, únicas |
| `h1` | um por página, nas seis |
| Canonical e hreflang | coincidem com o sitemap, ao carácter |
| Dados estruturados | LocalBusiness, BreadcrumbList, quatro Service, ImageGallery |
| Texto alternativo | sem falhas; os vazios são decorativos, como deve ser |
| CLS | ~0 |
| HTML pré-renderizado | o Google não depende de JavaScript para ler o site |
| Search Console | verificado, sitemap submetido |
| Estatísticas | Umami instalado |

**Tecnicamente há pouco a ganhar.** O que falta não se resolve com código.

---

## O que está a bloquear a primeira página

### 1. As páginas têm pouco texto

Medido: 105 a 219 palavras por página. Quem está na primeira página para
"fotógrafo casamento Lisboa" anda nas 800 a 2000. A página com mais texto do
site é a política de privacidade, com 684, e isso diz tudo.

### 2. Não há perfil no Google Business

Numa pesquisa local de fotografia, o mapa com três resultados ocupa metade do
primeiro ecrã. Sem perfil, a NEBULA não existe nesse bloco, que é onde a
maioria das pessoas clica.

**É o passo isolado com mais retorno. É gratuito e demora vinte minutos.**

### 3. Nenhum site aponta para este

Domínio registado em Setembro de 2026, sem histórico e sem ligações de fora. O
Google usa isso para decidir em quem confia.

### 4. Não há páginas para pesquisas específicas

Os quatro serviços vivem num endereço só. Quem procura "fotógrafo de
maternidade em Sintra" não encontra uma página sobre isso.

---

## Por ordem de retorno

### Agora, e é trabalho do Daniel

1. **Criar o Google Business Profile.** Categoria "Fotógrafo de casamentos",
   zona, fotografias do portfólio, ligação para o site.
2. **Pedir avaliações.** Começar pelo Hernany e pela Mariana. Cinco avaliações
   genuínas valem mais do que qualquer alteração ao código.

### A seguir, e precisa do Daniel para escrever

3. **Texto a sério nas páginas de serviços.** O que está incluído, como corre o
   dia, quanto tempo até à entrega, quantas fotografias. Não pode ser inventado:
   são condições reais, e um texto inventado é pior do que texto nenhum.
4. **Uma secção de perguntas frequentes**, com marcação `FAQPage`. Ajuda quem
   visita e aparece nos resultados de pesquisa. Precisa das respostas
   verdadeiras.

### Decisão por tomar

5. **Separar os serviços em endereços próprios** (`/servicos/casamentos`,
   `/servicos/maternidade`, ...).

   As abas que existem hoje são boas para quem visita e más para o Google,
   porque os quatro serviços competem por um endereço só. Quatro páginas
   competiriam por quatro pesquisas diferentes.

   Dá para manter o aspecto de abas e ter endereços próprios, mas é trabalho e
   desfaz parte do que se fez a 8 de Setembro. **Não avançar sem decisão
   explícita.**

### Depois

6. **Fotografias do primeiro casamento no portfólio** (fim de Setembro), e pedir
   indexação dessa página no Search Console a seguir.
7. **Retratos da equipa** na página Sobre.

---

## Expectativa honesta

Domínio novo, sem histórico. Primeira página para "fotógrafo casamentos Lisboa"
é coisa de seis a doze meses, e não se ganha com código.

Para "fotógrafo casamentos Mem Martins" ou "sessão maternidade Sintra" é bem
mais rápido, meses em vez de anos, e é por aí que se começa.

---

## Medições que ficaram por fazer

O LCP da página inicial variou entre 312ms e 2728ms conforme a medição, porque a
animação de entrada torna a métrica instável e a medição local não tem latência
de rede. **O número fiável tem de vir do PageSpeed Insights sobre o site
publicado**, ou dos dados de campo do Search Console daqui a umas semanas.

Se vier acima dos 2500ms, a animação de entrada é a primeira suspeita.
