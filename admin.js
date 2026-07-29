const API = 'https://nexa-backend-p2u0.onrender.com/api/v1';

let tab = 'ops';
let data = {};
let leadFilter = '';
let leadStatus = 'all';
let clientFilter = '';

const $ = (id) => document.getElementById(id);
const token = () => sessionStorage.getItem('nexa_admin_token') || '';
const setToken = (value) =>
  value
    ? sessionStorage.setItem('nexa_admin_token', value)
    : sessionStorage.removeItem('nexa_admin_token');
const esc = (value) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (char) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[char],
  );
const n = (value, digits = 2) =>
  Number(value || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  });
const brl = (value) =>
  Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
const fmtDate = (value) =>
  value ? new Date(value).toLocaleString('pt-BR') : '—';
const pill = (value, tone = '') =>
  `<span class="pill ${tone}">${esc(value || '—')}</span>`;
const parseMoney = (value) => {
  const raw = String(value ?? '')
    .trim()
    .replace(/R\$/gi, '')
    .replace(/\s/g, '');
  return Number(
    raw.includes(',')
      ? raw.replace(/\./g, '').replace(',', '.')
      : raw,
  );
};
const parseAsset = (value) =>
  Number(String(value ?? '').trim().replace(',', '.'));

function toast(message, error = false) {
  const element = $('toast');
  element.textContent = message;
  element.className = `toast show${error ? ' error' : ''}`;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => {
    element.className = 'toast';
  }, 3800);
}

function openModal(html) {
  $('modalContent').innerHTML = html;
  $('modal').classList.add('open');
  $('modal').setAttribute('aria-hidden', 'false');
}

function closeModal() {
  $('modal').classList.remove('open');
  $('modal').setAttribute('aria-hidden', 'true');
  $('modalContent').innerHTML = '';
}

function readableError(payload, text, status) {
  const raw = payload?.message || payload?.error || payload?.code || text || `HTTP ${status}`;
  if (Array.isArray(raw)) return raw.join(', ');
  if (raw && typeof raw === 'object') return JSON.stringify(raw);
  return String(raw);
}

