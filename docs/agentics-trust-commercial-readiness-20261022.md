# Nexa Agentics Infrastructure + Nexa Trust Data Security
## Pacote comercial e gates operacionais — 22/10/2026

**Propósito:** disponibilizar ofertas B2B para avaliação comercial e contratação de projetos delimitados sem confundir demonstração ou testes de segurança em laboratório com software SaaS em produção. **Não constitui contrato, garantia, certificação, SLA nem prova de segurança de dados reais.**

## Posicionamento e portfólio

| SKU comercial (proposto) | Cliente | Entregáveis comercializáveis agora, mediante instrumento | Depende de homologação |
|---|---|---|---|
| Nexa Agentics Infrastructure | Fintechs, ERPs, negócios de serviços, instituições | Descoberta de casos de uso; inventário e classificação de ferramentas; desenho de workflow/estados; matriz de aprovação; arquitetura de integração; protótipo isolado com dados fictícios | API multiempresa de produção, SDK, white-label, escalabilidade/SLA, execução com dados e contas reais |
| Nexa Trust Data Security | Empresas com apps, dados ou agentes | Diagnóstico de acesso/identidade; modelo de escopos, papéis e tenants; plano de trilha de auditoria; matriz de controle e testes de revogação; piloto isolado | Serviço gerenciado de segurança, RLS/PITR hospedados demonstrados, conectores/credenciais de clientes, autorização de dados reais e suporte contínuo |
| Nexa Enterprise (Agentics + Trust) | Empresas com automação supervisionada e requisitos de governança | Arquitetura conjunta, avaliação de segurança, processo de aceite, piloto de tarefas read-only sobre dados fictícios | Operação contínua com tenants externos, autenticação de produção e agentes com efeitos externos |

**Produto de segurança independente:** o Trust **não exige** a contratação de Agentics. O escopo comercial separa o diagnóstico/projeto de políticas do fornecimento futuro de serviço gerenciado, que não está disponível.

## Modelo de receita a validar

1. **Diagnóstico B2B** — preço fechado e prazo somente após escopo, entregáveis e contrato. Pode ser contratado antes da licença.
2. **Piloto privado** — projeto com duração, teto de esforço, dados de teste, objetivo de aceite, responsáveis e custos definidos por proposta.
3. **Licença operacional futura** — taxa de implantação mais mensalidade/licença por organização, limites de agentes, usuários, conectores e consumo, com SLA e suporte contratados após homologação. **Não aceitar mensalidade de SaaS operacional por capacidades ainda inexistentes.**
4. **Trust standalone** — pacote diagnóstico/piloto separado. Futuro serviço gerenciado somente após auditoria, monitoramento e obrigações contratuais.

Não publicar valores inventados; não prometer retorno, disponibilidade 24/7, execução financeira, garantia de prevenção de incidentes, certificação ISO/SOC ou adequação automática à LGPD.

## Processo comercial e triagem

**Canal público existente verificado no site Nexa:** `contato@trynexa.com.br`; WhatsApp `https://wa.me/5511947984328`. As páginas `/agentics/empresas` e `/agentics/trust` usam links diretos sem formulário, sem analytics adicional, sem cookies e sem endpoints de captura/armazenamento novos.

1. Receber apenas descrição do problema, setor, escala aproximada e contato comercial voluntário.
2. **Não solicitar por e-mail ou WhatsApp** CPF, documentos, credenciais, chaves, dados financeiros, dados de saúde ou base de clientes.
3. Fazer discovery de finalidade, riscos e limites. Determinar se há dados pessoais, sensíveis, financeiros ou dados de terceiros.
4. Enviar proposta contendo escopo, exclusões, marcos/entregáveis, ambiente de trabalho, proprietário dos dados, esforço, preço, aceite e confidencialidade.
5. Piloto somente após aprovação de ambiente segregado, identidade, dataset fictício, licença de uso e nenhuma conexão a produção.
6. Acesso a dados reais somente depois de contrato, fundamento jurídico, autenticação, autorização explícita, arquitetura segura, DPA e testes de isolamento.
7. Documentar resultado e critérios de passagem para produto operacional, sem ativação implícita.

## Arquitetura proposta — verificações obrigatórias

### Agentes
- Identidade de agente separada de usuário, finalidade e escopo; catálogo allowlist por ferramenta.
- Estados de tarefa rastreáveis; interações idempotentes; checkpoints de aprovação; revogação e capacidade de pausa.
- Ferramentas isoladas por tenant; credenciais em cofre; nenhuma chave de cliente exposta em prompts/outputs.
- Política explícita de negação de transferências, swap, saque, pagamento, compra, assinatura ou escalonamento de privilégio nos pilotos iniciais.
- Fluxos de entrada não confiáveis tratados com mitigação de prompt injection, validação de saídas e revisão humana antes de qualquer efeito externo.

