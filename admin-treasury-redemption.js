(() => {
  'use strict';

  const originalRefresh = refresh;
  refresh = async function refreshWithRedemptionEstimates() {
    await originalRefresh();
    if (!token()) return;
    data.redemptionEstimates = await safeCall(
      '/payment/admin/redemption-estimates',
      { estimates: [], quoteRule: '' },
    );
    if (tab === 'financeiro') renderFinanceiro();
  };

  function estimateFor(paymentId) {
    return (data.redemptionEstimates?.estimates || []).find(
      (estimate) => estimate.paymentId === paymentId,
    );
  }

  function quoteTime(value) {
    return value ? fmtDate(value) : '—';
  }

  function estimateBlock(payment, estimate) {
    if (!estimate || estimate.error) {
      return `<div class="rule-box bad"><b>Estimativa indisponível</b><br>${esc(
        estimate?.error || 'Atualize o painel para consultar a cotação segura.',
      )}</div>`;
    }

    const cashTone = estimate.canPayFromTreasury ? 'goodbox' : 'critical';
    const cashText = estimate.canPayFromTreasury
      ? 'Caixa BRL e reserva USDC suficientes para pagar sem vender USDC.'
      : `Liquidação pelo caixa bloqueada. Falta ${brl(
          estimate.shortageBrl || 0,
        )} em BRL e/ou ${n(estimate.reserveShortageUsdc || 0, 8)} USDC na reserva contábil.`;

    return `<div class="rule-box"><b>Estimativa segura de devolução</b><br>
      USDC reservado: <b>${n(estimate.reservedUsdc, 8)} USDC</b><br>
      Cotação da solicitação: ${brl(estimate.requestRate)} por USDC<br>
      Bid atual: ${brl(estimate.currentBid)} por USDC<br>
      Cotação segura usada: <b>${brl(estimate.safeSellRate)}</b><br>
      BRL bruto estimado: ${brl(estimate.grossBrl)}<br>
      Fee Nexa (${n(estimate.nexaExitFeePercent, 2)}%): − ${brl(
        estimate.nexaExitFeeBrl,
      )}<br>
      Woovi / Pix Out: − ${brl(estimate.wooviPixOutFeeBrl)}<br>
      <b>Pix líquido estimado: ${brl(estimate.estimatedNetBrl)}</b><br>
      Saída total do caixa: ${brl(estimate.cashRequiredBrl)}<br>
      <small>Fonte: ${esc(estimate.source)} · consultado ${quoteTime(
        estimate.fetchedAt,
      )} · regra: menor entre cotação da solicitação e bid atual.</small>
    </div><div class="card ${cashTone}"><b>${cashText}</b><br>
      Caixa BRL disponível: ${brl(estimate.operationalBrlAvailable || 0)}<br>
      Reserva USDC disponível: ${n(estimate.reserveUsdcAvailable || 0, 8)} USDC
    </div>`;
  }

  renderFinanceiro = function renderFinanceiroWithTreasuryEstimate() {
    const rows = payments().slice().sort(
      (left, right) => new Date(right.createdAt) - new Date(left.createdAt),
    );
    const open = rows.filter((payment) =>
      ['pending', 'processing'].includes(String(payment.status).toLowerCase()),
    );
    const prepared = open.filter(
      (payment) => payment.settlementMetadata?.treasuryCashPrepared,
    );

    $('content').innerHTML =
      `<div class="grid">${card(
        'Resgates aguardando',
        open.length,
        open.length ? 'warn' : 'ok',
      )}${card(
        'Prontos para Pix com caixa BRL',
        prepared.length,
        prepared.length ? 'ok' : '',
      )}${card(
        'USDC reservado',
        `${n(open.reduce((sum, payment) => sum + Number(payment.amountUsdc || 0), 0), 8)} USDC`,
      )}${card(
        'Pix líquido estimado',
        brl(
          open.reduce(
            (sum, payment) =>
              sum + Number(estimateFor(payment.id)?.estimatedNetBrl || 0),
            0,
          ),
        ),
      )}</div>` +
      '<div class="card notice"><b>Opções de liquidação:</b> use o caixa BRL para manter o USDC na tesouraria, ou registre uma venda real quando o caixa não for suficiente. A cotação segura é sempre o menor valor entre a cotação da solicitação e o bid atual.</div>' +
      `<div class="grid2">${
        open
          .map((payment) => {
            const client = clientById(payment.userId);
            const trade = tradeForPayment(payment.id);
            const estimate = estimateFor(payment.id);
            const metadata = payment.settlementMetadata || {};
            const treasuryPrepared = Boolean(metadata.treasuryCashPrepared);
            const actualSalePrepared =
              !treasuryPrepared && Number(payment.settledAmountBrl || 0) > 0;

            let actions = '';
            if (treasuryPrepared) {
              actions = `<div class="rule-box goodbox"><b>Valor congelado para pagamento pelo caixa BRL</b><br>
                Pix ao cliente: ${brl(payment.settledAmountBrl)}<br>
                Pix Out: ${brl(payment.pixOutFeeBrl)}<br>
                USDC mantido na tesouraria: ${n(payment.amountUsdc, 8)} USDC
              </div><button class="green" onclick="openTreasuryCashPayout('${payment.id}',${Number(
                payment.settledAmountBrl || 0,
              )},${Number(payment.pixOutFeeBrl || 0)})">Registrar Pix enviado</button>`;
            } else if (actualSalePrepared) {
              actions = `<div class="rule-box"><b>Venda real registrada</b><br>
                Venda líquida: ${brl(payment.saleProceedsBrl)}<br>
                Fee Nexa: ${brl(payment.nexaFeeBrl)}<br>
                Pix Out: ${brl(payment.pixOutFeeBrl)}<br>
                <b>Pix obrigatório: ${brl(payment.settledAmountBrl)}</b>
              </div><button class="green" onclick="openRedemptionPayout('${payment.id}',${Number(
                payment.settledAmountBrl || 0,
              )},${Number(payment.pixOutFeeBrl || 0)})">Registrar Pix enviado</button>`;
            } else {
              const treasuryButton = estimate?.canPayFromTreasury
                ? `<button class="green" onclick="prepareTreasuryCash('${payment.id}')">Congelar valor e pagar com caixa BRL</button>`
                : '<button class="ghost" disabled>Caixa BRL/reserva insuficiente</button>';
              actions = `${treasuryButton}<button onclick="openRedemptionSale('${payment.id}',${Number(
                payment.amountUsdc || 0,
              )})">Registrar venda real de USDC</button>`;
            }

            return `<div class="card"><div class="eyebrow">RESGATE #${esc(
              payment.id.slice(0, 8),
            )}</div><h2>${n(payment.amountUsdc, 8)} USDC</h2><p><b>Cliente:</b> ${esc(
              client.fullName || payment.userId,
            )}<br><b>Chave Pix:</b> ${esc(
              payment.pixKey || '—',
            )}<br><b>Solicitado:</b> ${fmtDate(
              payment.createdAt,
            )}<br><b>Prazo:</b> até 24 horas<br><b>Trade:</b> ${esc(
              trade?.id || (treasuryPrepared ? 'não necessário' : 'aguardando'),
            )}</p>${estimateBlock(payment, estimate)}<div class="row-actions">${actions}<button class="red" data-reject-redemption="${payment.id}" onclick="rejectRedemption('${payment.id}')">Rejeitar e devolver USDC</button></div></div>`;
          })
          .join('') ||
        '<div class="card goodbox"><h3>Nenhum resgate aguardando.</h3></div>'
      }</div>`;
  };

  window.prepareTreasuryCash = async function prepareTreasuryCash(paymentId) {
    const estimate = estimateFor(paymentId);
    if (!estimate?.canPayFromTreasury) {
      return toast('Caixa BRL ou reserva USDC insuficiente.', true);
    }
    if (
      !confirm(
        `Congelar o Pix líquido em ${brl(
          estimate.estimatedNetBrl,
        )} e manter ${n(estimate.reservedUsdc, 8)} USDC na tesouraria?`,
      )
    ) {
      return;
    }
    try {
      await call(
        `/payment/manual-redemption/${encodeURIComponent(
          paymentId,
        )}/treasury-cash/prepare`,
        { method: 'POST' },
      );
      toast('Valor congelado. Registre o Pix após o envio real.');
      await refresh();
    } catch (error) {
      toast(error.message, true);
    }
  };

  window.openTreasuryCashPayout = function openTreasuryCashPayout(
    paymentId,
    finalAmount,
    pixFee,
  ) {
    openModal(
      `<h2 id="modalTitle">Pagar pelo caixa BRL</h2><div class="rule-box">O USDC não será vendido. O cliente deve receber exatamente <b>${brl(
        finalAmount,
      )}</b> e a tesouraria manterá o USDC reservado.</div><div class="form-grid"><div class="form-field"><label>Pix ao cliente</label><input id="treasuryPayout" value="${String(
        finalAmount,
      ).replace('.', ',')}" readonly></div><div class="form-field"><label>Tarifa Woovi / Pix Out</label><input id="treasuryPixFee" value="${String(
        pixFee,
      ).replace('.', ',')}" readonly></div><div class="form-field full"><label>Referência real do Pix</label><input id="treasuryPayoutRef" placeholder="EndToEndId / correlationID"></div><div class="form-field full"><label>Observação</label><textarea id="treasuryPayoutNote">Pagamento com caixa BRL; USDC mantido na tesouraria</textarea></div></div><button class="green" onclick="confirmTreasuryCashPayout('${paymentId}')">Confirmar Pix real</button>`,
    );
  };

  window.confirmTreasuryCashPayout = async function confirmTreasuryCashPayout(
    paymentId,
  ) {
    const actualCustomerPayoutBrl = parseMoney($('treasuryPayout').value);
    const actualPixOutFeeBrl = parseMoney($('treasuryPixFee').value);
    const payoutReference = $('treasuryPayoutRef').value.trim();
    const note = $('treasuryPayoutNote').value.trim();
    if (payoutReference.length < 4) {
      return toast('Informe a referência real do Pix.', true);
    }
    if (
      !confirm(
        `Confirma o Pix real de ${brl(
          actualCustomerPayoutBrl,
        )} sem venda de USDC?`,
      )
    ) {
      return;
    }
    try {
      await call(
        `/payment/manual-redemption/${encodeURIComponent(
          paymentId,
        )}/treasury-cash/confirm`,
        {
          method: 'POST',
          body: JSON.stringify({
            payoutReference,
            actualCustomerPayoutBrl,
            actualPixOutFeeBrl,
            note,
          }),
        },
      );
      closeModal();
      toast('Pix concluído; USDC reclassificado para a tesouraria.');
      await refresh();
    } catch (error) {
      toast(error.message, true);
    }
  };
})();
