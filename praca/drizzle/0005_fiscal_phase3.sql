-- Phase 3 fiscal tables (data lives in the DB, never in code). verified_at stays NULL until someone confirms each
-- value against the official source; the UI shows "valor por confirmar" meanwhile. See docs/FISCAL.md.
INSERT INTO fiscal_tables (tax, scope, valid_from, brackets, source_note) VALUES
('imt', 'secondary_mainland', '2026-01-01',
 '[{"upTo":106346,"rate":0.01,"deduction":0},{"upTo":145470,"rate":0.02,"deduction":1063.46},{"upTo":198347,"rate":0.05,"deduction":5427.56},{"upTo":330539,"rate":0.07,"deduction":9394.50},{"upTo":633931,"rate":0.08,"deduction":12699.89},{"upTo":1150853,"rate":0.06,"deduction":0,"flat":true},{"upTo":null,"rate":0.075,"deduction":0,"flat":true}]'::jsonb,
 'Tabela III do CIMT, habitação secundária, Continente, 2026 (Ofício-Circulado AT n.º 40129/2026), transcrita de fontes secundárias. Confirmar no Portal das Finanças.'),
('imt_jovem', 'mainland', '2026-01-01',
 '[{"upTo":330539,"rate":0,"deduction":0},{"upTo":660982,"rate":0,"deduction":0}]'::jsonb,
 'IMT Jovem (até 35 anos, HPP): isenção total até ao 1.º limite; entre o 1.º e o 2.º limite, taxa marginal só sobre o excesso. Limites 2026 por confirmar.'),
('rent_irs', 'mainland', '2026-01-01',
 '[{"upTo":1.99,"rate":0.28,"deduction":0,"flat":true},{"upTo":4.99,"rate":0.26,"deduction":0,"flat":true},{"upTo":9.99,"rate":0.23,"deduction":0,"flat":true},{"upTo":19.99,"rate":0.14,"deduction":0,"flat":true},{"upTo":null,"rate":0.10,"deduction":0,"flat":true}]'::jsonb,
 'Taxa autónoma de IRS sobre rendas (Cat. F) por duração do contrato em anos (art. 72.º CIRS). Por confirmar.')
ON CONFLICT (tax, scope, valid_from) DO NOTHING;
