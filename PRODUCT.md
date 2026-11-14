# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Quem o site tem de convencer são quatro públicos **com o mesmo peso comercial**
(confirmado): casais a marcar casamento, grávidas e famílias à procura de uma
sessão de maternidade, pessoas que querem um retrato (marca pessoal, book, ou
só uma fotografia sua de que gostem) e quem organiza um evento (festas,
batizados, jantares e lançamentos de empresa). Chegam sobretudo pelo Instagram
e pelo Google, muitas vezes no telemóvel, a decidir com quem vão passar um dia
que não se repete. O trabalho que fazem no site: perceber se gostam do olhar,
perceber o que está incluído e quanto custa, e escrever.

Além de quem decide, o produto tem utilizadores depois da venda, cada um com
uma porta própria:

- **Clientes com galeria privada** — abrem `/galeria/<código>` com uma password,
  veem, escolhem favoritas e descarregam.
- **Convidados de um casamento** — leem um código QR na mesa e entregam as
  fotografias do telemóvel, sem conta e sem aplicação.
- **Os noivos** — têm um painel próprio (`/casamento/<slug>?k=…`) para ver,
  esconder, recuperar e descarregar o que os convidados enviaram.
- **Convidados na festa, junto à impressora** — veem no telemóvel as fotografias
  acabadas de tirar, numeradas, e pedem uma pelo número (`/p/<slug>`).
- **A equipa NEBULA** — três pessoas que gerem tudo em `/admin`, muitas vezes de
  pé, durante um casamento, com rede má.

## Product Purpose

A NEBULA é uma produtora audiovisual de três pessoas, entre Lisboa e Portalegre,
que faz fotografia editorial e vídeo cinematográfico para casamentos,
maternidade, retratos e eventos, em todo o Portugal. O site existe para que
quem gosta do trabalho marque uma conversa, e para entregar o trabalho a quem
já marcou.

Sucesso é: uma mensagem por email ou Instagram de alguém que já percebeu o que
está a contratar; e, depois do dia, clientes que recebem e descarregam tudo sem
precisar de pedir ajuda.

## Positioning

Três coisas juntas, confirmadas como a diferença que um vizinho não pode copiar
com verdade:

1. **Uma equipa de três, foto e vídeo em sincronia.** Dois fotógrafos e um
   videógrafo: enquanto um está com a noiva, o outro está com o noivo, e
   ninguém escolhe entre os dois lados da mesma manhã.
2. **Ferramentas próprias no próprio dia.** O código QR das mesas que recolhe
   as fotografias originais dos convidados sem contas; a impressão ao vivo, com
   a mostra numerada no telemóvel; o painel dos noivos; a galeria privada.
   Feitas e mantidas pela própria equipa, não alugadas a uma plataforma.
3. **Proximidade e autenticidade.** Emoção real, sem encenação; a sessão é
   guiada (dizemos o que fazer com as mãos) mas o que se fotografa é verdade.

## Operating Context

- Contacto só por **email** (`nebula.pdstudio@gmail.com`) e **Instagram**
  (`@proj3ct.nebula`). **Não há telefone**, por opção. Os endereços vivem em
  `src/lib/site.ts`; nunca se escrevem à mão nos componentes.
- O formulário de contacto abre o cliente de email (`mailto:`) ou, com
  `VITE_CONTACT_ENDPOINT`, submete por HTTP.
- O percurso do cliente: primeiro contacto → sessão ou dia → sneak peek em 24 h
  (nos packs que o incluem) → galeria online privada.
- Os módulos do dia do casamento (convidados, noivos, impressão) são usados
  numa festa: rede fraca, telemóveis de toda a gente, pessoas de pé, pouca
  paciência. Quem envia pode bloquear o telemóvel e o envio continua depois.
- Domínio: `proj3ctnebula.pt`. Deploy automático em GitHub Pages a cada push
  para `main`; o site público é pré-renderizado.
- O conteúdo público (portfólio, categorias, testemunhos, histórias) é editado
  no painel e aparece sem deploy.

## Capabilities and Constraints

**Site público:** Home, Sobre, Serviços (uma página por categoria), Portfólio,
Histórias (`/historias`, um casamento contado do princípio ao fim), Contacto,
Privacidade, Obrigado, 404.

