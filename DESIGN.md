---
name: NEBULA
description: Fotografia editorial e vídeo cinematográfico, mostrados num céu escuro com poeira a flutuar.
colors:
  eerie: "#141414"
  titanium: "#fcfff0"
  gray: "#8a8a8a"
  gray-dark: "#2a2a2a"
  hairline: "rgba(252, 255, 240, 0.1)"
  border-soft: "rgba(255, 255, 255, 0.1)"
  border-strong: "rgba(255, 255, 255, 0.2)"
  text-secondary: "rgba(252, 255, 240, 0.6)"
  text-label: "rgba(252, 255, 240, 0.55)"
  warning: "#fcd34d"
  danger: "#fca5a5"
  success: "#6ee7b7"
typography:
  display:
    fontFamily: "Montserrat Variable, Montserrat, system-ui, sans-serif"
    fontSize: "clamp(2.2rem, 6vw, 5.4rem)"
    fontWeight: 600
    lineHeight: 0.93
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Montserrat Variable, Montserrat, system-ui, sans-serif"
    fontSize: "clamp(1.9rem, 3.4vw, 3rem)"
    fontWeight: 600
    lineHeight: 1.05
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Montserrat Variable, Montserrat, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  serif-quote:
    fontFamily: "Cormorant Garamond, Georgia, serif"
    fontSize: "clamp(2rem, 5.5vw, 5rem)"
    fontWeight: 300
    lineHeight: 1.12
  body:
    fontFamily: "Montserrat Variable, Montserrat, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.65
  label:
    fontFamily: "Montserrat Variable, Montserrat, system-ui, sans-serif"
    fontSize: "0.65rem"
    fontWeight: 400
    letterSpacing: "0.28em"
  button:
    fontFamily: "Montserrat Variable, Montserrat, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 600
    letterSpacing: "0.2em"
rounded:
  md: "6px"
  lg: "8px"
  xl: "12px"
  2xl: "16px"
  full: "9999px"
spacing:
  gutter: "clamp(1.25rem, 6vw, 6rem)"
  card: "28px"
  section-sm: "96px"
  section: "144px"
components:
  button-primary:
    backgroundColor: "{colors.titanium}"
    textColor: "{colors.eerie}"
    typography: "{typography.button}"
    rounded: "{rounded.full}"
    padding: "20px 36px"
    height: "50px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.titanium}"
    typography: "{typography.button}"
    rounded: "{rounded.full}"
    padding: "20px 36px"
  button-nav:
    backgroundColor: "transparent"
    textColor: "{colors.text-secondary}"
    typography: "{typography.button}"
    rounded: "{rounded.full}"
    padding: "10px 20px"
  card-pack:
    backgroundColor: "transparent"
    textColor: "{colors.titanium}"
    rounded: "{rounded.2xl}"
    padding: "{spacing.card}"
  input-line:
    backgroundColor: "transparent"
    textColor: "{colors.titanium}"
    rounded: "0px"
    padding: "28px 0 10px"
  input-panel:
    backgroundColor: "rgba(255, 255, 255, 0.04)"
    textColor: "{colors.titanium}"
    rounded: "{rounded.lg}"
    padding: "10px 12px"
---

# Design System: NEBULA

## Overview

**Creative North Star: "A Nebulosa"**

Um céu escuro onde algo novo nasce. O fundo é quase preto e não é plano: tem
um grão de filme fino a derivar devagar e uma poeira de pontos de luz a
flutuar, alguns azulados, atrás de tudo. Por cima desse céu, o texto é cor de
marfim e as fotografias aparecem como se fossem a única fonte de luz da sala.
A interface existe para desaparecer à volta delas.

A densidade é baixa e o ritmo é lento: secções muito espaçadas, títulos
grandes e firmes em Montserrat, e uma frase em Cormorant Itálico de vez em
quando para dar a voz humana (o manifesto, as citações). A cor da marca é a
ausência de cor: preto e marfim, com o marfim em várias opacidades a fazer
toda a hierarquia. Os componentes são discretos e precisos: cápsulas
finas, contornos de um pixel, campos que são só um risco.

O movimento é o da poeira: lento, contínuo, quase abaixo do que se nota. As
entradas usam uma única curva exponencial, são curtas (18px, 0.7s) e
desligam-se por completo com `prefers-reduced-motion`. Há um só momento com
autor: a mudança de foco do manifesto, ligada ao scroll.

**Key Characteristics:**
- Fundo escuro único (eerie) com grão SVG e poeira em canvas, sempre **atrás**
  do conteúdo.
