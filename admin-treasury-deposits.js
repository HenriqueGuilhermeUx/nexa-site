/* Nexa Admin — Depósitos & Cobertura (read-only, fail-closed).
 * Consumes /api/v1/treasury-admin/deposit-operations only when backend is deployed.
 * Never uses estimates or ledger balances as provider liquidity.
 */
(function () {
  'use strict';
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) =>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const amount = (value, digits = 8) => {
    if (value === null || value === undefined || value === '') return 'Não comprovado';
    const number = Number(value);
    return Number.isFinite(number)
      ? number.toLocaleString('pt-BR', {maximumFractionDigits: digits})
      : 'Não comprovado';
  };
  const stateLabel = (value) => ({
    CONFIRMED_RECORD: 'Registro confirmado',
    REVIEW_REQUIRED: 'Exige revisão',
    PENDING: 'Pendente',
    FAILED: 'Falha',
  }[value] || 'A verificar');

  window.renderDepositOperationsPanel = function renderDepositOperationsPanel(snapshot) {
    if (!snapshot || snapshot.success !== true || snapshot.mode !== 'READ_ONLY_OPERATOR_ASSISTANCE') {
      return '<div class="card notice"><h3>Depósitos e cobertura · conferência por operação</h3>' +
        '<p>Consulta administrativa ainda não disponível neste backend. O painel financeiro existente permanece independente; ' +
        'nenhum valor de cobertura será presumido.</p></div>';
    }
    const safeArray = (v) => Array.isArray(v) ? v : [];
    const coverage = snapshot.coverage || {};
    const coverageState = coverage.providerBalancesVerified === true
      ? 'Comprovação do provedor exige revisão'
      : 'Não comprovada';
    const alerts = safeArray(snapshot.alerts).map((a) =>
      '<div class="note"><b>' + escapeHtml(a.key) + '</b> · ' +
      escapeHtml(a.severity) + '<p>' + escapeHtml(a.action) + '</p></div>').join('');
    const rows = safeArray(snapshot.settlements).slice(0, 50).map((s) =>
      '<tr><td><b>' + escapeHtml(s.id) + '</b><br><small>' +
      escapeHtml(s.fiatProvider || s.provider || 'Origem a verificar') + ' · ' +
      escapeHtml(s.fiatStatus || 'Status a verificar') + '</small></td>' +
      '<td>' + amount(s.grossBrl, 2) + ' BRL<br><small>Líquido: ' +
      amount(s.netBrlForUsdc, 2) + ' BRL</small></td>' +
      '<td>' + amount(s.obligationUsdcRecorded) + ' USDC</td>' +
      '<td>' + escapeHtml(String(s.linkedVerifiedDeliveryCount ?? 0)) + ' / ' +
      escapeHtml(String(s.linkedDeliveryCount ?? 0)) + '</td>' +
      '<td>' + escapeHtml(stateLabel(s.operation?.evidence)) + '<br><small>' +
      escapeHtml(s.operation?.reason || 'Conferência necessária') + '</small></td></tr>'
    ).join('');
    const uncertain = safeArray(snapshot.deliveries).filter((d) =>
      d.status === 'provider_uncertain');
    const uncertainRows = uncertain.map((d) => '<tr><td>' +
      escapeHtml(d.id) + '</td><td>' + amount(d.amountUsdc) +
      ' USDC</td><td>' + escapeHtml(d.operation?.reason || 'Investigar no provedor') +
      '</td></tr>').join('');

    return '<div class="card">' +
      '<h3>Depósitos e cobertura · revisão por operação</h3>' +
      '<p class="muted">Modo somente leitura. Informações de ledger, cotação e hash não comprovam liquidez. ' +
      'Nenhuma compra, transferência, crédito ou reprocessamento é feito neste painel.</p>' +
      '<div class="grid">' +
      '<div class="card"><h4>Cobertura disponível</h4><strong>' + escapeHtml(coverageState) +
      '</strong><p>USDC livre: ' + amount(coverage.availableUsdc) + '</p></div>' +
      '<div class="card"><h4>USDC adicional a comprar</h4><strong>' +
      amount(coverage.additionalUsdcToBuy) + '</strong><p>Sem recomendação de valor enquanto faltarem saldos comprovados.</p></div>' +
      '<div class="card"><h4>Entregas com confirmação incerta</h4><strong>' +
      uncertain.length + '</strong><p>Não reenviar USDC sem reconciliação.</p></div></div>' +
      '<h4>Alertas operacionais</h4>' +
      (alerts || '<p class="muted">Nenhum alerta retornado nesta consulta.</p>') +
      '<h4>Settlements Wallet-First</h4><div class="table-wrap"><table><thead><tr>' +
      '<th>Referência / Origem</th><th>Pix</th><th>Obrigação</th><th>Entregas verificadas / vinculadas</th><th>Próximo passo</th>' +
      '</tr></thead><tbody>' + (rows || '<tr><td colspan="5">Nenhum registro nesta consulta.</td></tr>') +
      '</tbody></table></div>' +
      '<h4>Entregas com provedor incerto</h4><div class="table-wrap"><table><thead><tr><th>ID</th><th>USDC</th><th>Orientação</th>' +
      '</tr></thead><tbody>' + (uncertainRows || '<tr><td colspan="3">Nenhuma entrega incerta na página consultada.</td></tr>') +
      '</tbody></table></div>' +
      '<p class="muted">Os depósitos legados e fiduciários podem se sobrepor. A cobertura permanece desconhecida sem verificação da Privy, Woovi, Foxbit e do gas.</p></div>';
  };
})();
