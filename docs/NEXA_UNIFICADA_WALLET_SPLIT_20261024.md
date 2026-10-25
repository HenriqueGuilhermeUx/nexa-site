# Nexa unificada + Nexa Wallet em subdomínio — plano de transição sem regressão

**Data:** 24/10/2026
**Status:** preparação em branch isolada. Acesso, domínio, DNS, login, dados, Pix, Privy e produção não alterados.

## Marca e experiência
- **Nexa**: nome único da experiência de vida e finanças pessoais, com Maya, gestão financeira, oportunidades, F-Insight, agentes e Cripto & Wallet.
- **`https://trynexa.com.br/`**: página principal institucional da marca, visual azul-marinho/ciano atual.
- **`https://trynexa.com.br/meu-espaco/`**: caminho reservado para a futura aplicação da experiência pessoal, após CI/E2E. **Não criar esse redirecionamento enquanto não existir app operacional e autorizado**; a atual preview permanece isolada.
- **`https://wallet.trynexa.com.br/`** (proposto): landing Wallet original e Portal Privy no mesmo host em `/portal/`, somente depois de DNS, SSL, CORS e identidades verificados.
- **PWA:** o manifesto atual `manifest.webmanifest` pertence à Nexa Wallet (ID `/wallet-v148.html`, start URL `/wallet-v148.html`, escopo `/`). Ele e a instalação atual devem permanecer intactos. A nova homepage Nexa não inclui esse manifesto nem registra `sw.js`; a futura experiência Life OS terá manifesto e scope próprios sem conflitar com a Wallet. A instalação existente continua abrindo o endereço antigo da Wallet.
- **`https://trynexa.com.br/portal/`, `/cadastro`, `/login`, `/app`, `/depositos`, `/painel`, `/historico`**: rotas antigas preservadas durante transição; NÃO mudar redirects 301 nem retirá-los antes de provar compatibilidade.
- **`https://trynexa.com.br/pj`**, **`/agentics`**, **`/global`**, **`/identity`**, **`/admin`**, **`/api/v1/*`**: preservar sem alterações.

## Evidência de infraestrutura / origens
- Netlify principal: site ID `4fb297e1-cf10-4f20-a765-1c6658bb65db`, site original `fascinating-twilight-5ce04d`.
- O frontend transacional é compilado pelo script `scripts/build-site.mjs`, que clona `HenriqueGuilhermeUx/nexa-react-app` no commit PINNED e o publica em `/portal/`. Variáveis `VITE_PRIVY_APP_ID`, `VITE_PRIVY_CLIENT_ID` são públicas, mas qualquer secret fica somente no servidor. **Não mudar os commits PINNED neste projeto**.
- API original da Wallet: `https://nexa-backend-p2u0.onrender.com/api/v1`. Preservar tokens, profile, validação Privy, Pix/USDC, reconciliações e ordens.
- O portal usa tokens Nexa próprios em storage do **origin**. Mudança de host **não migra localStorage/sessionStorage**, nem permite copiar sessão: o cliente fará login no domínio novo com identidade verificada; o mesmo identificador/endereços Privy devem ser preservados.
- Nexa Life OS: código no repo `HenriqueGuilhermeUx/nexoffice` PR #86 (DRAFT), preview API+UI isolada, banco Neon PF separado. Renomeação é **visual/de produto**, sem renomear tabelas, rotas ou chaves históricas à força.

