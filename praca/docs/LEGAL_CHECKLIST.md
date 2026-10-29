# Checklist legal (validar com advogado antes do lançamento)

- [ ] **Entidade**: denominação, NIF, sede, contactos no rodapé e em `/contactos` (`NEXT_PUBLIC_ENTITY_*`).
- [ ] **Mediação imobiliária (Lei n.º 15/2013)**: se a Praça anunciar/mediar, licença AMI e seguro; se apenas agregar anúncios de terceiros, validar o enquadramento. Mostrar o n.º AMI em `NEXT_PUBLIC_ENTITY_AMI` quando aplicável. Verificação de licenças AMI de utilizadores é manual (estado `pending`).
- [ ] **Livro de Reclamações Eletrónico**: registo da entidade em livroreclamacoes.pt e link no rodapé.
- [ ] **RGPD**: RoPA, DPA com subcontratantes (Supabase/Neon, Vercel, Resend, Stripe), avaliação de impacto se houver perfis, política de retenção (mensagens 24 meses), base legal para contactar particulares (FSBO — interesse legítimo, art. 6.º(1)(f), com teste de ponderação e opt-out; atenção à Lei das Comunicações Eletrónicas para marketing).
- [ ] **Cookies**: o banner regista consentimento granular e não carrega estatística sem consentimento. Confirmar texto e categorias (CNPD).
- [ ] **Termos e Privacidade**: os textos em `messages/*.json` são modelos curtos — substituir.
- [ ] **Preços e estimativas**: aviso de que são indicativos e não avaliação (Regulamento de avaliação bancária); revisão da linguagem de "preço justo" (Fase 3) para não induzir em erro (DL 57/2008 práticas comerciais desleais).
- [ ] **Direitos de autor**: fotografias e descrições dos anunciantes — licença nos termos do anunciante.
- [ ] **Dados de transação e registo predial**: só com licença/acordo escrito.
- [ ] **Acessibilidade (DL 83/2018)**: auditoria WCAG 2.2 AA e declaração de acessibilidade.
- [ ] **Consumo**: RAL (arbitragem de consumo), preços com IVA nos planos pagos, direito de livre resolução (14 dias) e trial.