async function call(path, options = {}) {
  if (!token()) throw new Error('Sessão administrativa não iniciada');
  const response = await fetch(API + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token()}`,
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  let payload = {};
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = { raw: text };
  }
  if (response.status === 401 || response.status === 403) {
    logout(false);
    throw new Error('Sessão expirada ou acesso não autorizado');
  }
  if (!response.ok) {
    throw new Error(readableError(payload, text, response.status));
  }
  return payload;
}

async function safeCall(path, fallback) {
  try {
    return await call(path);
  } catch (error) {
    console.warn(`Falha não bloqueante em ${path}`, error);
    return fallback;
  }
}

async function login() {
  try {
    const email = $('email').value.trim();
    const password = $('password').value;
    if (!email || !password) throw new Error('Informe e-mail e senha');
    $('status').textContent = 'Entrando...';
    const response = await fetch(API + '/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const text = await response.text();
    let payload = {};
    try {
      payload = text ? JSON.parse(text) : {};
    } catch {
      payload = { raw: text };
    }
    const accessToken =
      payload.accessToken ||
      payload.access_token ||
      payload.token ||
      payload.tokens?.accessToken;
    if (!response.ok || !accessToken) {
      throw new Error(readableError(payload, text, response.status));
    }
    setToken(accessToken);
    $('password').value = '';
    await refresh();
  } catch (error) {
    setToken('');
    data = {};
    $('status').textContent = `Erro: ${error.message}`;
    render();
    toast(error.message, true);
  }
}

function logout(show = true) {
  setToken('');
  data = {};
  $('status').textContent = 'Sessão encerrada';
  render();
  if (show) toast('Sessão encerrada');
}

async function refresh() {
  if (!token()) {
    render();
    return;
  }
  try {
    $('status').textContent = 'Carregando painel...';
    const [
      ops,
      users,
      treasury,
      clientsFull,
      dashboard,
      deposits,
      earlySummary,
      earlyLeads,
      crm,
      audit,
      checkout,
      trades,
    ] = await Promise.all([
      safeCall('/admin/ops-center', {}),
      safeCall('/admin/users', []),
      safeCall('/treasury-admin/dashboard', {}),
      safeCall('/treasury-admin/clients-full', {}),
      safeCall('/admin/dashboard', {}),
      safeCall('/admin/deposits', []),
      safeCall('/early-access/admin/summary', {
        total: 0,
        qualified: 0,
        byStatus: {},
      }),
      safeCall('/early-access/admin/leads?limit=500', {
        leads: [],
        total: 0,
      }),
      safeCall('/admin/crm', { contacts: [], summary: {} }),
      safeCall('/admin/audit?limit=200', { events: [] }),
      safeCall('/merchant-admin/transactions?limit=300', {
        transactions: [],
      }),
      safeCall('/treasury-admin/trades?limit=300', { trades: [] }),
    ]);

    data = {
      ops: ops || {},
      users: Array.isArray(users) ? users : users?.users || [],
      treasury: treasury || {},
      clientsFull: clientsFull || {},
      dashboard: dashboard || {},
      deposits: Array.isArray(deposits) ? deposits : deposits?.deposits || [],
      earlySummary: earlySummary || {},
      earlyLeads: earlyLeads || { leads: [] },
      crm: crm || { contacts: [], summary: {} },
      audit: audit || { events: [] },
      checkout: checkout || { transactions: [] },
      trades: trades || { trades: [] },
      ledgerBalances: {},
    };

    await Promise.all(
      clients().map(async (client) => {
        try {
          const balance = await call(
            `/ledger/balance?userId=${encodeURIComponent(client.id)}&mode=real`,
          );
          data.ledgerBalances[client.id] = balance.balances || {};
        } catch {
          data.ledgerBalances[client.id] = {};
        }
      }),
    );

    $('status').textContent = 'Painel carregado';
    $('lastUpdated').textContent = `Atualizado ${new Date().toLocaleTimeString('pt-BR')}`;
    render();
  } catch (error) {
    $('status').textContent = `Erro: ${error.message}`;
    render();
    toast(error.message, true);
  }
}

function clients() {
  return data.clientsFull?.clients || data.users || [];
}

function clientById(id) {
  return clients().find((client) => client.id === id) || {};
}

function ledgerUsdc(client) {
  return Number(
    data.ledgerBalances?.[client.id]?.USDC ??
      client.balances?.USDC ??
      client.availableBalanceUsdc ??
      0,
  );
}

function isRealClient(client) {
  return Boolean(
    client &&
      client.isClientLiability !== false &&
      !client.isTestOrAdmin &&
      client.isActive !== false &&
      !client.isBlocked &&
      !client.isArchived,
  );
}

function officialClientUsdcLiability() {
  return clients()
    .filter(isRealClient)
    .reduce((sum, client) => sum + ledgerUsdc(client), 0);
}

function treasuryUsdc() {
  return Number(data.treasury?.reserves?.treasuryUsdc || 0);
}

function officialReserveGap() {
  return treasuryUsdc() - officialClientUsdcLiability();
}

function payments() {
  return data.dashboard?.latest?.payments || [];
}

function checkoutRows() {
  return data.checkout?.transactions || [];
}

function treasuryTrades() {
  return data.trades?.trades || [];
}

function card(label, value, cssClass = '') {
  return `<div class="card"><div class="muted">${esc(label)}</div><div class="kpi ${cssClass}">${value}</div></div>`;
}

function statusClass(status) {
  const value = String(status || '').toLowerCase();
  if (['completed', 'settled', 'active', 'activated'].includes(value)) return 'green';
  if (['failed', 'cancelled', 'rejected', 'blocked'].includes(value)) return 'red';
  if (['qualified', 'invited', 'awaiting_usdc_payout'].includes(value)) return 'blue';
  return 'yellow';
}

function setTab(value) {
  tab = value;
  document.querySelectorAll('nav button').forEach((button) => {
    button.classList.toggle('active', button.dataset.tab === value);
  });
  render();
}

function render() {
  const titles = {
    ops: 'Visão Geral',
    primeiros: 'Primeiros Nexa',
    clientes: 'Clientes',
    checkout: 'Checkout PJ',
    financeiro: 'Resgates Pix',
    tesouraria: 'Tesouraria',
    crm: 'CRM',
    audit: 'Auditoria',
    raw: 'Debug',
  };
  $('title').textContent = titles[tab] || tab;
  if (!token()) {
    $('content').innerHTML =
      '<div class="card"><h3>Acesso restrito</h3><p class="muted">Faça login com a conta administrativa.</p></div>';
    return;
  }
  if (tab === 'ops') return renderOps();
  if (tab === 'primeiros') return renderPrimeiros();
  if (tab === 'clientes') return renderClientes();
  if (tab === 'checkout') return renderCheckout();
  if (tab === 'financeiro') return renderFinanceiro();
  if (tab === 'tesouraria') return renderTesouraria();
  if (tab === 'crm') return renderCrm();
  if (tab === 'audit') return renderAudit();
  $('content').innerHTML = `<pre>${esc(JSON.stringify(data, null, 2))}</pre>`;
}

function renderOps() {
  const openPayments = payments().filter((payment) =>
    ['pending', 'processing'].includes(String(payment.status).toLowerCase()),
  );
  const pendingCheckout = checkoutRows().filter(
    (transaction) =>
      !transaction.settled &&
      !['failed', 'cancelled'].includes(String(transaction.status).toLowerCase()),
  );
  const early = data.earlySummary || {};
  const gap = officialReserveGap();
  $('content').innerHTML =
    `<div class="grid">${card('Primeiros Nexa', n(early.total || 0, 0))}${card(
      'Leads qualificados',
      n(early.qualified || 0, 0),
      'ok',
    )}${card(
      'Checkout PJ pendente',
      pendingCheckout.length,
      pendingCheckout.length ? 'warn' : 'ok',
    )}${card(
      'Resgates aguardando',
      openPayments.length,
      openPayments.length ? 'warn' : 'ok',
    )}</div>` +
    `<div class="grid">${card('Clientes', clients().length)}${card(
      'USDC clientes',
      n(officialClientUsdcLiability(), 8),
    )}${card('Tesouraria USDC', n(treasuryUsdc(), 8))}${card(
      'Gap de reserva',
      n(gap, 8),
      gap >= 0 ? 'ok' : 'bad',
    )}</div>` +
    '<div class="card notice"><h3>Separação operacional</h3><p><b>Lead</b> é contato de aquisição. <b>Cliente</b> é conta criada. <b>Saldo</b> só existe no ledger ou na blockchain. <b>Liquidação</b> exige valores e referências reais.</p></div>';
}

const leadLabels = {
  new: 'Novo',
  qualified: 'Qualificado',
  invited: 'Convidado',
  activated: 'Ativado',
  paused: 'Pausado',
  unsubscribed: 'Descadastrado',
};

function filteredLeads() {
  const query = leadFilter.trim().toLowerCase();
  return (data.earlyLeads?.leads || []).filter(
    (lead) =>
      (leadStatus === 'all' || lead.status === leadStatus) &&
      (!query ||
        [
          lead.fullName,
          lead.email,
          lead.phone,
          lead.primaryInterest,
          lead.source,
        ].some((value) => String(value || '').toLowerCase().includes(query))),
  );
}

function renderPrimeiros() {
  const summary = data.earlySummary || { byStatus: {} };
  const rows = filteredLeads();
  $('content').innerHTML =
    `<div class="grid">${card('Total', summary.total || 0)}${card(
      'Novos',
      summary.byStatus?.new || 0,
      'warn',
    )}${card(
      'Qualificados',
      summary.byStatus?.qualified || 0,
      'ok',
    )}${card('Ativados', summary.byStatus?.activated || 0, 'ok')}</div>` +
    `<div class="toolbar"><input id="leadSearch" placeholder="Buscar nome, e-mail, telefone ou origem" value="${esc(
      leadFilter,
    )}"><select id="leadStatus"><option value="all">Todos os status</option>${Object.entries(
      leadLabels,
    )
      .map(
        ([value, label]) =>
          `<option value="${value}" ${leadStatus === value ? 'selected' : ''}>${label}</option>`,
      )
      .join('')}</select><button onclick="exportLeadsCsv()">Exportar CSV</button></div>` +
    '<div class="card notice"><b>Métrica principal:</b> pessoas qualificadas. Lead não vira cliente financeiro sem convite, cadastro, KYC e aceite próprios.</div>' +
    `<div class="card scroll"><table><thead><tr><th>Pessoa</th><th>Perfil</th><th>Origem</th><th>Status</th><th>Ações</th></tr></thead><tbody>${rows
      .map(
        (lead) =>
          `<tr><td><b>${esc(lead.fullName)}</b><br><span class="muted">${esc(
            lead.email,
          )} · ${esc(lead.phone || 'sem WhatsApp')}</span></td><td>${esc(
            lead.cryptoExperience || 'não informado',
          )}<br><span class="muted">${esc(
            lead.primaryInterest || 'interesse não informado',
          )}</span></td><td>${esc(lead.source || 'direto')}<br><span class="muted">${fmtDate(
            lead.createdAt,
          )}</span></td><td>${pill(
            leadLabels[lead.status] || lead.status,
            statusClass(lead.status),
          )}</td><td><div class="row-actions"><button class="small-btn" onclick="openLead('${lead.id}')">Detalhes</button><button class="small-btn green" onclick="setLeadStatus('${lead.id}','qualified')">Qualificar</button><button class="small-btn" onclick="setLeadStatus('${lead.id}','invited')">Convidar</button></div></td></tr>`,
      )
      .join('')}</tbody></table></div>`;

  $('leadSearch').oninput = (event) => {
    leadFilter = event.target.value;
    renderPrimeiros();
  };
  $('leadStatus').onchange = (event) => {
    leadStatus = event.target.value;
    renderPrimeiros();
  };
}

function leadById(id) {
  return (data.earlyLeads?.leads || []).find((lead) => lead.id === id);
}

function openLead(id) {
  const lead = leadById(id);
  if (!lead) return;
  openModal(
    `<h2 id="modalTitle">${esc(lead.fullName)}</h2>` +
      `<div class="modal-section"><p><b>E-mail:</b> ${esc(
        lead.email,
      )}<br><b>WhatsApp:</b> ${esc(
        lead.phone || '—',
      )}<br><b>Canal:</b> ${esc(
        lead.preferredChannel || '—',
      )}<br><b>Experiência:</b> ${esc(
        lead.cryptoExperience || '—',
      )}<br><b>Interesse:</b> ${esc(
        lead.primaryInterest || '—',
      )}<br><b>Origem:</b> ${esc(lead.source || '—')} / ${esc(
        lead.campaign || '—',
      )}<br><b>Indicação:</b> ${esc(lead.referredByCode || '—')}</p></div>` +
      `<div class="modal-section"><div class="form-field"><label>Status</label><select id="leadModalStatus">${Object.entries(
        leadLabels,
      )
        .map(
          ([value, label]) =>
            `<option value="${value}" ${lead.status === value ? 'selected' : ''}>${label}</option>`,
        )
        .join('')}</select></div><div class="form-field"><label>Observações administrativas</label><textarea id="leadModalNotes">${esc(
        lead.adminNotes || '',
      )}</textarea></div><button class="green" onclick="saveLead('${id}')">Salvar</button></div>`,
  );
}

async function saveLead(id) {
  try {
    await call(`/early-access/admin/leads/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify({
        status: $('leadModalStatus').value,
        adminNotes: $('leadModalNotes').value,
      }),
    });
    closeModal();
    toast('Lead atualizado');
    await refresh();
  } catch (error) {
    toast(error.message, true);
  }
}

