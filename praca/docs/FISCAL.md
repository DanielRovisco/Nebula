# Valores fiscais e taxas

**Nada fiscal está em código.** Vive em `fiscal_tables` (IMT, Selo…) e `rates` (Euribor), cada linha com `valid_from`, nota de fonte e `verified_at`. O código escolhe a tabela com `valid_from <= hoje` mais recente.

## Onde confirmar
| Valor | Fonte oficial |
| --- | --- |
| IMT (escalões, parcelas a abater, IMT Jovem) | Autoridade Tributária — Portal das Finanças, ofício-circulado anual com as tabelas práticas; Código do IMT |
| Imposto do Selo (aquisição, crédito) | Tabela Geral do Imposto do Selo (Verbas 1.1 e 17) — Portal das Finanças |
| IMI | Portaria/deliberação de cada município (taxa por concelho) |
| Mais-valias | Código do IRS (art. 10.º e 43.º–44.º) |
| Euribor | EMMI (administrador) e Banco de Portugal |

## Estado dos valores semeados
- `imt/hpp_mainland` 2026: escalões publicados pela imprensa (+2 % face a 2025). **Por confirmar.**
- `imt/other_urban` 6,5 %, `stamp_duty_purchase` 0,8 %, `stamp_duty_credit` 0,6 %: valores indicativos. **Por confirmar.**
- Falta: IMT de habitação secundária, Regiões Autónomas, IMT Jovem, rústicos.
- `rates`: Euribor médias de julho/2026 (imprensa), `is_seed = true`. Ligar um job ao Banco de Portugal/EMMI.

## Como atualizar
```sql
INSERT INTO fiscal_tables (tax, scope, valid_from, brackets, source_note, verified_at)
VALUES ('imt','hpp_mainland','2027-01-01', '[{"upTo":108000,"rate":0,"deduction":0}, ...]', 'Ofício-Circulado n.º … / AT', now());
```
Depois de verificar, preencher `verified_at` para a UI deixar de avisar "valor a confirmar".

## Acrescentos da fase 3 (migração `0005_fiscal_phase3`)
Todas as linhas novas têm `verified_at` nulo: a interface mostra «valor por confirmar» até alguém confirmar na fonte oficial.

| Tabela | Conteúdo | Fonte consultada | Estado |
| --- | --- | --- | --- |
| `imt` / `secondary_mainland` | Tabela III do CIMT (habitação secundária, Continente), 2026: 1 % até 106 346 €; 2 % (parcela 1 063,46); 5 % (5 427,56); 7 % (9 394,50); 8 % até 633 931 € (12 699,89); 6 % até 1 150 853 €; 7,5 % acima | Ofício-Circulado AT n.º 40129/2026, transcrito de fontes secundárias (Santander, imprensa). O PDF oficial não foi aberto | **Por confirmar** |
| `imt_jovem` / `mainland` | Isenção total até 330 539 €; entre esse valor e 660 982 € paga-se a taxa marginal só sobre o excesso | Imprensa e simuladores; texto legal não consultado | **Por confirmar** (limites e mecânica) |
| `rent_irs` / `mainland` | Taxa autónoma sobre rendas por duração do contrato: 28 % (< 2 anos), 26 % (2–5), 23 % (5–10), 14 % (10–20), 10 % (≥ 20) | Memória do art. 72.º do CIRS; não verificada nesta sessão | **Por confirmar** |

A tabela de IMT de habitação própria e permanente que já existia (`hpp_mainland`, 106 346 € … 660 982 € … 1 150 853 €) coincide com a publicada no mesmo ofício-circulado, segundo as fontes consultadas.

## Mais-valias (calculadora `/calculadoras`)
Não há tabela de mais-valias na base de dados. O utilizador indica a **taxa marginal de IRS**, o **coeficiente de atualização** do ano de aquisição (portaria anual; 1 por omissão) e as despesas documentadas. O cálculo usa 50 % da mais-valia para residentes e 100 % para não residentes, e a exclusão por reinvestimento em habitação própria e permanente em proporção do valor reinvestido. As condições de reinvestimento mudaram em 2024 e 2026 (prazo de residência, reinvestimento em arrendamento) e **não estão modeladas**: a página remete para o Portal das Finanças ou um contabilista.
