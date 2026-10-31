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
- `rates`: Euribor 3, 6 e 12 meses vêm agora do BCE (`pnpm sources:sync`, cron semanal), médias mensais, `is_seed = false`.

## Como atualizar
```sql
INSERT INTO fiscal_tables (tax, scope, valid_from, brackets, source_note, verified_at)
VALUES ('imt','hpp_mainland','2027-01-01', '[{"upTo":108000,"rate":0,"deduction":0}, ...]', 'Ofício-Circulado n.º … / AT', now());
```
Depois de verificar, preencher `verified_at` para a UI deixar de avisar "valor a confirmar".

## Acrescentos da fase 3 e confirmação (migrações `0005` e `0009`)

| Tabela | Conteúdo | Estado |
| --- | --- | --- |
| `imt` / `hpp_mainland` | Tabela I do Ofício-Circulado AT n.º 40129/2026 (6 jan 2026) | **Confirmada** (31 out 2026) em apcmc.pt, que reproduz a tabela com parcelas a abater, e em doutorfinancas.pt (taxas e limites). Os dois coincidem com a base de dados |
| `imt` / `secondary_mainland` | Tabela III do mesmo ofício: 1 % até 106 346 €; 2 % (parcela 1 063,46); 5 % (5 427,56); 7 % (9 394,50); 8 % até 633 931 € (12 699,89); 6 % até 1 150 853 €; 7,5 % acima | **Confirmada**, mesmas fontes |
| `imt_jovem` / `mainland` | Tabela II: isenção total até 330 539 €; entre 330 539 € e 660 982 € paga 8 % só sobre o excesso (equivale a `8 % × valor − 26 443,12`); acima, sem isenção | **Confirmada**, mesmas fontes |
| `rent_irs` / `mainland` | Taxa autónoma de 25 % sobre rendas de arrendamento habitacional | **Por confirmar**. A tabela por duração do contrato (28/26/23/14/10 %) que a fase 3 trazia tinha sido escrita de memória e não se confirmou, por isso foi retirada. O OE2026 alterou o art. 72.º do CIRS (rendas moderadas a 10 %, condições por confirmar). A calculadora usa 25 % e deixa o utilizador alterar |
| `imt` / `other_urban` (6,5 %), `stamp_duty_purchase` (0,8 %), `stamp_duty_credit` (0,6 %) | Valores da fase 1 | **Por confirmar** nesta sessão |

**Limite da confirmação:** o PDF do ofício-circulado da AT não pôde ser aberto a partir do servidor (o acesso a at.madeira.gov.pt falhou). A confirmação é por fontes que reproduzem o ofício e concordam entre si. Antes de lançar, comparar uma vez com o documento oficial no Portal das Finanças e, se houver diferença, corrigir com nova migração.

## Mais-valias (calculadora `/calculadoras`)
Não há tabela de mais-valias na base de dados. O utilizador indica a **taxa marginal de IRS**, o **coeficiente de atualização** do ano de aquisição (portaria anual; 1 por omissão) e as despesas documentadas. O cálculo usa 50 % da mais-valia para residentes e 100 % para não residentes, e a exclusão por reinvestimento em habitação própria e permanente em proporção do valor reinvestido. As condições de reinvestimento mudaram em 2024 e 2026 (prazo de residência, reinvestimento em arrendamento) e **não estão modeladas**: a página remete para o Portal das Finanças ou um contabilista.
