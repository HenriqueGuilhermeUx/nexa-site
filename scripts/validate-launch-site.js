const assert = require('node:assert/strict');
const fs = require('node:fs');

function read(path) {
  assert.ok(fs.existsSync(path), `Arquivo obrigatório ausente: ${path}`);
  return fs.readFileSync(path, 'utf8');
}

const index = read('index.html');
const early = read('primeiros-nexa.html');
const pj = read('pj.html');
const merchant = read('merchant.html');
const pjTheme = read('nexa-pj-bank-erp.css');
const admin = read('admin.html');
const adminJs = read('admin.js');
const netlify = read('netlify.toml');

assert.match(index, /Cripto sem complicação/i);
assert.match(index, /Primeiros Nexa/i);
assert.match(index, /Pix → USDC/i);
assert.match(index, /sem promessa de rendimento/i);
assert.match(index, /porta de entrada|acesso.*ativos digitais/i);
assert.doesNotMatch(index, /Aave V3 real|20%.*performance fee|Ecossistema em operação/i);

assert.match(early, /\/early-access\/join/);
assert.match(early, /lgpdConsent/);
assert.match(early, /marketingConsent/);
assert.match(early, /referralCode/);
assert.match(early, /lista não abre conta/i);
assert.doesNotMatch(early, /cashback|ganhe USDC|rendimento garantido/i);

// Nexa PJ premium account + ERP presentation must stay isolated from PF.
assert.match(pj, /nexa-pj-bank-erp\.css/);
assert.match(merchant, /nexa-pj-bank-erp\.css/);
assert.match(pj, /Conta \+ ERP \+ Inteligência/);
assert.match(pj, /Prévia conceitual/);
assert.match(pj, /sem dados de cliente/i);
assert.match(pj, /até dois dias úteis/i);
assert.match(pj, /Didit verifica a identidade da pessoa física/i);
assert.match(merchant, /Conta Nexa PJ/);
assert.match(merchant, /Financeiro & ERP\+/);
assert.match(merchant, /recebimentos não representam necessariamente o saldo disponível/i);
assert.match(pjTheme, /\.pj-banking \.pj-product/);
assert.match(pjTheme, /\.pj-banking\.pj-merchant/);
assert.match(pjTheme, /@media\(max-width:650px\)/);
assert.doesNotMatch(pj, /Saldo disponível.*R\$\s*[1-9]/i);
assert.doesNotMatch(pjTheme, /PRIVY_APP_SECRET|DIDIT_WEBHOOK_SECRET|RESEND_API_KEY/);

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

for (const content of [index, early, pj, merchant, admin, adminJs]) {
  assert.doesNotMatch(
    content,
    /PRIVY_APP_SECRET|PRIVY_SECRET_KEY|MASTER_WALLET_PRIVATE_KEY/,
  );
}

console.log(
  'Nexa launch site validated: Primeiros Nexa, PJ pricing, client controls, CRM and two-stage redemption passed.',
);
