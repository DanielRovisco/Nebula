# Decisões

Registo das decisões tomadas sem consultar o dono do projeto (regra 1). Formato: contexto → decisão → porquê.

## Fase 1

1. **Localização do projeto: `praca/` dentro do repositório `Nebula`.** O repositório já alberga o site público da NEBULA (Vite, GitHub Pages, deploy automático em `main`). Colocar o novo portal na raiz teria apagado ou partido esse site. O portal vive em `praca/`, com o seu `package.json`, e o CI próprio (`.github/workflows/praca-ci.yml`) só corre quando `praca/**` muda. Para o separar num repositório próprio basta `git subtree split -P praca`.
2. **Nome: "Praça"** (mantido). A tagline original é o `<h1>` da home.
3. **Locales com `next-intl` e `localePrefix: "as-needed"`.** pt-PT na raiz (`/comprar/...`), inglês em `/en/...`. Dá `hreflang` correto sem duplicar o português. Os slugs de URL ficam em português nas duas línguas.
4. **Geografia real, dados de demonstração sintéticos.** Limites administrativos (20 "distritos" = 18 de Portugal continental + Madeira + Açores, 308 concelhos, 3 259 freguesias) vêm da CAOP/DGT através do espelho aberto `json.geoapi.pt`, simplificados (Douglas-Peucker) e guardados em `data/geo/` para o clone não precisar de rede. Os imóveis, preços e fotografias do seed são sintéticos, marcados `is_seed = true`, e há um banner "Dados de demonstração" fora de produção.
5. **Auth.js v5 com sessões na base de dados** (`strategy: "database"`) e magic link por email. Permite revogar sessões e ter o RBAC lido na BD. Sem ligação SMTP/Resend em desenvolvimento, a ligação aparece no log do servidor.
6. **Dois clientes PostgreSQL:** `sql` (postgres.js, para SQL com PostGIS) e `db` (Drizzle). O Drizzle altera os *type parsers* do cliente que embrulha (datas passam a texto), por isso não partilham ligação.
7. **IDs UUIDv7** gerados na BD (`uuid_generate_v7()` em `src/db/bootstrap.sql`, compatível com PG 14–17). As tabelas do Auth.js recebem UUIDv4 do adaptador; continuam a ser `uuid`.
8. **Colunas PostGIS que o Drizzle não modela** (`properties.location geography(Point)` e índices GiST) estão numa migração SQL à mão (`0001_postgis_columns.sql`). `lat`/`lng` ficam como `double precision` para leituras baratas.
9. **Unidade de pesquisa = anúncio principal.** Um imóvel (`properties`) tem N anúncios (`listings`); em cada par (imóvel, negócio) um é `is_primary` e é esse que aparece nos resultados. Os restantes aparecem na página do imóvel como "outros anúncios".
10. **Paginação por cursor (keyset)** sobre `(chave de ordenação, id)`; o total vem de um `count(*)` separado.
11. **Mapa:** MapLibre GL com OpenFreeMap (sem chave) por omissão; MapTiler se `NEXT_PUBLIC_MAPTILER_KEY` existir. Agrupamento e preço no pin feitos na GPU (camadas `symbol` + imagem de "pílula" 9-slice) para suportar milhares de pontos sem DOM.
12. **Estado da pesquisa na query string.** Alterações só de query usam `history.replaceState` (sem ida ao servidor); alterações de caminho (tipo único, geografia) usam o router.
13. **Sem `loading.tsx` global.** Com Suspense a nível de rota, `notFound()`/`redirect()` devolviam HTTP 200 (soft-404). Preferimos códigos HTTP corretos; os estados de carregamento vivem dentro dos componentes.
14. **Valores fiscais nunca em código:** IMT, Selo e Euribor estão em `fiscal_tables` / `rates` com `valid_from`. Os valores semeados são os de 2026 encontrados na imprensa e **estão marcados como "a confirmar"** (`verified_at` nulo) até alguém os validar no Portal das Finanças (ver `FISCAL.md`).
15. **Estimativa de valor "lite" na página do imóvel** (mediana ponderada de comparáveis, intervalo P25–P75). O AVM/CMA completo, com ajustes e PDF, é da Fase 2.
16. **Imagens do seed são SVG ilustrativos** gerados por rota (`/api/img/seed/...`) e rotulados "Imagem ilustrativa · demo". Nunca fotografias reais ou geradas a fingir que o são.
17. **WhatsApp:** o botão só funciona se o anúncio tiver número. O seed não tem números de telefone (evitar ligações a pessoas reais).
18. **Prova social = números reais da base de dados** (anúncios, imóveis únicos, duplicados fundidos) e fontes abertas utilizadas. Sem testemunhos.
19. **Rate limiting:** Upstash (REST) se configurado, senão memória do processo. Suficiente para um único processo; produção multi-instância deve configurar Upstash.
20. **Turnstile** é opcional: ativa-se ao definir `TURNSTILE_SECRET_KEY`; o formulário de contacto tem ainda honeypot e limite por IP.
