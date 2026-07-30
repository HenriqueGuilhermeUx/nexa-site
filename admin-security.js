(() => {
  'use strict';

  const MAX_IDLE_MS = 10 * 60 * 1000;
  let lastActivityAt = Date.now();

  function markActivity() {
    lastActivityAt = Date.now();
  }

  for (const eventName of ['click', 'keydown', 'pointerdown', 'touchstart']) {
    document.addEventListener(eventName, markActivity, { passive: true });
  }

  const originalRenderFinanceiro = renderFinanceiro;
  renderFinanceiro = function securedRenderFinanceiro() {
    originalRenderFinanceiro();

    document.querySelectorAll('#content .card').forEach((card) => {
      if (card.querySelector('[data-reject-redemption]')) return;
      const trigger = card.querySelector(
        'button[onclick^="openRedemptionSale"],button[onclick^="openRedemptionPayout"]',
      );
      if (!trigger) return;

      const raw = trigger.getAttribute('onclick') || '';
      const match = raw.match(/openRedemption(?:Sale|Payout)\('([^']+)'/);
      if (!match) return;

      const paymentId = match[1];
      const rejectButton = document.createElement('button');
      rejectButton.type = 'button';
      rejectButton.className = 'red';
      rejectButton.dataset.rejectRedemption = paymentId;
      rejectButton.textContent = 'Rejeitar e devolver USDC';
      rejectButton.onclick = () => rejectRedemption(paymentId);
      trigger.insertAdjacentElement('afterend', rejectButton);
    });
  };

  window.rejectRedemption = async function rejectRedemption(paymentId) {
    const reason =
      prompt(
        'Motivo obrigatório da rejeição. O USDC reservado será devolvido uma única vez:',
        'Chave Pix inválida ou solicitação recusada após conferência',
      ) || '';
    if (reason.trim().length < 4) {
      return toast('Informe um motivo claro para rejeitar o Pix.', true);
    }
    if (
      !confirm(
        'CONFIRMAR REJEIÇÃO: o Payment será encerrado e a reserva USDC será devolvida ao saldo disponível do cliente.',
      )
    ) {
      return;
    }

    try {
      const result = await call(
        `/payment/manual-redemption/${encodeURIComponent(paymentId)}/reject`,
        {
          method: 'POST',
          body: JSON.stringify({ reason: reason.trim() }),
        },
      );
      toast(
        `Resgate rejeitado. Saldo disponível: ${n(result.balanceUsdc, 8)} USDC`,
      );
      await refresh();
    } catch (error) {
      toast(error.message, true);
    }
  };

  const idleTimer = setInterval(() => {
    if (!token()) return;
    if (Date.now() - lastActivityAt < MAX_IDLE_MS) return;
    logout(false);
    toast('Sessão administrativa encerrada por inatividade.', true);
  }, 30_000);

  window.addEventListener('pagehide', () => {
    clearInterval(idleTimer);
    sessionStorage.removeItem('nexa_admin_token');
    data = {};
  });

  window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
      sessionStorage.removeItem('nexa_admin_token');
      data = {};
      render();
      $('status').textContent = 'Faça login novamente.';
    }
  });
})();