- Hierarquia feita com opacidades de marfim, não com cores.
- Uma família (Montserrat) para títulos e texto; Cormorant Itálico só para a
  voz poética.
- Botões em cápsula, maiúsculas espaçadas, marfim cheio ou contorno fino.
- Fotografias com cantos suaves e nunca com nada por cima delas que lhes mude
  a imagem.

## Colors

Monocromático: um preto quente-neutro e um marfim levemente esverdeado, e todo
o resto é o marfim a diferentes opacidades.

### Primary
- **Titanium** (titanium): o marfim da marca. Texto principal, botão
  primário cheio, seleção de texto (invertida), anel de foco a 85%. É a única
  "cor de destaque" que o site tem.

### Neutral
- **Eerie** (eerie): o céu. Fundo de todas as páginas, posto no `html` e não
  no `body`, para a poeira poder viver entre os dois. Também a cor do texto
  dentro do botão primário e da tinta do QR.
- **Gray Dark** (gray-dark): polegar da barra de deslocamento e superfícies
  muito baixas.
- **Gray** (gray): cinzento neutro de reserva; raramente usado diretamente.
- **Texto secundário** (text-secondary): parágrafos de apoio, links de
  navegação em repouso. Na prática o texto corrido varia entre 45% e 60% de
  titanium; nunca abaixo de 55% em texto pequeno.
- **Etiqueta** (text-label): rótulos em maiúsculas, a 55%, valor medido para
  passar 4.5:1 a 10px.
- **Fio** (hairline) e **contornos** (border-soft, border-strong): divisores
  de secção, contorno de cartões em repouso (10%) e em hover (25%), contorno
  dos botões fantasma (20% → 45%).

### Estados (só no painel e em mensagens)
- **Aviso** (warning, amber-300 a 80%): recados no painel que pedem atenção.
- **Perigo** (danger, red-300): erros de formulário e ações destrutivas.
  Num campo inválido o risco passa a vermelho a 55%.
- **Sucesso** (success, emerald-300): confirmações discretas.

### Named Rules
**The No Accent Rule.** O site não tem cor de marca além do marfim. Cor
saturada só aparece como estado (aviso, erro, sucesso), nunca como
decoração, e quase só no painel.

**The Opacity Ladder Rule.** A hierarquia de texto faz-se com titanium a
100 / 80 / 60 / 55 / 45%, não com cinzentos novos. Abaixo de 55% só para
texto grande ou decorativo.

**The Photograph Is Untouched Rule.** Nada que mude a imagem fica por cima de
uma fotografia: nem o grão, nem a poeira, nem filtros. Gradientes de
legibilidade escuros na base de um cartão são permitidos; tintas e cores não.

## Typography

**Display e corpo:** Montserrat Variable (com Montserrat, system-ui)
**Voz poética:** Cormorant Garamond Itálico, 300 e 400 (com Georgia)

**Character:** Uma geométrica firme e limpa a fazer quase tudo, e uma serifada
itálica, fina e literária, a aparecer raramente para dizer a frase que se
lembra.

### Hierarchy
- **Display** (600, até 5.4rem / 6vw no hero, line-height 0.93): o hero da
  home e os h1 das páginas. Linhas partidas à mão, nunca mais de três.
- **Headline** (600, clamp 1.9rem–3rem, line-height ~1.05): títulos de secção
  (h2).
- **Title** (600, 1.25–1.6rem): títulos de cartão, de pack, de bloco.
- **Serif Quote** (Cormorant Itálico 300/400, clamp até 5rem, line-height
  1.12): o manifesto "O tempo passa. / As imagens ficam", citações do Sobre,
  frases dos noivos nas Histórias. A segunda linha costuma ir a 60%.
- **Body** (400, 15–16px, line-height ~1.65): parágrafos a 55–60% de
  titanium, medida até ~65ch.
- **Label** (400, 0.65rem, tracking 0.28em, MAIÚSCULAS, 55%): rótulos de
  secção, nomes de campo, metadados.
- **Button / Nav** (600 nos botões cheios, 400 na navegação; 11px, tracking
  0.18–0.2em, MAIÚSCULAS).

### Named Rules
**The One Family Rule.** Títulos e texto são todos Montserrat; a diferença
faz-se em peso (600 contra 400) e tamanho. Não voltar a introduzir uma segunda
sans.

