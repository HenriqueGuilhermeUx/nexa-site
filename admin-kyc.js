(function () {
  const providerLabels = {
    'not started': 'Não iniciado',
    not_started: 'Não iniciado',
    created: 'Não iniciado',
    'in progress': 'Em preenchimento',
    in_progress: 'Em preenchimento',
    started: 'Em preenchimento',
    processing: 'Em preenchimento',
    'in review': 'Em análise manual',
    in_review: 'Em análise manual',
    approved: 'Aprovado',
    declined: 'Reprovado',
    rejected: 'Reprovado',
    resubmitted: 'Reenvio solicitado',
    expired: 'Expirado',
    abandoned: 'Abandonado',
    'kyc expired': 'KYC expirado',
    kyc_expired: 'KYC expirado',
    'awaiting user': 'Aguardando usuário',
    awaiting_user: 'Aguardando usuário',
    pending: 'Pendente',
  };

  function normalizeProviderStatus(value) {
    return String(value || '')
      .trim()
      .toLowerCase();
  }

  function diditKycLabel(value, hasSession) {
    const normalized = normalizeProviderStatus(value);
    if (!normalized) return hasSession ? 'Sessão criada' : 'Não iniciado';
    return providerLabels[normalized] || value;
  }

  function diditTone(value) {
    const normalized = normalizeProviderStatus(value);
    if (normalized === 'approved') return 'green';
    if (
      normalized === 'declined' ||
      normalized === 'rejected' ||
      normalized === 'expired' ||
      normalized === 'abandoned' ||
      normalized === 'kyc expired' ||
      normalized === 'kyc_expired'
    ) {
      return 'red';
    }
    if (
      normalized === 'in review' ||
      normalized === 'in_review' ||
      normalized === 'resubmitted'
    ) {
      return 'blue';
    }
    return 'yellow';
  }

  function enrichedClients() {
    const base = clients();
    const users = Array.isArray(data?.users) ? data.users : [];
    const usersById = new Map(users.map((user) => [user.id, user]));

    return base.map((client) => ({
      ...client,
      ...(usersById.get(client.id) || {}),
    }));
  }

  function clientForRow(row) {
    const reportButton = row.querySelector('button[onclick*="report("]');
    const onclick = reportButton?.getAttribute('onclick') || '';
    const match = onclick.match(/report\('([^']+)'\)/);
    if (!match) return null;
    return enrichedClients().find((client) => client.id === match[1]) || null;
  }

  function renderDiditInfo(row, client) {
    const statusCell = row.children?.[2];
    if (!statusCell || statusCell.querySelector('[data-didit-status]')) return;

    const detail = document.createElement('div');
    detail.dataset.diditStatus = 'true';
    detail.className = 'muted';
    detail.style.marginTop = '7px';
    detail.style.display = 'flex';
    detail.style.flexWrap = 'wrap';
    detail.style.gap = '6px';
    detail.style.alignItems = 'center';

    const label = diditKycLabel(
      client.diditSessionStatus,
      Boolean(client.diditSessionId),
    );

    detail.innerHTML =
      '<span>Didit:</span>' +
      pill(label, diditTone(client.diditSessionStatus));

    if (client.diditSessionId) {
      const session = document.createElement('span');
      session.title = client.diditSessionId;
      session.textContent = `sessão ${String(client.diditSessionId).slice(0, 8)}…`;
      detail.appendChild(session);
    }

    statusCell.appendChild(detail);
  }

  function renderSyncButton(row, client) {
    if (!client.diditSessionId) return;

    const actions = row.querySelector('.row-actions');
    if (!actions || actions.querySelector('[data-sync-kyc]')) return;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'small-btn';
    button.dataset.syncKyc = client.id;
    button.textContent = 'Sincronizar KYC';
    button.addEventListener('click', () => syncKyc(client.id));
    actions.appendChild(button);
  }

  function enhanceClientRows() {
    const root = document.getElementById('content');
    if (!root) return;

    root.querySelectorAll('tbody tr').forEach((row) => {
      const client = clientForRow(row);
      if (!client) return;
      renderDiditInfo(row, client);
      renderSyncButton(row, client);
    });
  }

  function enhanceToolbar() {
    const root = document.getElementById('content');
    if (!root) return;

    const toolbar = root.querySelector('.toolbar');
    if (!toolbar || toolbar.querySelector('[data-sync-all-kyc]')) return;

    const eligible = enrichedClients().filter((client) => Boolean(client.diditSessionId));

    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.syncAllKyc = 'true';
    button.textContent = `Sincronizar KYC (${eligible.length})`;
    button.disabled = eligible.length === 0;
    button.addEventListener('click', syncAllKyc);
    toolbar.appendChild(button);
  }

  async function syncKyc(userId) {
    try {
      toast('Consultando status real no Didit...');
      const response = await call(
        `/kyc/didit/status/${encodeURIComponent(userId)}`,
      );
      const providerStatus =
        response.diditStatus || response.diditSessionStatus || '';
      toast(`KYC sincronizado: ${diditKycLabel(providerStatus, true)}`);
      await refresh();
    } catch (error) {
      toast(`Falha ao sincronizar KYC: ${error.message}`, true);
    }
  }

  async function syncAllKyc() {
    const eligible = enrichedClients().filter((client) => Boolean(client.diditSessionId));

    if (!eligible.length) {
      toast('Nenhuma sessão Didit para sincronizar');
      return;
    }

    try {
      toast(`Sincronizando ${eligible.length} sessões Didit...`);

      const results = await Promise.allSettled(
        eligible.map((client) =>
          call(`/kyc/didit/status/${encodeURIComponent(client.id)}`),
        ),
      );

      const ok = results.filter((result) => result.status === 'fulfilled').length;
      const failed = results.length - ok;

      await refresh();

      if (failed) {
        toast(`KYC sincronizado: ${ok} OK, ${failed} com falha`, true);
      } else {
        toast(`KYC sincronizado: ${ok} sessões atualizadas`);
      }
    } catch (error) {
      toast(`Falha ao sincronizar KYC: ${error.message}`, true);
    }
  }

  // Expondo apenas as ações úteis para depuração manual no console/admin.
  window.syncKyc = syncKyc;
  window.syncAllKyc = syncAllKyc;

  if (typeof renderClientes === 'function') {
    const originalRenderClientes = renderClientes;
    renderClientes = function () {
      originalRenderClientes();
      enhanceToolbar();
      enhanceClientRows();
    };
  }
})();