## Como evolui o Portal Wallet sem quebrar nada
1. Validar a nova homepage principal e a landing original `wallet.html` em branch deploy Netlify; comparar links e metadados, acessibilidade e mobile. `/wallet` na mesma origem pode apontar à landing preservada com rewrite 200.
2. **Adicionar `wallet.trynexa.com.br` como domain alias** ao site Netlify atual (ou criar site próprio só após clonar e homologar a configuração inteira). Rewrites por domínio só operam depois que a alias estiver atribuída ao site e DNS/HTTPS resolvidos.
3. Atualizar lista autorizada do **Privy** para o origin HTTPS exato e validar email OTP, recuperação da carteira existente, wallet id, endereço on-chain e autorização de assinatura; nunca recriar carteira por não encontrar sessão no novo origin.
4. Revisar **CORS / redirect_uri / allowed origins do backend Nexa**, callbacks, domínio cookies (se usados), CSP, referrer, service workers, PWA manifest e caminhos de assets. Fazer em staging primeiro, sem relaxar para origin genérico.
5. Para usuário antigo: login Nexa no novo host, leitura de `/direct-settlement/profile` na API existente, mesmo Privy User ID e **mesmo endereço de carteira**; histórico, USDC e saldo reconciliados; Pix entrada/saída sem duplicação; teste wallet-connect com carteira externa requer permissão explícita.
6. Validar Android e iOS / PWA: deep links, universal links, lojas, links de e-mails, atualização sem limpar cache, sem perda de sessões atuais. **Não alterar AAB/IPA nesta etapa.**
7. Somente após evidência E2E e plano de rollback, ativar novas CTAs `wallet.trynexa.com.br`, mantendo `/portal/` atual funcionando. Não mover por redirect 301 irreversível ou compartilhar tokens entre hostnames.

## Cripto dentro da Nexa principal
- Área Cripto & Wallet na UI do novo aplicativo, incluindo ambiente do **Nico**, como ponto de acesso ao portal original.
- O fluxo Privy/WalletConnect **permanece exclusivamente na Wallet existente**. Criar nova carteira embutida só após autenticação Nexa e confirmação de identidade/OTP por usuário elegível; nunca no navegador do Nexa Life OS ou a partir de simples click sem login.
- Sem compartilhamento implícito PF ↔ Wallet; futura unificação precisa de identidade e consentimento específico, autorização server-to-server de escopo mínimo, revogação, auditoria e token bound ao público correto.
- Brasil e Global têm operações distintas; entrada USDC de carteiras externas: tarifa Nexa aprovada de 0% (taxas de rede/provedores não incluídas). Não duplicar a implementação de conexão já em andamento.
- Nenhuma operação financeira ou criação de carteira foi iniciada por esta mudança de site.

## Preflight automatizado do domínio Wallet (sem transações)
- Script disponível: `scripts/check-wallet-domain.mjs`. A execução padrão `node scripts/check-wallet-domain.mjs` **não acessa a internet**, apenas verifica a configuração. O CI valida que essa modalidade não realiza operações.
- Depois que DNS, TLS e alias Netlify estiverem validados, rode manualmente no ambiente de testes: `NEXA_WALLET_DOMAIN_PREFLIGHT=true node scripts/check-wallet-domain.mjs`. O host é fixo `wallet.trynexa.com.br`; o script faz apenas GET HTTPS para a landing Wallet, `/portal/`, manifesto PWA e página Wallet v148. Falha se redirecionar ou se a home for da Nexa geral no host da Wallet.
- O resultado **não comprova** acesso Privy, OTP, vínculos de carteiras, endereço on-chain, saldos, Pix ou transações. Homologar essas operações em cenário controlado, sem valor real.
- A verificação fica inativa por padrão, pois `wallet.trynexa.com.br` ainda não está confirmado no Netlify/DNS.

## Rollback / invariantes
- Pré-condição: snapshot do DNS, domínios Netlify, config de deploy e origens Privy/Backend, e checks `old address -> old wallet -> same wallet address`.
- Rollback da homepage: publicar commit anterior do site original, preservando domínio e `/portal/`; a landing original foi preservada em `wallet.html`.
- O reverse proxy `/api/v1/*`, cron jobs, chaves, dados de clientes, ledger, Woovi, Foxbit, Privy Treasury, Pix In/Out, AAB e App Store Connect não são modificados.
- CI/QA gates: `node scripts/validate-unified-nexa.mjs`, `node scripts/validate-launch-site.js`, check de build site completo, E2E navegacional e de login/Privy, regressão Pix/USDC (read-only em QA; sem Pix real no teste).
- Dependência externa: CI GitHub do Nex Personal PR #86 está bloqueado sem runner (issue #89), portanto nenhuma publicação do novo app PF.

**Situação comercial:** F-Insight, vitrine de corretoras e Wallet estão preparados/conectados nas suas próprias fases; não prometer conectividade Open Finance, recomendação de investimentos, oferta real ou transação disponível sem prova no ambiente.
