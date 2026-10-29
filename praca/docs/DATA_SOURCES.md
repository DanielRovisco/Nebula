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