async function setLeadStatus(id, status) {
  try {
    await call(`/early-access/admin/leads/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
    toast('Status atualizado');
    await refresh();
  } catch (error) {
    toast(error.message, true);
  }
}

function exportLeadsCsv() {
  const columns = [
    'fullName',
    'email',
    'phone',
    'preferredChannel',
    'cryptoExperience',
    'primaryInterest',
    'source',
    'campaign',
    'status',
    'createdAt',
  ];
  const quote = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const rows = filteredLeads().map((lead) =>
    columns.map((key) => quote(lead[key])).join(';'),
  );
  const csv = `\ufeff${columns.join(';')}\n${rows.join('\n')}`;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `primeiros-nexa-${new Date().toISOString().slice(0, 10)}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function filteredClients() {
  const query = clientFilter.trim().toLowerCase();
  return clients().filter(
    (client) =>
      !query ||
      [client.fullName, client.email, client.phone, client.cpfCnpj, client.cpf, client.username]
        .some((value) => String(value || '').toLowerCase().includes(query)),
  );
}

function renderClientes() {
  const rows = filteredClients();
  const all = clients();
  $('content').innerHTML =
    `<div class="grid">${card('Total', all.length)}${card(
      'KYC aprovado',
      all.filter((client) => client.kycStatus === 'approved').length,
      'ok',
    )}${card(
      'Com saldo',
      all.filter((client) => ledgerUsdc(client) > 0).length,
    )}${card(
      'Bloqueados/arquivados',
      all.filter(
        (client) => client.isBlocked || client.isArchived || client.isActive === false,
      ).length,
      'warn',
    )}</div>` +
    `<div class="toolbar compact"><input id="clientSearch" placeholder="Buscar cliente" value="${esc(
      clientFilter,
    )}"><button onclick="exportClientsCsv()">Exportar CSV</button></div>` +
    '<div class="card notice"><b>Bloquear</b> interrompe o acesso. <b>Arquivar</b> encerra operacionalmente a conta. Nenhuma dessas ações apaga ledger, transações, KYC ou auditoria.</div>' +
    `<div class="card scroll"><table><thead><tr><th>Nome</th><th>Contato</th><th>Status</th><th>Saldo oficial</th><th>Ações</th></tr></thead><tbody>${rows
      .map((user) => {
        const deleteButton = user.isTestOrAdmin
          ? `<button class="small-btn red" onclick="deleteTestClient('${user.id}')">Excluir teste</button>`
          : '';
        return `<tr><td><b>${esc(user.fullName || '—')}</b><br><span class="muted">${esc(
          user.cpfCnpj || user.cpf || '—',
        )} @${esc(user.username || '—')}</span></td><td>${esc(
          user.email || '—',
        )}<br>${esc(user.phone || '—')}</td><td>${pill(
          user.kycStatus,
          user.kycStatus === 'approved' ? 'green' : 'yellow',
        )} ${user.isBlocked ? pill('bloqueado', 'red') : ''} ${
          user.isArchived ? pill('arquivado', 'gray') : ''
        }</td><td><b>${n(ledgerUsdc(user), 8)} USDC</b><br><span class="muted">${brl(
          data.ledgerBalances?.[user.id]?.BRL || 0,
        )}</span></td><td><div class="row-actions"><button class="small-btn" onclick="report('${user.id}')">Extrato</button><button class="small-btn green" onclick="openClientCrm('${user.id}')">CRM</button><button class="small-btn yellow" onclick="toggleBlock('${user.id}',${!user.isBlocked})">${
          user.isBlocked ? 'Desbloquear' : 'Bloquear'
        }</button><button class="small-btn ghost" onclick="toggleArchive('${user.id}',${!user.isArchived})">${
          user.isArchived ? 'Restaurar' : 'Arquivar'
        }</button>${deleteButton}</div></td></tr>`;
      })
      .join('')}</tbody></table></div>`;

  $('clientSearch').oninput = (event) => {
    clientFilter = event.target.value;
    renderClientes();
  };
}

async function toggleBlock(id, blocked) {
  const reason =
    prompt(
      blocked ? 'Motivo do bloqueio:' : 'Motivo do desbloqueio:',
      'Ação administrativa com preservação integral do histórico',
    ) || '';
  if (!reason.trim()) return;
  try {
    await call(`/admin/users/${encodeURIComponent(id)}/block`, {
      method: 'POST',
      body: JSON.stringify({ blocked, reason }),
    });
    toast(blocked ? 'Cliente bloqueado' : 'Cliente desbloqueado');
    await refresh();
  } catch (error) {
    toast(error.message, true);
  }
}

async function toggleArchive(id, archived) {
  const reason =
    prompt(
      archived ? 'Motivo do arquivamento:' : 'Motivo da restauração:',
      'Histórico financeiro e auditoria serão preservados',
    ) || '';
  if (!reason.trim()) return;
  try {
    await call(`/admin/users/${encodeURIComponent(id)}/archive`, {
      method: 'POST',
      body: JSON.stringify({ archived, reason }),
    });
    toast(archived ? 'Cliente arquivado' : 'Cliente restaurado');
    await refresh();
  } catch (error) {
    toast(error.message, true);
  }
}

async function deleteTestClient(id) {
  const client = clientById(id);
  if (!client.isTestOrAdmin) {
    return toast('Exclusão definitiva só existe para conta de teste vazia.', true);
  }
  const reason =
    prompt('Motivo obrigatório da exclusão da conta de teste:', 'Conta criada exclusivamente para QA') || '';
  if (!reason.trim()) return;
  const confirmEmail =
    prompt('Digite exatamente o e-mail da conta para confirmar:', '') || '';
  if (confirmEmail.trim().toLowerCase() !== String(client.email || '').toLowerCase()) {
    return toast('O e-mail de confirmação não corresponde.', true);
  }
  if (!confirm('Excluir definitivamente esta conta de TESTE sem histórico?')) return;
  try {
    await call(`/admin/users/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      body: JSON.stringify({ reason, confirmEmail }),
    });
    toast('Conta de teste excluída');
    await refresh();
  } catch (error) {
    toast(error.message, true);
  }
}

async function report(id) {
  try {
    const client = clientById(id);
    const result = await call(
      `/ledger/statement?userId=${encodeURIComponent(id)}&limit=100&mode=real`,
    );
    const rows = (result.statement || []).map((entry) => {
      const signal = entry.direction === 'credit' ? '+' : '-';
      return `${fmtDate(entry.createdAt)} | ${signal}${n(entry.amount, 8)} ${entry.asset} | ${
        entry.display?.title || entry.type
      } | ${entry.description || ''}`;
    });
    openModal(
      `<h2 id="modalTitle">Extrato de ${esc(
        client.fullName || 'Cliente',
      )}</h2><p><b>Saldo atual:</b> ${n(
        ledgerUsdc(client),
        8,
      )} USDC</p><pre>${esc(rows.join('\n') || 'Nenhum lançamento encontrado.')}</pre>`,
    );
  } catch (error) {
    toast(error.message, true);
  }
}

function exportClientsCsv() {
  const columns = ['fullName', 'email', 'phone', 'kycStatus', 'isBlocked', 'isArchived'];
  const quote = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const rows = filteredClients().map((client) =>
    [
      ...columns.map((key) => quote(client[key])),
      quote(ledgerUsdc(client)),
    ].join(';'),
  );
  const csv = `\ufeff${[...columns, 'balanceUsdc'].join(';')}\n${rows.join('\n')}`;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `clientes-nexa-${new Date().toISOString().slice(0, 10)}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

const checkoutLabels = {
  awaiting_pix: 'Aguardando Pix',
  pix_confirmed_fee_pending: 'Conferir tarifa Pix',
  awaiting_usdc_purchase: 'Comprar USDC',
  awaiting_usdc_payout: 'Enviar USDC',
  awaiting_brl_payout: 'Enviar Pix ao lojista',
  completed: 'Concluído',
  failed: 'Falhou',
  cancelled: 'Cancelado',
};

function checkoutAction(row) {
  if (['awaiting_pix', 'pix_confirmed_fee_pending'].includes(row.status)) {
    return `<button class="small-btn green" onclick="openMerchantPix('${row.id}',${Number(
      row.amountBrl,
    )})">Confirmar Pix real</button>`;
  }
  if (row.status === 'awaiting_usdc_purchase') {
    return `<button class="small-btn" onclick="openMerchantPurchase('${row.id}',${Number(
      row.brlPurchaseBudget || 0,
    )})">Registrar compra USDC</button>`;
  }
  if (row.status === 'awaiting_usdc_payout') {
    return `<button class="small-btn green" onclick="openMerchantUsdcPayout('${row.id}',${Number(
      row.merchantPayoutUsdc || 0,
    )})">Confirmar envio USDC</button>`;
  }
  if (row.status === 'awaiting_brl_payout') {
    return `<button class="small-btn green" onclick="openMerchantBrlPayout('${row.id}',${Number(
      row.merchantPayoutBrl || 0,
    )},${Number(row.pixOutFeeBrl || 1)})">Confirmar Pix lojista</button>`;
  }
  return '<span class="muted">Sem ação pendente</span>';
}

function renderCheckout() {
  const rows = checkoutRows();
  const pending = rows.filter(
    (row) => !row.settled && !['failed', 'cancelled'].includes(row.status),
  );
  const netRevenue = rows.reduce(
    (sum, row) => sum + Number(row.nexaNetRevenueBrl || 0),
    0,
  );
  $('content').innerHTML =
    `<div class="grid">${card('Cobranças', rows.length)}${card(
      'Pendentes',
      pending.length,
      pending.length ? 'warn' : 'ok',
    )}${card(
      'Concluídas',
      rows.filter((row) => row.settled).length,
      'ok',
    )}${card('Receita Nexa conciliada', brl(netRevenue))}</div>` +
    '<div class="card notice"><b>Ordem obrigatória:</b> confirmar Pix e tarifa real → registrar compra real de USDC ou preparar Pix → confirmar pagamento final. Nenhuma conclusão nasce de estimativa.</div>' +
    `<div class="card scroll"><table><thead><tr><th>Cobrança</th><th>Valores</th><th>Status</th><th>Referências</th><th>Ação segura</th></tr></thead><tbody>${rows
      .map(
        (row) =>
          `<tr><td><b>${brl(row.amountBrl)}</b><br><span class="muted">${esc(
            row.description || row.id,
          )}<br>${fmtDate(row.createdAt)}</span></td><td>Taxa Nexa: ${brl(
            row.serviceFeeBrl,
          )}<br>Pix In: ${brl(row.pixInFeeBrl)}<br>Lojista: ${
            row.settlementCurrency === 'USDC'
              ? `${n(row.merchantPayoutUsdc ?? row.amountUsdc, 8)} USDC`
              : brl(row.merchantPayoutBrl || 0)
          }</td><td>${pill(
            checkoutLabels[row.status] || row.status,
            statusClass(row.status),
          )}<br><span class="muted">${esc(
            row.settlementCurrency,
          )}</span></td><td><span class="muted">Pix:</span> ${esc(
            row.providerReference || row.pixTransactionId || '—',
          )}<br><span class="muted">Liquidação:</span> ${esc(
            row.payoutReference || row.settlementReference || '—',
          )}</td><td>${checkoutAction(row)}</td></tr>`,
      )
      .join('')}</tbody></table></div>`;
}

function openMerchantPix(id, gross) {
  openModal(
    `<h2 id="modalTitle">Confirmar Pix recebido</h2><div class="rule-box">Valor esperado: <b>${brl(
      gross,
    )}</b>. Use a tarifa efetivamente informada pela Woovi.</div><div class="form-grid"><div class="form-field"><label>Tarifa Pix In real</label><input id="merchantPixFee" inputmode="decimal" placeholder="5,00"></div><div class="form-field"><label>Referência do Pix recebido</label><input id="merchantPixRef" placeholder="correlationID / EndToEndId"></div></div><button class="green" onclick="confirmMerchantPix('${id}',${gross})">Confirmar recebimento real</button>`,
  );
}

async function confirmMerchantPix(id, gross) {
  const fee = parseMoney($('merchantPixFee').value);
  const providerReference = $('merchantPixRef').value.trim();
  if (!Number.isFinite(fee) || fee < 0 || providerReference.length < 4) {
    return toast('Tarifa e referência reais são obrigatórias.', true);
  }
  try {
    await call(`/merchant-admin/transactions/${id}/confirm-pix`, {
      method: 'POST',
      body: JSON.stringify({
        grossBrl: gross,
        actualPixInFeeBrl: fee,
        providerReference,
      }),
    });
    closeModal();
    toast('Pix recebido e conciliado');
    await refresh();
  } catch (error) {
    toast(error.message, true);
  }
}

function openMerchantPurchase(id, budget) {
  openModal(
    `<h2 id="modalTitle">Registrar compra real de USDC</h2><div class="rule-box">Orçamento obrigatório: <b>${brl(
      budget,
    )}</b>. O lojista receberá exatamente o USDC líquido realmente comprado.</div><div class="form-grid"><div class="form-field"><label>BRL total debitado</label><input id="merchantBuyBrl" value="${String(
      budget,
    ).replace('.', ',')}" inputmode="decimal"></div><div class="form-field"><label>USDC líquido recebido</label><input id="merchantBuyUsdc" inputmode="decimal"></div><div class="form-field"><label>Referência do provedor</label><input id="merchantBuyRef"></div><div class="form-field"><label>Hash da transação</label><input id="merchantBuyHash" placeholder="0x..."></div></div><button class="green" onclick="recordMerchantPurchase('${id}')">Registrar compra</button>`,
  );
}

async function recordMerchantPurchase(id) {
  const brlDebitedTotal = parseMoney($('merchantBuyBrl').value);
  const usdcReceivedNet = parseAsset($('merchantBuyUsdc').value);
  const providerReference = $('merchantBuyRef').value.trim();
  const transactionHash = $('merchantBuyHash').value.trim();
  if (
    !Number.isFinite(brlDebitedTotal) ||
    brlDebitedTotal <= 0 ||
    !Number.isFinite(usdcReceivedNet) ||
    usdcReceivedNet <= 0 ||
    providerReference.length < 4 ||
    transactionHash.length < 6
  ) {
    return toast('Valores, referência e hash reais são obrigatórios.', true);
  }
  try {
    await call(`/merchant-admin/transactions/${id}/record-usdc-purchase`, {
      method: 'POST',
      body: JSON.stringify({
        brlDebitedTotal,
        usdcReceivedNet,
        providerReference,
        provider: 'manual_treasury',
        transactionHash,
      }),
    });
    closeModal();
    toast('Compra de USDC registrada');
    await refresh();
  } catch (error) {
    toast(error.message, true);
  }
}

function openMerchantUsdcPayout(id, expected) {
  openModal(
    `<h2 id="modalTitle">Confirmar envio USDC</h2><div class="rule-box">Envie exatamente <b>${n(
      expected,
      8,
    )} USDC</b> para a wallet validada da empresa.</div><div class="form-grid"><div class="form-field"><label>USDC enviado</label><input id="merchantUsdcActual" value="${expected}" inputmode="decimal"></div><div class="form-field"><label>Referência</label><input id="merchantUsdcRef"></div><div class="form-field full"><label>Hash on-chain</label><input id="merchantUsdcHash" placeholder="0x..."></div></div><button class="green" onclick="confirmMerchantUsdc('${id}')">Confirmar envio real</button>`,
  );
}

async function confirmMerchantUsdc(id) {
  const actualUsdcSent = parseAsset($('merchantUsdcActual').value);
  const payoutReference = $('merchantUsdcRef').value.trim();
  const transactionHash = $('merchantUsdcHash').value.trim();
  if (
    !Number.isFinite(actualUsdcSent) ||
    actualUsdcSent <= 0 ||
    payoutReference.length < 4 ||
    transactionHash.length < 6
  ) {
    return toast('Valor, referência e hash são obrigatórios.', true);
  }
  if (!confirm('Confirma que o USDC foi realmente enviado para a wallet validada?')) return;
  try {
    await call(`/merchant-admin/transactions/${id}/confirm-usdc-payout`, {
      method: 'POST',
      body: JSON.stringify({
        payoutReference,
        transactionHash,
        actualUsdcSent,
      }),
    });
    closeModal();
    toast('Liquidação USDC concluída');
    await refresh();
  } catch (error) {
    toast(error.message, true);
  }
}

function openMerchantBrlPayout(id, expected, fee) {
  openModal(
    `<h2 id="modalTitle">Confirmar Pix ao lojista</h2><div class="rule-box">Valor sustentável calculado: <b>${brl(
      expected,
    )}</b>.</div><div class="form-grid"><div class="form-field"><label>Pix realmente enviado</label><input id="merchantBrlActual" value="${String(
      expected,
    ).replace('.', ',')}" inputmode="decimal"></div><div class="form-field"><label>Custo Pix Out real</label><input id="merchantBrlFee" value="${String(
      fee,
    ).replace('.', ',')}" inputmode="decimal"></div><div class="form-field full"><label>Referência real do Pix</label><input id="merchantBrlRef"></div></div><button class="green" onclick="confirmMerchantBrl('${id}')">Confirmar Pix real</button>`,
  );
}

async function confirmMerchantBrl(id) {
  const actualPayoutBrl = parseMoney($('merchantBrlActual').value);
  const actualPixOutFeeBrl = parseMoney($('merchantBrlFee').value);
  const payoutReference = $('merchantBrlRef').value.trim();
  if (!confirm('Confirma que o Pix foi realmente enviado ao lojista?')) return;
  try {
    await call(`/merchant-admin/transactions/${id}/confirm-brl-payout`, {
      method: 'POST',
      body: JSON.stringify({
        payoutReference,
        actualPayoutBrl,
        actualPixOutFeeBrl,
      }),
    });
    closeModal();
    toast('Liquidação BRL concluída');
    await refresh();
  } catch (error) {
    toast(error.message, true);
  }
}

function tradeForPayment(paymentId) {
  return treasuryTrades().find(
    (trade) => trade.orderId === paymentId && trade.side === 'SELL_USDC',
  );
}

function renderFinanceiro() {
  const rows = payments().slice().sort(
    (left, right) => new Date(right.createdAt) - new Date(left.createdAt),
  );
  const open = rows.filter((payment) =>
    ['pending', 'processing'].includes(String(payment.status).toLowerCase()),
  );
  const withFinalAmount = open.filter(
    (payment) => Number(payment.settledAmountBrl || 0) > 0,
  );
  $('content').innerHTML =
    `<div class="grid">${card(
      'Resgates aguardando',
      open.length,
      open.length ? 'warn' : 'ok',
    )}${card(
      'Aguardando venda',
      open.length - withFinalAmount.length,
    )}${card(
      'Valor final confirmado',
      withFinalAmount.length,
      'ok',
    )}${card(
      'Fee Nexa confirmada',
      brl(open.reduce((sum, payment) => sum + Number(payment.nexaFeeBrl || 0), 0)),
    )}</div>` +
    '<div class="card critical"><b>Fluxo obrigatório:</b> venda real → valor final no app → Pix real → referência do Pix. Não existe botão de conclusão direta.</div>' +
    `<div class="grid2">${
      open
        .map((payment) => {
          const client = clientById(payment.userId);
          const trade = tradeForPayment(payment.id);
          const finalAmount = Number(payment.settledAmountBrl || 0);
          const finalBlock = finalAmount
            ? `<div class="rule-box"><b>Valor final já publicado ao cliente</b><br>Venda líquida: ${brl(
                payment.saleProceedsBrl,
              )}<br>Fee Nexa: ${brl(payment.nexaFeeBrl)}<br>Pix Out: ${brl(
                payment.pixOutFeeBrl,
              )}<br><b>Pix obrigatório: ${brl(finalAmount)}</b></div><button class="green" onclick="openRedemptionPayout('${payment.id}',${finalAmount},${Number(
                payment.pixOutFeeBrl || 0,
              )})">Registrar Pix enviado</button>`
            : `<div class="rule-box">Estimativa atual: ${brl(
                payment.estimatedAmountBrl ?? payment.amountBrl,
              )}. Ela não pode ser usada para pagar.</div><button onclick="openRedemptionSale('${payment.id}',${Number(
                payment.amountUsdc || 0,
              )})">Registrar venda real</button>`;
          return `<div class="card"><div class="eyebrow">RESGATE #${esc(
            payment.id.slice(0, 8),
          )}</div><h2>${n(payment.amountUsdc, 8)} USDC</h2><p><b>Cliente:</b> ${esc(
            client.fullName || payment.userId,
          )}<br><b>Chave Pix:</b> ${esc(
            payment.pixKey || '—',
          )}<br><b>Solicitado:</b> ${fmtDate(
            payment.createdAt,
          )}<br><b>Trade:</b> ${esc(trade?.id || 'aguardando')}</p>${finalBlock}</div>`;
        })
        .join('') || '<div class="card goodbox"><h3>Nenhum resgate aguardando.</h3></div>'
    }</div>`;
}

function openRedemptionSale(paymentId, reservedUsdc) {
  openModal(
    `<h2 id="modalTitle">Registrar venda real</h2><div class="rule-box">Venda exatamente <b>${n(
      reservedUsdc,
      8,
    )} USDC</b>. Ao salvar, o valor final aparecerá no app como “Pix em processamento”.</div><div class="form-grid"><div class="form-field"><label>USDC vendido</label><input id="redemptionUsdc" value="${reservedUsdc}" inputmode="decimal" readonly></div><div class="form-field"><label>BRL líquido recebido</label><input id="redemptionBrl" inputmode="decimal" placeholder="211,00"></div><div class="form-field"><label>Custo Pix Out confirmado</label><input id="redemptionPixFee" inputmode="decimal" value="1,00"></div><div class="form-field"><label>Referência da venda</label><input id="redemptionSaleRef" placeholder="metamask-sell-..."></div><div class="form-field full"><label>Hash ou referência on-chain</label><input id="redemptionSaleHash" placeholder="0x..."></div></div><button class="green" onclick="recordRedemptionSale('${paymentId}')">Confirmar venda e publicar valor final</button>`,
  );
}

async function recordRedemptionSale(paymentId) {
  const usdcDebitedTotal = parseAsset($('redemptionUsdc').value);
  const brlReceivedNet = parseMoney($('redemptionBrl').value);
  const actualPixOutFeeBrl = parseMoney($('redemptionPixFee').value);
  const externalReference = $('redemptionSaleRef').value.trim();
  const transactionHash = $('redemptionSaleHash').value.trim();
  if (
    !Number.isFinite(usdcDebitedTotal) ||
    usdcDebitedTotal <= 0 ||
    !Number.isFinite(brlReceivedNet) ||
    brlReceivedNet <= 0 ||
    !Number.isFinite(actualPixOutFeeBrl) ||
    actualPixOutFeeBrl < 0 ||
    externalReference.length < 8
  ) {
    return toast('USDC, BRL, custo Pix e referência da venda são obrigatórios.', true);
  }
  try {
    const result = await call(
      `/payment/manual-redemption/${encodeURIComponent(paymentId)}/record-sale`,
      {
        method: 'POST',
        body: JSON.stringify({
          externalReference,
          usdcDebitedTotal,
          brlReceivedNet,
          providerFeeBrl: 0,
          networkFeeBrl: 0,
          provider: 'metamask_manual',
          transactionHash: transactionHash || undefined,
          actualPixOutFeeBrl,
          note: 'Venda real registrada no Nexa Control Center',
        }),
      },
    );
    closeModal();
    toast(
      `Valor final publicado: ${brl(result.customerDisplay?.finalAmountBrl || result.payment?.settledAmountBrl)}`,
    );
    await refresh();
  } catch (error) {
    toast(error.message, true);
  }
}

function openRedemptionPayout(paymentId, finalAmount, pixFee) {
  openModal(
    `<h2 id="modalTitle">Registrar Pix enviado</h2><div class="rule-box">O cliente já visualiza o valor final de <b>${brl(
      finalAmount,
    )}</b>. O Pix deve ser exatamente esse valor.</div><div class="form-grid"><div class="form-field"><label>Valor final do Pix</label><input id="redemptionPayout" value="${String(
      finalAmount,
    ).replace('.', ',')}" inputmode="decimal" readonly></div><div class="form-field"><label>Custo Pix Out</label><input id="redemptionPayoutFee" value="${String(
      pixFee,
    ).replace('.', ',')}" inputmode="decimal" readonly></div><div class="form-field full"><label>Referência real do Pix</label><input id="redemptionPayoutRef" placeholder="EndToEndId / correlationID"></div></div><button class="green" onclick="confirmRedemptionPayout('${paymentId}')">Confirmar Pix real e concluir</button>`,
  );
}

