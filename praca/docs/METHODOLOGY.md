# Metodologia

Todos os números mostram fonte, data e amostra. Página pública: `/metodologia`.

## Indicadores de preço (`src/server/indicators.ts`)
- Universo: anúncios **ativos**, **principais**, apartamentos e moradias com €/m² conhecido.
- Por grupo (país, distrito, concelho, freguesia × venda/arrendamento) retiram-se os 2 % extremos de €/m² (winsorização por corte) e calcula-se a **mediana**, P25, P75, preço mediano, dias no mercado (mediana) e descida média face ao preço inicial.
- **Amostra mínima n ≥ 10.** Abaixo disso o valor é o do nível geográfico acima e `aggregated_from` diz qual.
- **Rendimento bruto** = renda mediana anual por m² ÷ preço mediano de venda por m², no mesmo território e só se ambos têm n ≥ 10.
- **Variação** homóloga e trimestral = valor atual ÷ valor do mesmo indicador há 12 / 3 meses (precisa de histórico acumulado; no seed o histórico é sintético e marcado `seed:synthetic-history`).
- É preço **pedido**. Preços de transação só entram com fonte licenciada (`transactions`), identificada.

## Deduplicação (`src/lib/dedupe.ts`)
Pontuação 0–1 por média ponderada de: distância (28 %, 0 aos 150 m), área (22 %, tolerância 8 %), andar (10 %), preço (10 %, 12 %), morada por trigramas (15 %), fotografias por *hash* percetual (15 %, só se ambos têm hashes; os pesos renormalizam). Tipo e tipologia são portas fixas; > 400 m nunca funde; ≥ 50 % de fotos partilhadas eleva para ≥ 0,9. **≥ 0,82 funde; 0,60–0,82 vai para revisão manual** (`dedupe_candidates`); abaixo é distinto. `fingerprint` (tipo | tipologia | andar | coordenadas a 3 casas) é só um atalho de pesquisa; os candidatos fora do balde encontram-se por `ST_DWithin`.

## Estimativa de valor (`src/lib/estimate.ts`)
Comparáveis: mesmo negócio, tipo e tipologia, área ±30 %, até 15 km, ordenados por distância (KNN GiST). Peso = 0,5·proximidade + 0,4·área + 0,1. Valor = quantil ponderado 50 % de €/m² × área; intervalo = quantis 25–75 %. **Confiança** = 0,55·min(1, n/20) + 0,45·(1 − IQR relativo/0,6): alta ≥ 0,70, média ≥ 0,45. Requer n ≥ 5. Fase 2: ajustes por estado/andar, vendidos e arrendados, PDF e SmartLink.

## Calculadoras (`src/lib/calc.ts`)
IMT: `valor × taxa − parcela a abater` no escalão (ou taxa única). Selo: taxa única. Crédito: prestação constante com taxa = Euribor + spread. Tabelas e taxas vêm da BD.
