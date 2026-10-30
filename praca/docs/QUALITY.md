# Qualidade: acessibilidade e desempenho

## Acessibilidade (WCAG 2.2 AA)
`e2e/a11y.spec.ts` corre o axe-core (etiquetas wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa) em 8 modelos de página, **claro e escuro**: início, pesquisa, imóvel, mercado, calculadoras, blog, projetos e planos. Achados sérios ou críticos falham o teste. Resultado atual: **16/16 sem achados**. O Lighthouse dá **100** em acessibilidade em todas as páginas medidas.

O axe só apanha o que é automatizável (aprox. um terço dos critérios). Ficam por fazer, e continuam a ser responsabilidade humana: teste com leitor de ecrã (NVDA/VoiceOver), navegação só por teclado nas ferramentas de desenho de zonas e ampliação a 400 %.

Correções feitas na auditoria: nome acessível do botão de idioma (2.5.3) e gráficos focáveis dentro de `aria-hidden`.

## Desempenho (Lighthouse 13.6.0, móvel simulado, build de produção local)
Medido contra `next start` na mesma máquina, sem CDN e com CPU 4× mais lenta. **Valores de laboratório, não de utilizadores reais.** Use o Vercel Speed Insights ou o CrUX depois do lançamento.

| Página | Desempenho | Acessib. | Boas práticas | LCP | TBT | CLS |
| --- | --- | --- | --- | --- | --- | --- |
| Início | 88 | 100 | 100 | 1,3 s | 450 ms | 0,017 |
| Pesquisa (Lisboa) | 75 | 100 | 100 | 3,6 s | 610 ms | 0 |
| Imóvel | 78 | 100 | 100 | 3,3 s | 510 ms | 0,052 |
| Mercado | 66 | 100 | 100 | 4,9 s | 620 ms | 0 |
| Blog | 80 | 100 | 100 | 4,0 s | 330 ms | 0 |

SEO mede 58–66 **porque o ambiente de teste é de desenvolvimento**: `robots.txt` bloqueia tudo fora de produção (decisão deliberada, evita indexar demos), o que reprova «is-crawlable». Com `NEXT_PUBLIC_APP_ENV=production` o robots permite a indexação. Medir de novo depois de publicar.

Melhorias feitas: mapas só carregam quando ficam visíveis (pesquisa 64 → 75, imóvel 61 → 78), HTML do mercado 540 → 399 KB, `favicon.ico` servido, ligação de cookies com texto descritivo.

Limitações conhecidas:
- **Mercado** continua abaixo de 70: o mapa de calor é um SVG com 308 concelhos renderizado no servidor. Próximo passo: mapa de calor por vetor-tiles ou só o nível seguinte do território.
- O LCP das páginas de texto em telemóvel é muitas vezes o aviso de cookies (aparece depois da hidratação). Não o escondemos nem atrasámos para melhorar o número.

## Como repetir
```bash
pnpm build
pnpm start -p 3100
CHROME_PATH=/caminho/para/chromium npx lighthouse http://localhost:3100/ --only-categories=performance,accessibility,best-practices,seo
PW_CHROMIUM_PATH=/caminho/para/chromium npx playwright test e2e/a11y.spec.ts --project=desktop
```
