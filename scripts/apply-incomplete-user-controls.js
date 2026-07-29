const fs = require('node:fs');

const path = 'admin.js';
let source = fs.readFileSync(path, 'utf8');

if (!source.includes('function canDeleteIncompleteClient(client)')) {
  const marker = 'function renderClientes() {';
  const index = source.indexOf(marker);
  if (index < 0) throw new Error('Could not locate renderClientes');
  const helper = `function canDeleteIncompleteClient(client) {
  const kycStatus = String(client?.kycStatus || '').toLowerCase();
  return Boolean(
    client &&
      kycStatus !== 'approved' &&
      ledgerUsdc(client) === 0 &&
      !client.walletAddress &&
      !client.privyUserId &&
      !client.privyWalletId,
  );
}

`;
  source = source.slice(0, index) + helper + source.slice(index);
}

if (!source.includes("onclick=\"deleteIncompleteClient('")) {
  const start = source.indexOf('        const deleteButton = user.isTestOrAdmin');
  const end = source.indexOf("        return `<tr>", start);
  if (start < 0 || end < 0) throw new Error('Could not locate delete button block');
  const replacement = `        const canDelete =
          user.isTestOrAdmin || canDeleteIncompleteClient(user);
        const deleteButton = canDelete
          ? \`<button class="small-btn red" onclick="deleteIncompleteClient('\${user.id}')">\${
              user.isTestOrAdmin ? 'Excluir teste' : 'Excluir incompleto'
            }</button>\`
          : '';
`;
  source = source.slice(0, start) + replacement + source.slice(end);
}

if (!source.includes('async function deleteIncompleteClient(id)')) {
  const start = source.indexOf('async function deleteTestClient(id)');
  const end = source.indexOf('async function report(id)', start);
  if (start < 0 || end < 0) throw new Error('Could not locate delete handler');
  const handler = `async function deleteIncompleteClient(id) {
  const client = clientById(id);
  const canDelete =
    client.isTestOrAdmin || canDeleteIncompleteClient(client);
  if (!canDelete) {
    return toast(
      'Exclusão definitiva só é permitida para cadastro incompleto e vazio. Use Arquivar para os demais clientes.',
      true,
    );
  }

  const reason =
    prompt(
      'Motivo obrigatório da exclusão:',
      client.isTestOrAdmin
        ? 'Conta criada exclusivamente para QA'
        : 'Cadastro incompleto sem KYC, carteira ou histórico financeiro',
    ) || '';
  if (!reason.trim()) return;

  const confirmEmail =
    prompt('Digite exatamente o e-mail da conta para confirmar:', '') || '';
  if (
    confirmEmail.trim().toLowerCase() !==
    String(client.email || '').toLowerCase()
  ) {
    return toast('O e-mail de confirmação não corresponde.', true);
  }

  const label = client.isTestOrAdmin
    ? 'esta conta de teste vazia'
    : 'este cadastro incompleto';
  if (!confirm(\`Excluir definitivamente \${label}?\`)) return;

  try {
    await call(\`/admin/users/\${encodeURIComponent(id)}\`, {
      method: 'DELETE',
      body: JSON.stringify({ reason, confirmEmail }),
    });
    toast(
      client.isTestOrAdmin
        ? 'Conta de teste excluída'
        : 'Cadastro incompleto excluído',
    );
    await refresh();
  } catch (error) {
    toast(error.message, true);
  }
}

`;
  source = source.slice(0, start) + handler + source.slice(end);
}

fs.writeFileSync(path, source);

const ciPath = '.github/workflows/site-ci.yml';
let ci = fs.readFileSync(ciPath, 'utf8');
if (!ci.includes('Validate incomplete-user controls')) {
  const marker = '      - name: Validate required pages\n';
  const step =
    '      - name: Validate incomplete-user controls\n' +
    '        run: node scripts/validate-incomplete-user-controls.js\n';
  if (!ci.includes(marker)) throw new Error('Could not locate site CI anchor');
  ci = ci.replace(marker, step + marker);
  fs.writeFileSync(ciPath, ci);
}

console.log('Incomplete-user Control Center changes applied.');