async function confirmRedemptionPayout(paymentId) {
  const actualCustomerPayoutBrl = parseMoney($('redemptionPayout').value);
  const actualPixOutFeeBrl = parseMoney($('redemptionPayoutFee').value);
  const payoutReference = $('redemptionPayoutRef').value.trim();
  if (payoutReference.length < 4) {
    return toast('Informe a referência real do Pix.', true);
  }
  if (!confirm(`Confirma o Pix real de ${brl(actualCustomerPayoutBrl)}?`)) return;
  try {
    await call(
      `/payment/manual-redemption/${encodeURIComponent(paymentId)}/confirm-payout`,
      {
        method: 'POST',
        body: JSON.stringify({
          payoutReference,
          actualCustomerPayoutBrl,
          actualPixOutFeeBrl,
          note: 'Pix real confirmado no Nexa Control Center',
        }),
      },
    );
    closeModal();
    toast('Resgate concluído e referência conciliada');
    await refresh();
  } catch (error) {
    toast(error.message, true);
  }
}

function renderTesouraria() {
  const liability = officialClientUsdcLiability();
  const treasury = treasuryUsdc();
  const gap = officialReserveGap();
  const accounts = data.treasury?.segregatedAccounts?.byType || {};
  $('content').innerHTML =
    `<div class="grid">${card('Tesouraria USDC', n(treasury, 8), 'ok')}${card(
      'Passivo clientes',
      n(liability, 8),
    )}${card('Gap', n(gap, 8), gap >= 0 ? 'ok' : 'bad')}${card(
      'Receita BRL',
      brl(accounts.revenue?.BRL || 0),
    )}</div>` +
    `<div class="card"><h3>Contas segregadas</h3><pre>${esc(
      JSON.stringify(accounts, null, 2),
    )}</pre></div>` +
    '<div class="card notice"><b>Regra:</b> receita, reserva e caixa operacional são contas distintas. Toda compra e venda usa resultado real e referência idempotente.</div>';
}

