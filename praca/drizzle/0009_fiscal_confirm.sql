-- Fase 4: confirmação dos valores fiscais (ver docs/FISCAL.md).
-- IMT HPP, secundária e IMT Jovem 2026: tabelas reproduzidas por apcmc.pt a partir do Ofício-Circulado AT n.º 40129/2026 (6 jan 2026)
-- e coincidentes com doutorfinancas.pt (taxas e limites). O PDF da AT não pôde ser aberto a partir do servidor, por isso a nota diz «via».
UPDATE fiscal_tables SET verified_at = now(),
  source_note = 'Ofício-Circulado AT n.º 40129/2026, Tabela I, confirmada via apcmc.pt (tabela completa) e doutorfinancas.pt. PDF da AT não aberto diretamente.'
WHERE tax = 'imt' AND scope = 'hpp_mainland' AND valid_from = '2026-01-01';
UPDATE fiscal_tables SET verified_at = now(),
  source_note = 'Ofício-Circulado AT n.º 40129/2026, Tabela III, confirmada via apcmc.pt (tabela completa) e doutorfinancas.pt. PDF da AT não aberto diretamente.'
WHERE tax = 'imt' AND scope = 'secondary_mainland' AND valid_from = '2026-01-01';
UPDATE fiscal_tables SET verified_at = now(),
  source_note = 'IMT Jovem 2026 (Tabela II do mesmo ofício): isenção total até 330 539 €; entre 330 539 € e 660 982 € paga 8 % só sobre o excesso; acima, sem isenção. Confirmado via apcmc.pt e doutorfinancas.pt.'
WHERE tax = 'imt_jovem' AND scope = 'mainland' AND valid_from = '2026-01-01';
-- IRS sobre rendas: a tabela por duração do contrato tinha sido escrita de memória e não se confirmou (a taxa-base do arrendamento
-- habitacional é 25 % e o OE2026 alterou o art. 72.º). Fica só a taxa-base e o utilizador pode alterá-la.
UPDATE fiscal_tables SET
  brackets = '[{"upTo":null,"rate":0.25,"deduction":0,"flat":true}]'::jsonb,
  verified_at = NULL,
  source_note = 'Taxa autónoma de 25 % sobre rendas de arrendamento habitacional (art. 72.º, n.º 2 CIRS, Lei 56/2023). Reduções por duração do contrato e taxa de 10 % para rendas moderadas (OE2026) não modeladas: confirmar no Diário da República.'
WHERE tax = 'rent_irs' AND scope = 'mainland' AND valid_from = '2026-01-01';
