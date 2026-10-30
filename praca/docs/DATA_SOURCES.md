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