### Dados e Trust
- Identidade e autenticação robustas; tokens de propósito/escopo limitados e expirados; revogação verificável.
- Autorização por recurso/tenant; perfis PF e PJ segregados; ações de agente não recebem a permissão do usuário por padrão.
- Princípio do menor privilégio; verificação de isolamento RLS com atores distintos; papéis não proprietários da base.
- Minimização e classificação; armazenamento e transmissão protegidos **conforme controles efetivamente implantados**, com matriz de retenção e descarte.
- Logs de segurança e auditoria sem PII excessivo, mascaramento de segredos, alertas e processo de incidente.
- Backup, PITR, restauração demonstrada, testes de falha fechada, resposta a incidentes e rotação de segredos.
- Subprocessadores, transferências internacionais de dados, localidade dos dados, segregação física/lógica e limites por contrato, quando relevantes.
- Teste de isolamento entre dois tenants, tentativa de acesso cruzado, token revogado, perda de conexão, bypass de role e rollback antes de abrir ambiente real.

**Gates operacionais obrigatórios, NO-GO enquanto pendentes:**
1. Homologação RLS/PITR em ambiente privado verificável.
2. Modelo de autorização PF/PJ e multi-tenant validado em Nest e banco; sem confiar em claims autoatribuídos.
3. Emissor Trust e autenticação de clientes com revogação operacional, segredo separado da Wallet, rotação, rate limiting, proteção a replay e auditoria.
4. Prova de reconciliação de fontes financeiras e de nenhum caminho de execução financeira habilitado para agentes em beta read-only.
5. Pipeline CI para build, teste de penetração/revisão de segurança proporcional ao risco, rollback e observabilidade.
6. Acordo formal com o cliente, critérios de aceite, inventário de provedores, matriz RACI e condições de acesso/uso de dados.
7. Análise jurídica e responsabilidades LGPD conforme contexto. A Lei 13.709/2018, art. 46, exige medidas técnicas/administrativas e segurança desde a concepção; o rótulo comercial Nexa Trust não equivale a certificação.

## Papéis contratuais e documentos

Antes de qualquer processamento com dados de clientes, elaborar e revisar por responsável jurídico:
- Proposta e SoW (escopo, entregáveis, critérios de aceite, exclusões e preço).
- NDA/confidencialidade.
- Termos de licença ou serviços.
- Acordo de tratamento de dados (DPA), identificando controlador e operador caso a caso, subprocessadores, instruções, retenção, deleção, acesso e subcontratação.
- SLA apenas com métricas comprovadamente sustentáveis; manutenção, limites, suporte e continuidade.
- Política de segurança aplicável, matriz de acesso, logs, controles e plano de resposta a incidentes.
- Plano de descontinuação, exportação/devolução e eliminação de dados.
- Política sobre uso de dados em modelos/treinamento e armazenamento por provedores, validada por contrato (não presumir).
- Avaliação de transferência internacional e outras obrigações aplicáveis por setor.

## Evidência técnica inicial, NÃO prova comercial de produção

- Backend `HenriqueGuilhermeUx/nexa-backend1` PR #172: núcleo Agentics homologado isoladamente, não merged.
- PR #185: Trust, Premium e testes de segurança em PostgreSQL 17 descartável, não merged e não ativo em produção.
- Ambiente Render de homologação usa SHA original `1b850c0...`, não a última PR #185.
- Site `trynexa.com.br/agentics/beta` já publicado; indica corretamente que Premium de leitura real ainda está fechado.
- O novo catálogo B2B é **uma apresentação comercial e oferta de serviços de avaliação/piloto**, não uma API SaaS pública nem política de segurança aplicável ao cliente por simples cadastro.

## Ordem sugerida

**Agora:** divulgar páginas comerciais e abrir contato para propostas de diagnóstico e piloto isolado, após CI e aprovação editorial da PR do site. Não coletar informações sensíveis.

**Depois:** definir templates de SoW/DPA/aceite para casos B2B; preparar demo isolada multitenant e critérios de aceite reproduzíveis; instrumentar governança de tenant e auditoria.

**Só após homologação:** oferecer licença gerenciada/white-label, integração de dados reais e agentes com efeitos externos. Agentes financeiros têm gates regulatórios, contábeis e operacionais adicionais.

## Referências oficiais

- [Lei Geral de Proteção de Dados (LGPD), especialmente art. 46](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm).
- [Guia orientativo ANPD — agentes de tratamento e encarregado](https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia-orientativo-para-definicoes-dos-agentes-de-tratamento-de-dados-pessoais-e-do-encarregado).

**Não inserir segredos, nomes pessoais de clientes, extratos ou dados sensíveis neste documento.**