**The Rare Serif Rule.** Cormorant só em itálico, só em 300/400, e só para a
frase com voz (manifesto, citação, testemunho). Nunca em navegação, botões ou
títulos funcionais, e nunca a negrito (o peso não está carregado).

**The Tight Display Rule.** Títulos com tracking −0.02em e line-height abaixo
de 1.1; nunca abaixo de −0.04em.

## Layout

- **Margem lateral fluida** (spacing.gutter): `clamp(1.25rem, 6vw, 6rem)`,
  aplicada pela classe `container-px` em todas as secções. Não há contentor
  de largura máxima fixa: o site respira até à borda.
- **Ritmo vertical**: secções separadas por 96px no telemóvel e 144px a partir
  de `sm` (`mt-24 sm:mt-36`), divididas por um fio de 1px a 10%. Topo das
  páginas interiores a ~96–112px, para deixar a barra fixa.
- **Grelhas**: duas colunas (imagem + texto) a partir de `lg`, alternando o
  lado; serviços em 1 → 2 → 4 colunas; packs em 1 → 2/3 colunas com 16–20px de
  intervalo.
- **Hero**: ecrã inteiro, fotografia ou vídeo a sangrar, texto pousado em
  baixo à esquerda sobre um gradiente escuro.
- **Telemóvel primeiro**: alvos de toque com pelo menos 44px (botões a 50px),
  menu num painel de ecrã inteiro, faixas horizontais arrastáveis com
  `scroll-snap` e barra escondida.
- Breakpoints do Tailwind 4 (sm 640, md 768, lg 1024, xl 1280).

## Elevation & Depth

Plano por omissão. Não há sombras de elevação no site público: a profundidade
vem das camadas do céu (cor no `html`, grão a `z-index: -2`, poeira a −1,
conteúdo por cima) e de opacidades. Os cartões ganham presença em hover com
contorno mais claro, um fundo de 2% de branco e uma subida de 6px, não com
sombra. O único vidro é a barra de navegação depois de rolar: eerie a 88% com
`backdrop-blur-md` e um fio por baixo.

### Named Rules
**The Sky Behind Rule.** Grão e poeira ficam sempre atrás do conteúdo. Por
cima, sujavam as fotografias dos clientes.

**The Lift Not Shadow Rule.** Um elemento interativo responde subindo e
clareando o contorno, nunca ganhando sombra.

## Shapes

- **Cápsula** (rounded.full): todos os botões, pills de filtro, interruptor de
  língua no menu.
- **Cantos suaves de 16px** (rounded.2xl): fotografias grandes, cartões de
  serviço e de pack, blocos de destaque, grelha das estatísticas.
- **12px** (rounded.xl): miniaturas da faixa do portfólio e cartões do painel.
- **8px / 6px** (rounded.lg / md): campos e miniaturas do painel, separadores.
- **Sem canto** nos campos do formulário público: são só um risco por baixo.
- Contornos sempre de 1px. Molduras de telemóvel ilustrativas nos Serviços
  usam raios grandes (~2.5–3rem) a imitar o aparelho.

## Components

### Buttons
Discretos e precisos: falam baixo, em maiúsculas espaçadas.
- **Shape:** cápsula (rounded.full), altura mínima 50px nos de ação.
- **Primary:** titanium cheio, texto eerie a 600, 11px, tracking 0.2em,
  padding ~20×36px, com seta `ArrowRight` de 13–14px à direita.
- **Hover / Focus:** o espaço entre texto e seta abre de 12 para 20px e a seta
  avança 4px; ao premir encolhe para 95%. Foco por teclado com anel titanium a
  85%, 2px, afastado 3px.
- **Ghost:** transparente com contorno branco a 20% que sobe para 45% em hover.
- **Nav ("Marcar sessão"):** contorno titanium a 25%, texto a 75%; em hover
  enche de titanium e o texto passa a eerie.
- **Link sublinhado** (classe `link-sublinhado`): texto 11px em maiúsculas,
  tracking 0.2em, a 60%, com risco de 1px a 25% colado por baixo; texto a 90%
  e risco a 60% em hover. É a ação secundária por omissão e vive numa classe
  só: não se reescreve com utilities. O alvo de 44px vem de um `::after`
  invisível, para o risco nunca se afastar do texto.

### Cards / Containers
- **Corner Style:** 16px.
- **Background:** transparente; em hover branco a 2%.
- **Shadow Strategy:** nenhuma (ver Elevation & Depth).
- **Border:** 1px branco a 10% → 25% em hover.
- **Internal Padding:** 24–28px; blocos de destaque 32–48px.
- Cartões de serviço da home são fotografias verticais a sangrar o cartão, com
  gradiente escuro na base e o texto pousado por cima.

