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

## Avaliação (AVM/CMA) — detalhe da fase 2 (`src/lib/avm/model.ts`, `src/server/avm.ts`)

1. **Candidatos.** Mesmo tipo e negócio, área 0,6×–1,6× a do imóvel, anúncios ativos principais e anúncios vendidos/arrendados nos últimos 12 meses, por ordem de proximidade (KNN sobre o índice GiST). O raio cresce (1, 2, 5, 15 km) até haver pelo menos 8 candidatos.
2. **Semelhança (0–1):** distância 30 %, tipologia 20 % (±1 vale 0,45), área 20 %, idade 10 %, estado 10 %, recência 10 % (vendidos ×0,8, a decair em 12 meses).
3. **Ajustes ao €/m² do comparável**, multiplicativos e mostrados no relatório: estado (novo 1,18, em construção 1,10, usado 1,00, a recuperar 0,68), andar (+1,2 % por andar até ao 6.º com elevador; r/c −3 %) e dimensão (€/m² ∝ área^−0,08).
4. **Valor** = quantil ponderado 50 % (peso = semelhança²) × área. **Intervalo** = quantis 25–75 %, nunca inferior a ±4 %.
5. **Confiança** = 0,4·min(1, n/15) + 0,3·(1 − IQR/0,5) + 0,3·semelhança média: alta ≥ 0,70; média ≥ 0,45.
6. **Renda e rendimento bruto** usam o mesmo modelo sobre arrendamentos; rendimento = renda×12 ÷ valor.
7. Limitações: valores de anúncio, não de escritura; sem fotografias, ruído, exposição solar nem estado real; não é avaliação bancária.

## Alertas
Evento → gatilho (`published`→nova entrada, `price_drop`, `returned`→voltou ao mercado, `sold/rented/withdrawn`→vendido/retirado). Para cada pesquisa ativa avaliam-se as mesmas condições SQL da pesquisa restritas aos anúncios do evento. A chave única (alerta, evento, canal) torna o processo idempotente.
