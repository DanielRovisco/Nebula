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