### Inputs / Fields
- **Público ("campo"):** sem caixa, só um risco de 1px a 15%; a etiqueta
  começa pousada na linha e sobe para rótulo em maiúsculas (0.65rem, 0.22em)
  quando o campo ganha foco ou texto. É um `<label>` a sério, nunca um
  placeholder.
- **Focus:** o risco passa a 65%.
- **Error:** risco vermelho a 55% e `aria-invalid`.
- **Painel:** caixa a 4% de branco, contorno 10% → 30% no foco, 8px de raio.

### Navigation
- Barra fixa, transparente sobre o hero e eerie a 88% com desfoque depois de
  rolar. Os links completos só aparecem a partir de 1280px (`xl`), que é onde
  cabem; abaixo disso fica o ícone de menu, também em tablets. Logótipo à esquerda (respira em hover: 75% e escala 1.03).
- Links 11px em maiúsculas, tracking 0.18em, a 60%; o ativo a 100% com um fio
  de 1px por baixo que, nos outros, cresce da esquerda em hover.
- Abaixo do `xl`: ícone de menu que abre um painel eerie de ecrã inteiro
  (círculo a crescer a partir do ícone) com os links centrados, Instagram e a
  troca de língua. Com movimento reduzido abre já aberto.

### Label de secção
Rótulo em maiúsculas (`label-sm`) por cima do título de secção. É o padrão
incumbente em todo o site. Ver a nota em Do's and Don'ts.

### Manifesto serifado
Duas linhas em Cormorant Itálico 300, muito grandes, com uma nota curta em
Montserrat por baixo. É a assinatura da home e o modelo para qualquer frase de
voz.

Anima como uma **mudança de foco** de câmara, ligada ao scroll (o scroll é o
tempo): "O tempo passa." começa nítida a 92% e sai para `blur(5px)` a 40%;
"As imagens ficam" começa em `blur(9px)` a 28% e assenta nítida a 92%. O
valor passa por uma mola (stiffness 90, damping 26, mass 0.6). Com movimento
reduzido, fica estático: primeira linha a 92%, segunda a 60%.

### Named Rules
**The One Authored Moment Rule.** O site tem um só movimento de autor, a
mudança de foco do manifesto. Tudo o resto (entradas, hovers, transições) é
apoio e fica discreto; não se acrescenta um segundo momento que lhe dispute a
atenção.

### Céu (grão + poeira)
Grão SVG `feTurbulence` a 20% de opacidade, 200px de mosaico, a derivar em
20s; poeira em canvas com ~90 pontos a respirar, alguns azulados. Ambos param
com movimento reduzido. É o "material" do site e não se replica noutra forma.

## Do's and Don'ts

### Do:
- **Do** usar eerie como fundo e titanium a opacidades para toda a hierarquia.
- **Do** manter Montserrat em títulos e texto, e guardar Cormorant Itálico
  para a frase com voz.
- **Do** dar às fotografias cantos de 16px e deixá-las sem nada por cima.
- **Do** usar cápsulas em maiúsculas espaçadas para ações, com a seta que
  avança em hover.
- **Do** separar secções com 96/144px e um fio de 1px a 10%.
- **Do** usar a curva `cubic-bezier(0.16, 1, 0.3, 1)` para entradas e
  transições, e desligá-las com `prefers-reduced-motion`.
- **Do** manter alvos de toque com pelo menos 44px. Num link pequeno que não
  pode crescer, usar `alvo-toque` (alarga a zona por um `::after`) em vez de
  mudar o desenho.
- **Do** desligar no framer-motion, com `useReducedMotion`, tudo o que o CSS
  global não apanha.

### Don't:
- **Don't** introduzir uma cor de destaque: o site é preto e marfim.
- **Don't** pôr grão, poeira, tintas ou filtros por cima de uma fotografia.
- **Don't** usar sombras para dar elevação; sobe-se e clareia-se o contorno.
- **Don't** voltar a carregar a Poppins nem outra sans para títulos.
- **Don't** usar Cormorant a negrito, em botões ou em navegação.
- **Don't** pôr texto pequeno abaixo de 55% de titanium.
- **Don't** acrescentar novos rótulos de secção por cima de títulos em
  superfícies novas: o padrão existe no site atual, mas um título bom aguenta
  sozinho, e o sistema não o deve espalhar.
