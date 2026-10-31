# Fontes de dados

Regra: **sem scraping de portais**. Só fontes licenciadas, feeds oficiais, dados abertos e inputs de agências. Cada `sources` tem `licence` obrigatória.

| Fonte | Estado | Para produção |
| --- | --- | --- |
| Seed sintético (`pnpm db:seed`) | ✅ funcional, `is_seed = true`, banner de demonstração | Não carregar em produção real (`SEED_PROPERTIES`/não correr o seed) |
| CAOP / DGT — limites administrativos | ✅ snapshot em `data/geo` via `json.geoapi.pt` (derivado da CAOP) | Para a versão oficial, descarregar a CAOP vigente em dgterritorio.gov.pt e regenerar com `pnpm geo:fetch` (adaptar origem). Licença: dados abertos DGT |
| Importação CSV/XML/JSON de agências | ⏳ Fase 2 (contrato `SourceAdapter`, Zod, geocoding com cache, dedupe) | Acordo e termos com cada agência |
| Feeds XML (Kyero/Thinkspain) e APIs de CRMs | ⏳ Fase 2 | Credenciais fornecidas pelo utilizador/agência |
| INE — estatísticas da habitação | ⏳ Fase 2/3 | API do INE (licença CC BY 4.0, citar fonte) |
| Banco de Portugal / EMMI — taxas | ⏳ Fase 2 (job) | Séries estatísticas do BdP |
| OpenStreetMap — POIs, mapas | ⏳ Fase 3 | ODbL: atribuição obrigatória (já no mapa). Sem Overpass em massa; usar extractos |
| Preços de transação | ⛔ stub documentado (`transactions`) | Acordo comercial com parceiro (ex.: bases de transações agregadas). Só agregados anonimizados |
| Registo predial / AT (caderneta, artigo matricial) | ⛔ stub | Licença/protocolo com IRN/AT |
| CTT — códigos postais | ⛔ | Base CTT (licença). Em demo, `geo_postcodes` vem do seed |

Tiles de mapa: OpenFreeMap tem uso gratuito sem chave mas sem SLA; em produção usar MapTiler ou Protomaps self-hosted.

## Estado da ingestão (fase 2)

| Fonte | Estado |
| --- | --- |
| Upload CSV/JSON/XML Kyero no admin, com mapeamento de colunas | ✅ funcional (`/admin/fontes`) |
| Feeds por URL com credenciais (Basic/Bearer, cifradas) e cron | ✅ funcional (`/api/cron/ingest`, frequência por fonte) |
| Exemplos | `examples/ingestion/{agency.csv,feed-kyero.xml,agency.json}` |
| Geocoding | coordenadas da fonte → código postal conhecido → Nominatim (`GEOCODER=nominatim`, com cache e 1 pedido/s) → centro da freguesia/concelho |
| Preços de transação, registo predial, INE, BdP, OSM | stubs documentados em `src/ingestion/adapters/stubs.ts` e listados no admin |

Regras: cada fonte tem de ter **licença/base legal registada** e estar ativa; em modo *completo* o que desaparece do feed é retirado (evento `withdrawn`). Dados pessoais de anunciantes (telefone/email) só são copiados para o CRM com base legal registada.

## Fase 3
- **openrouteservice** (isócronas): dados OpenStreetMap, serviço da HeiGIT. Chave em `ORS_API_KEY`. Limites do plano gratuito a confirmar na conta (a página de planos indica 500/dia e 20/min; fontes de terceiros indicam 2 500/dia). Máximo de 5 locais e 10 intervalos por pedido, e 1 h de alcance em carro. Resultados em cache na tabela `isochrone_cache`.
- **Camadas de risco:** nenhuma fonte oficial vem incluída. Ver [`RISK_LAYERS.md`](RISK_LAYERS.md) para fontes candidatas (APA/dados.gov.pt, ICNF, municípios) e como importar.
- **OpenFreeMap / MapTiler** continuam a ser os mosaicos do mapa (já na fase 1).
- **Dossiê, preço justo e sinais antifraude** usam apenas dados já recebidos (anúncios e indicadores calculados). Nada é obtido de terceiros em tempo de pedido, exceto as isócronas.

## Fontes reais ligadas (depois da fase 4)
Correm com `pnpm sources:sync` e, em produção, no cron semanal `/api/cron/official`. Idempotentes e sem chaves.

| Fonte | O que traz | Onde aparece | Licença e atribuição |
| --- | --- | --- | --- |
| **INE**, indicador 0014763 (*Estatísticas de preços da habitação ao nível local*) | Mediana do valor das vendas por m² dos últimos 12 meses, por trimestre, para Portugal e cada concelho (≈ 305). Guardada em `transactions` | Secção «Preço pedido e preço de vendas registadas» do observatório, API v1 `registeredSales`, ferramenta MCP `market_stats` | CC BY 4.0 (catálogo dados.gov.pt). A fonte é citada em cada utilização |
| **BCE** (ECB Data Portal), séries `FM.M.U2.EUR.RT.MM.EURIBOR{3M,6M,1Y}D_.HSTA` | Euribor 3, 6 e 12 meses, média mensal das observações diárias. Guardada em `rates` | Calculadoras (prestação), dossiê PDF, MCP `purchase_costs` | Dados públicos do BCE, com a fonte indicada. O Euribor é um índice do EMMI; usamos só as médias mensais publicadas pelo BCE |

Limites a conhecer:
- O INE não publica número de transações nesta série (`n` fica a 0, nunca é mostrado) nem valores abaixo do concelho nesta tabela, e suprime concelhos pequenos por segredo estatístico. Esses ficam sem dado, não são estimados.
- A série só tem os trimestres publicados no formato atual (2026-T1 e 2026-T2). Cada execução acrescenta os novos, por isso o histórico cresce com o tempo.
- O INE reinicia ligações cujo *user-agent* não siga o formato habitual. Identificamo-nos como `Mozilla/5.0 (compatible; PracaBot/1.0; +…/metodologia)`.
- **Rendas medianas do INE** (indicador 0012573, só 24 concelhos, até 2025-T1) não estão ligadas: ficam para quando houver onde as mostrar com honestidade.
- **Anúncios reais** continuam sem fonte: não há feed aberto de anúncios em Portugal e fazer scraping está fora das regras do projeto. O caminho é o contrato `SourceAdapter` com feeds de agências ou portais licenciados (ver `examples/ingestion/`).
