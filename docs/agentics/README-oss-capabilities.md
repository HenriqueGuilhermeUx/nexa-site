# Nexa Agentics — catálogo OSS de capacidades (proposta isolada)

Este diretório contém apenas um contrato declarativo para alinhamento entre projetos.
**Não é carregado por código de produção** e não altera a implementação da PR #172.
O repositório nexa-site é o local atual deste artefato de coordenação;
o backend/núcleo correto deverá importar uma versão revisada e assinada do catálogo
quando o repositório central Agentics for identificado e auditado.

Capacidades propostas:
1. legal.norm_source_lookup: NexJud + ctresb/leis; a fonte oficial precisa ser conferida.
2. creative.storyboard_export: MODO + HyperFrames; apenas export de HTML de preview.
3. browser.page_inspect: Camofox; desligado até revisão de termos de sites e hardening.
4. research.alpha_list: F-Insight + Vibe; backend opt-in e protegido.
5. risk.portfolio_scenarios: conceitos de AutoHedge, sempre simulação, sem ordens.
6. terminal.financial_research: Fincept bloqueado até análise AGPL/licenciamento.

Regras: tudo desativado inicialmente; isolamento por tenant, escopo de acesso por
produto, chaves somente no vault, auditoria, dados externos tratados como não
confiáveis e aprovação humana para mudanças com efeitos externos.

Antes de qualquer ativação: revisão de segurança e licenciamento, CI e teste
end-to-end em staging, integração com RLS/autorização existente, limites de
chamadas/custo, consentimento e trilhas de auditoria. Nunca conectar
diretamente a uma chave privada, conta bancária ou produção financeira.