**Serviços e packs:** Casamentos, Maternidade e Retratos têm três packs —
**Essência**, **Origem**, **Nebula** — que são um ponto de partida, não uma
lista fechada. Eventos é **À medida**, sem pack fixo, por opção. A galeria de
convidados está só no pack Nebula; o texto diz "podem ter", nunca "cada
casamento tem".

**Entregas:** galeria privada com password verificada no servidor e URLs
assinados de 2 h; favoritas; vídeos com versão leve (H.264) e original à
escolha; ZIP por Worker; registo de atividade; expiração opcional.

**Casamentos:** galeria de convidados por QR (janela de 90 dias, fechar não
apaga, apagar passa sempre pelo lixo, o endereço de um evento nunca muda);
painel dos noivos; mostra de impressão ao vivo (não se descarrega, numerada
pelo nome do ficheiro, fecha-se à mão).

**Restrições:**

- **Duas línguas**, português (origem) e inglês, com endereço próprio por
  página; o inglês é tipado contra o português. O painel é só em português.
- Português **de Portugal**. O tom mistura "tu" e "vocês" consoante o público
  (casais em "vocês", retrato em "tu").
- Estatísticas **sem cookies** (Umami/Plausible) — o site não tem banner de
  consentimento e não deve passar a precisar de um.
- Tudo no plano gratuito (Supabase, Cloudflare R2, GitHub Pages).
- O site publicado está **temporariamente em modo de demonstração**
  (`build:demo`).
- Toda a imagem de conteúdo passa por `src/lib/Picture.tsx` (AVIF/WebP
  responsivos).

**Por decidir:** cópias de segurança automáticas da base de dados; separação
entre desenvolvimento e produção; páginas por pesquisa local (ver `SEO.md`).

## Brand Commitments

- Nome **NEBULA** (Instagram `proj3ct.nebula`). Símbolo, lettering e versão
  combinada, a preto e a branco, em `public/brand/`. O símbolo vai também ao
  centro dos códigos QR (`simboloEscala` 0.22; não se mexe sem repetir o teste
  de leitura).
- Voz: frases com peso concreto, sem superlativos vazios; explica o porquê
  ("um casamento acontece uma vez"). Nada de "em breve" — uma secção sem
  conteúdo desaparece.
- Valores declarados: Criatividade, Rigor, Autenticidade.
- Equipa: Daniel (videógrafo, filmmaker, operador de drone), Camila (fotógrafa,
  editorial e maternidade), Patrick (fotógrafo, casamentos e eventos).

## Evidence on Hand

- Portfólio: 14 originais em `originals/portfolio/` (casamento, maternidade,
  editorial, gender reveal, bebé), mais o que for carregado no painel.
- Histórias de casamento publicadas a partir do painel.
- **Testemunhos:** existem e vão ser publicados mais tarde, quando os clientes
  autorizarem o nome. Até lá a secção não aparece. **Nunca inventar
  testemunhos, citações nem clientes.**
- A home mostra "20+ histórias contadas" e "3 criadores visuais". O primeiro
  número **não foi confirmado** nesta entrevista; não o repetir noutros sítios
  sem confirmar.
- Não há imprensa, prémios, logótipos de clientes nem preços de concorrência
  registados. Não fabricar.

## Product Principles

1. **O dia não se repete.** Tudo o que toca o trabalho de um cliente é
   desenhado para não perder nada: apagar passa por duas decisões, endereços
   impressos nunca mudam, nada expira em silêncio.
2. **Sem contas nem atrito para quem só quer ver ou entregar.** Um link, um
   código, uma password no máximo.
3. **Verdade antes de venda.** Não prometer o que o pack não tem, não inventar
   prova, esconder uma secção em vez de a encher.
4. **As quatro categorias contam por igual.** Casamentos têm mais ferramentas,
   não mais importância.
5. **O trabalho fala primeiro.** O site serve as imagens e a decisão de
   escrever; a interface fica atrás delas.

## Accessibility & Inclusion

- `prefers-reduced-motion` respeitado em todo o site: sem scroll suave,
  paralaxe, reveals nem transições de página; o conteúdo chega estático e
  completo (a pré-renderização depende disso).
- Texto alternativo em todas as imagens de conteúdo; vazio só nas decorativas.
- Bilingue PT/EN com `hreflang`.
- Os ecrãs do dia do casamento têm de funcionar no telemóvel de qualquer
  convidado, de qualquer idade, em rede má e com uma mão.