const crmStageLabels = {
  new: 'Novo',
  contacted: 'Contatado',
  qualified: 'Qualificado',
  onboarding: 'Onboarding',
  active: 'Ativo',
  at_risk: 'Em risco',
  blocked: 'Bloqueado',
  archived: 'Arquivado',
};

function renderCrm() {
  const contacts = data.crm?.contacts || [];
  const grouped = {};
  contacts.forEach((item) => {
    const stage = item.crm?.stage || 'new';
    (grouped[stage] ||= []).push(item);
  });
  $('content').innerHTML =
    `<div class="grid">${card('Contatos CRM', contacts.length)}${card(
      'Follow-ups vencidos',
      data.crm?.summary?.overdue || 0,
      'warn',
    )}${card('Ativos', data.crm?.summary?.active || 0, 'ok')}${card(
      'Em onboarding',
      data.crm?.summary?.onboarding || 0,
    )}</div>` +
    `<div class="pipeline">${Object.keys(crmStageLabels)
      .map(
        (stage) =>
          `<div class="pipeline-column"><div class="pipeline-head"><h3>${crmStageLabels[stage]}</h3>${pill(
            (grouped[stage] || []).length,
            'gray',
          )}</div>${(grouped[stage] || [])
            .map((item) => {
              const overdue =
                item.crm?.nextFollowUpAt &&
                new Date(item.crm.nextFollowUpAt) < new Date();
              return `<div class="crm-card ${
                overdue ? 'overdue' : ''
              }"><h4>${esc(
                item.user?.fullName || item.user?.email,
              )}</h4><p>${esc(item.user?.email || '')}<br>Próximo contato: ${fmtDate(
                item.crm?.nextFollowUpAt,
              )}</p><div class="tag-list">${(item.crm?.tags || [])
                .map((tag) => `<span class="tag">${esc(tag)}</span>`)
                .join('')}</div><button class="small-btn" onclick="openCrm('${item.user.id}')">Abrir</button></div>`;
            })
            .join('')}</div>`,
      )
      .join('')}</div>`;
}

