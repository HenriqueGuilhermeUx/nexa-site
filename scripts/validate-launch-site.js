const assert = require('node:assert/strict');
const fs = require('node:fs');

function read(path) {
  assert.ok(fs.existsSync(path), `Arquivo obrigatório ausente: ${path}`);
  return fs.readFileSync(path, 'utf8');
}

const index = read('index.html');
const wallet = read('wallet.html');
const early = read('primeiros-nexa.html');
const pj = read('pj.html');
const merchant = read('merchant.html');
const admin = read('admin.html');
const adminJs = read('admin.js');
const netlify = read('netlify.toml');

// The flagship is now the broad Nexa experience, while all previously
// validated Wallet marketing copy is retained unaltered on wallet.html.
assert.match(index, /Nexa — Sua vida, um só lugar/i);
assert.match(index, /Maya e especialistas/i);
assert.match(index, /Investimentos e F-Insight/i);
assert.match(index, /Nexa Wallet/i);
assert.match(index, /Cripto sem complicação/i);
assert.match(index, /Primeiros Nexa/i);
assert.match(index, /href="\/portal\/"/);
assert.doesNotMatch(index, /Aave V3 real|20%.*performance fee|Ecossistema em operação/i);
assert.match(wallet, /Cripto sem complicação/i);
assert.match(wallet, /Pix → USDC/i);
assert.match(wallet, /sem promessa de rendimento/i);
assert.match(wallet, /porta de entrada|acesso.*ativos digitais/i);
assert.doesNotMatch(wallet, /Aave V3 real|20%.*performance fee|Ecossistema em operação/i);

assert.match(early, /\/early-access\/join/);
assert.match(early, /lgpdConsent/);
assert.match(early, /marketingConsent/);
assert.match(early, /referralCode/);
assert.match(early, /lista não abre conta/i);
assert.doesNotMatch(early, /cashback|ganhe USDC|rendimento garantido/i);

assert.match(pj, /1,49%/);
assert.match(pj, /2,49%/);
assert.match(pj, /R\$ 0,99/);
assert.match(pj, /R\$ 50\.000,00/);
assert.match(pj, /liquidação real/i);
assert.doesNotMatch(pj, /QR Code fixo|liquide como quiser|842\.30|37/);

assert.match(merchant, /Valor em R\$/i);
assert.match(merchant, /checkout\/quote/);
assert.match(merchant, /estimated|Estimativa/i);
assert.match(merchant, /automaticSettlement|liquidação automática|não força uma liquidação/i);
assert.doesNotMatch(merchant, /Taxa Nexa PJ[^\n]*1,9%/i);
assert.doesNotMatch(merchant, /Valor em USDC/i);
assert.doesNotMatch(merchant, /Executar liquidação/i);
assert.doesNotMatch(merchant, /Gerar QR Code fixo/i);
assert.doesNotMatch(merchant, /5[,.]14/);

assert.match(admin, /data-tab="primeiros"/);
assert.match(admin, /data-tab="checkout"/);
assert.match(admin, /data-tab="crm"/);
assert.match(adminJs, /early-access\/admin\/summary/);
assert.match(adminJs, /merchant-admin\/transactions/);
assert.match(adminJs, /record-usdc-purchase/);
assert.match(adminJs, /manual-redemption\/.*record-sale/);
assert.match(adminJs, /manual-redemption\/.*confirm-payout/);
assert.match(adminJs, /toggleBlock/);
assert.match(adminJs, /toggleArchive/);
assert.match(adminJs, /deleteIncompleteClient/);
assert.match(adminJs, /canDeleteIncompleteClient/);
assert.match(adminJs, /nextFollowUpAt/);
assert.match(adminJs, /at_risk/);
assert.doesNotMatch(adminJs, /\/payment\/confirm/);
assert.doesNotMatch(adminJs, /PIX REALIZADO/i);
assert.doesNotMatch(adminJs, /finishPayment\(/);
assert.doesNotMatch(adminJs, /treasury-admin\/trades\/sell-usdc/);
assert.doesNotMatch(adminJs, /amountBrl[^\n]{0,160}redemption/i);

assert.match(netlify, /from = "\/primeiros-nexa"/);
assert.match(netlify, /to = "\/primeiros-nexa\.html"/);
assert.match(netlify, /from = "\/api\/v1\/\*"/);

for (const content of [index, wallet, early, pj, merchant, admin, adminJs]) {
  assert.doesNotMatch(
    content,
    /PRIVY_APP_SECRET|PRIVY_SECRET_KEY|MASTER_WALLET_PRIVATE_KEY/,
  );
}

console.log(
  'Nexa unified homepage + preserved Wallet validated: Primeiros Nexa, PJ pricing, client controls, CRM and two-stage redemption passed.',
);
