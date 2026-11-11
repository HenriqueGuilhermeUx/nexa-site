# Nexa — diagnóstico de dificuldade na verificação de identidade
Atualizado: 11/11/2026 · Escopo: Nexa PF Brasil · Operação de suporte e qualidade de serviço

## Objetivo
Entender por que parte dos novos cadastros não inicia a sessão Didit, sem tentar concluir KYC por conta do titular, receber documentos fora da Didit, pressionar depósitos ou presumir falha individual com base em dados agregados.

## Entrega web
- Página pública `/ajuda-verificacao.html` com formulário estático Netlify Forms (`nexa-kyc-feedback`).
- Pergunta obrigatória com motivos fechados: não encontrou a verificação; login; botão; abertura Didit; câmera/documento; segurança/privacidade; preferência por adiar; outro.
- Pergunta opcional de dispositivo: Android, iPhone, computador, outro.
- Sem nome, email, CPF, telefone, arquivos, session_id ou identificador do cliente no formulário.
- Envio voluntário com honeypot. Confirmação em `/ajuda-verificacao-enviado`. A resposta não autentica nem altera a conta.
- Links em cadastro, ajuda e guia. Apoio individual pelos canais oficiais, iniciados pelo próprio cliente.

## Avaliação de contato pontual aos recém-cadastrados
Uma mensagem operacional de acompanhamento sobre o cadastro não é uma oferta financeira; mesmo assim, antes de usar a base existente:
1. Documentar finalidade específica de suporte, necessidade, transparência, base legal aplicável e teste de ponderação quando houver legítimo interesse; avaliação responsável pelo controlador segundo guia ANPD.
2. Selecionar apenas contas realmente cadastradas, ativas, com KYC pendente e sessão Didit ausente; não tratar aprovação como pendência.
3. Excluir destinatários de mensagens devolvidas (bounce), bloqueadas, recusas explícitas ou pedidos de não contato. Evitar múltiplos envios e manter log de idempotência.
4. Usar **apenas um e-mail de suporte** sem convite a investimento, compra de USDC ou depósito. Nunca pedir CPF, documento, foto, selfie, senha ou código por resposta.
5. Confirmar remetente de domínio verificado e alternativa de suporte funcional. O formulário público não é canal para documentos ou solicitação de desbloqueio de conta.
6. Não enviar mensagens WhatsApp proativas até análise das restrições da Meta/Kapso e autorização aplicável.
7. Não iniciar contato posterior em massa por ausência de resposta; analisar resultados agregados.

### E-mail proposto — único contato operacional
**Assunto:** Nexa — você encontrou alguma dificuldade para verificar sua identidade?

Olá!

Percebemos que sua conta Nexa foi criada, mas ainda não identificamos o início da verificação de identidade. Queremos entender se algo no processo não ficou claro ou não funcionou.

Se teve alguma dificuldade, você pode nos contar em menos de 30 segundos, sem identificar sua conta:
https://trynexa.com.br/ajuda-verificacao.html

Você também pode continuar pelo portal oficial:
https://trynexa.com.br/portal/

Se preferir ajuda individual, converse com o Theo pelo Telegram:
https://t.me/NexaTheoBot

A pesquisa é opcional. Nunca envie CPF, documentos, fotos, senhas ou códigos por e-mail ou chat. O KYC acontece somente a partir do portal e do ambiente seguro da Didit.

Este é um único contato de suporte relacionado ao cadastro, não uma campanha de ofertas, depósitos ou investimentos.

Equipe Nexa

## Leitura de respostas
No Netlify, abrir Forms > `nexa-kyc-feedback`. Registrar somente contagens por opção/dispositivo para priorizar correções. As respostas não comprovam falha técnica nem identificam contas; comparar com logs técnicos agregados de login, /lifecycle/me, /kyc/didit/me e /kyc/didit/brazil/start sem correlacionar indivíduos indevidamente. Estabelecer política de retenção curta e exclusão de submissões após análise.

## Gates não concluídos só por esta entrega
- Registrar a detecção do formulário no Netlify após deploy.
- Confirmar que uma submissão voluntária pode ser recebida e lida com sucesso; evitar criar resposta falsa de cliente no painel.
- Confirmar o remetente/reply path e avaliar o contato de suporte antes do primeiro disparo a clientes.
- KYC real iniciado somente quando o titular fizer login, consentir e abrir a Didit.