async function openCrm(userId) {
  try {
    const detail = await call(`/admin/crm/${encodeURIComponent(userId)}`);
    const crm = detail.crm || {};
    const user = detail.user || {};
    const phone = String(user.phone || '').replace(/\D/g, '');
    const whatsapp = phone
      ? `<a target="_blank" rel="noopener" href="https://wa.me/${phone.startsWith('55') ? phone : `55${phone}`}" class="pill green">WhatsApp</a>`
      : '';
    const email = user.email
      ? `<a href="mailto:${encodeURIComponent(user.email)}" class="pill blue">E-mail</a>`
      : '';
    openModal(
      `<h2 id="modalTitle">CRM · ${esc(
        user.fullName || user.email,
      )}</h2><div class="actions">${whatsapp}${email}</div>` +
        `<div class="form-grid"><div class="form-field"><label>Etapa</label><select id="crmStage">${Object.entries(
          crmStageLabels,
        )
          .map(
            ([value, label]) =>
              `<option value="${value}" ${crm.stage === value ? 'selected' : ''}>${label}</option>`,
          )
          .join('')}</select></div><div class="form-field"><label>Canal preferido</label><select id="crmChannel"><option value="whatsapp" ${
          crm.preferredChannel === 'whatsapp' ? 'selected' : ''
        }>WhatsApp</option><option value="email" ${
          crm.preferredChannel === 'email' ? 'selected' : ''
        }>E-mail</option><option value="phone" ${
          crm.preferredChannel === 'phone' ? 'selected' : ''
        }>Telefone</option></select></div><div class="form-field"><label>Próximo contato</label><input id="crmNext" type="datetime-local" value="${
          crm.nextFollowUpAt
            ? new Date(crm.nextFollowUpAt).toISOString().slice(0, 16)
            : ''
        }"></div><div class="form-field"><label>Responsável</label><input id="crmOwner" value="${esc(
          crm.ownerEmail || '',
        )}"></div><div class="form-field full"><label>Tags separadas por vírgula</label><input id="crmTags" value="${esc(
          (crm.tags || []).join(', '),
        )}"></div><div class="form-field full"><label>Resumo</label><textarea id="crmSummary">${esc(
          crm.summary || '',
        )}</textarea></div></div><button class="green" onclick="saveCrm('${userId}')">Salvar CRM</button>` +
        `<div class="modal-section"><h3>Nova nota</h3><div class="form-grid"><div class="form-field"><label>Canal do contato</label><select id="crmNoteChannel"><option value="internal">Interno</option><option value="whatsapp">WhatsApp</option><option value="email">E-mail</option><option value="phone">Telefone</option></select></div><div class="form-field"><label>Próximo follow-up</label><input id="crmNoteNext" type="datetime-local"></div><div class="form-field full"><label>Registro</label><textarea id="crmNote" placeholder="Dúvida, objeção, decisão e próximo passo"></textarea></div></div><button onclick="addCrmNote('${userId}')">Adicionar nota</button></div>` +
        `<div class="modal-section"><h3>Histórico</h3>${(detail.notes || [])
          .map(
            (note) =>
              `<div class="note"><small>${fmtDate(note.createdAt)} · ${esc(
                note.channel,
              )} · ${esc(note.adminEmail)}</small>${esc(note.body)}</div>`,
          )
          .join('')}</div>`,
    );
  } catch (error) {
    toast(error.message, true);
  }
}

