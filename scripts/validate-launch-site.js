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
const admin = read('admin.html');
const adminJs = read('admin.js');
const netlify = read('netlify.toml');

assert.match(index, /Cripto sem complicação/i);
assert.match(index, /Primeiros Nexa/i);
assert.match(index, /Pix → USDC/i);
assert.match(index, /sem promessa de rendimento/i);
assert.doesNotMatch(index, /Aave V3 real|20%.*performance fee|Ecossistema em operação/i);

assert.match(early, /\/early-access\/join/);
assert.match(early, /lgpdConsent/);
assert.match(early, /marketingConsent/);
assert.match(early, /referralCode/);
assert.match(early, /lista não abre conta/i);

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

assert.match(admin, /data-tab="primeiros"/);
assert.match(admin, /data-tab="checkout"/);
assert.match(adminJs, /early-access\/admin\/summary/);
assert.match(adminJs, /merchant-admin\/transactions/);
assert.match(adminJs, /record-usdc-purchase/);
assert.match(adminJs, /treasury-admin\/trades\/sell-usdc/);
assert.doesNotMatch(adminJs, /finishPayment\(/);

assert.match(netlify, /from = "\/primeiros-nexa"/);
assert.match(netlify, /to = "\/primeiros-nexa\.html"/);
assert.match(netlify, /from = "\/api\/v1\/\*"/);

for (const content of [index, early, pj, merchant, admin, adminJs]) {
  assert.doesNotMatch(content, /PRIVY_APP_SECRET|PRIVY_SECRET_KEY|MASTER_WALLET_PRIVATE_KEY/);
}

console.log('Nexa launch site validated: strategy, early access, PJ pricing and safe operations passed.');
