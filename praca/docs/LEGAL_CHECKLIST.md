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

## Acrescentos da fase 2

- [ ] **FSBO/prospeção**: confirmar a base legal (interesse legítimo + teste de ponderação documentado), o direito de oposição e a política de retenção dos contactos criados; mensagens eletrónicas não solicitadas a pessoas singulares exigem consentimento (Lei n.º 41/2004).
- [ ] **Relatórios de avaliação**: rever o aviso («estimativa indicativa») e se a marca da agência nos PDF/SmartLinks pode induzir a ideia de avaliação certificada.
- [ ] **Pagamentos**: termos de subscrição, trial de 14 dias, renovação automática, direito de livre resolução, faturação com IVA e NIF (Stripe Tax/portal), RAL.
- [ ] **API e webhooks**: termos de utilização da API (limites, revenda, atribuição) e DPA com clientes que recebam dados por webhook.
- [ ] **Partilha de comissões** entre agências: o acordo comercial é entre as agências; confirmar que a Praça apenas regista a proposta.
- [ ] **Feeds de agências**: contrato de cedência de anúncios e de fotografias; a licença fica registada em `sources.licence`.
- [ ] **Auditoria**: período de conservação do `audit_log` e dos `consents`.

## Acrescentos da fase 3
- [ ] **Newsletter:** texto de consentimento revisto por jurista (`newsletter.consent`); dupla confirmação e cancelamento num clique já implementados; a versão do consentimento fica registada (`CONSENT_VERSION` em `src/server/newsletter.ts`). Mudar o texto exige subir a versão.
- [ ] **WhatsApp:** só mensagens por template aprovado e só para números verificados por código. Política de privacidade deve citar a Meta como subcontratante. Confirmar a base legal para alertas (consentimento).
- [ ] **Push:** subscrição só depois de o utilizador carregar no botão e aceitar a permissão do navegador. Mencionar na política de privacidade.
- [ ] **Antifraude:** os sinais mostrados ao público estão em linguagem neutra e remetem para cautela, não acusam o anunciante. Rever o texto com jurista (risco de difamação) e definir o processo de reclamação e correção por parte do anunciante.
- [ ] **Selo «verificado»:** definir o procedimento interno (que documentos, quem verifica, quanto tempo vale) antes de o usar comercialmente. A prova fica em `listing_verifications`.
- [ ] **Preço justo:** é uma estimativa a partir de preços pedidos. O aviso «não substitui avaliação bancária ou pericial» deve manter-se visível. Confirmar que não constitui «avaliação imobiliária» regulada.
- [ ] **Camadas de risco:** confirmar a licença de cada fonte importada e citar a fonte, a data e a licença (já mostrados na ficha).
- [ ] **Isócronas:** cumprir os termos do openrouteservice (atribuição OpenStreetMap/HeiGIT).