async function saveCrm(userId) {
  try {
    await call(`/admin/crm/${encodeURIComponent(userId)}`, {
      method: 'PUT',
      body: JSON.stringify({
        stage: $('crmStage').value,
        tags: $('crmTags')
          .value.split(',')
          .map((value) => value.trim())
          .filter(Boolean),
        summary: $('crmSummary').value,
        ownerEmail: $('crmOwner').value,
        preferredChannel: $('crmChannel').value,
        nextFollowUpAt: $('crmNext').value
          ? new Date($('crmNext').value).toISOString()
          : null,
      }),
    });
    closeModal();
    toast('CRM atualizado');
    await refresh();
  } catch (error) {
    toast(error.message, true);
  }
}

async function addCrmNote(userId) {
  const body = $('crmNote').value.trim();
  if (body.length < 2) return toast('Escreva a nota.', true);
  try {
    await call(`/admin/crm/${encodeURIComponent(userId)}/notes`, {
      method: 'POST',
      body: JSON.stringify({
        body,
        channel: $('crmNoteChannel').value,
        nextFollowUpAt: $('crmNoteNext').value
          ? new Date($('crmNoteNext').value).toISOString()
          : undefined,
      }),
    });
    toast('Nota adicionada');
    await openCrm(userId);
    await refresh();
  } catch (error) {
    toast(error.message, true);
  }
}

function openClientCrm(id) {
  setTab('crm');
  setTimeout(() => openCrm(id), 0);
}

function renderAudit() {
  const events = data.audit?.events || data.audit?.audit || [];
  $('content').innerHTML =
    '<div class="card"><h3>Trilha administrativa</h3><p class="muted">Bloqueios, arquivamentos, CRM e ações sensíveis permanecem registrados.</p>' +
    (events.length
      ? events
          .map(
            (event) =>
              `<div class="audit-row"><small>${fmtDate(
                event.createdAt,
              )}</small><b>${esc(event.action)}</b><div>${esc(
                event.reason || '—',
              )}<br><small>${esc(event.adminEmail || '')} · ${esc(
                event.targetUserId || '',
              )}</small></div></div>`,
          )
          .join('')
      : '<div class="empty">Nenhum evento carregado.</div>') +
    '</div>';
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('nav button').forEach((button) => {
    button.onclick = () => setTab(button.dataset.tab);
  });
  document.querySelectorAll('[data-close-modal]').forEach((node) => {
    node.onclick = closeModal;
  });
  $('loginBtn').onclick = login;
  $('logoutBtn').onclick = () => logout(true);
  $('refreshBtn').onclick = refresh;
  $('password').onkeydown = (event) => {
    if (event.key === 'Enter') login();
  };
  setTab('ops');
  render();
  if (token()) void refresh();
});
