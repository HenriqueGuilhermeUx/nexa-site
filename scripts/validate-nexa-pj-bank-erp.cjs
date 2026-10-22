// Isolated Nexa PJ marketing UI acceptance checks. No network or accounts.
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const html=fs.readFileSync('pj.html','utf8');
const css=fs.readFileSync('nexa-pj-bank-erp.css','utf8');
assert.match(html,/<body class="[^"]*pj-banking/,'PJ-only scope is required');
assert.match(html,/<link rel="stylesheet" href="\/nexa-pj-bank-erp\.css">/);
for(const label of [
  'Conta Nexa','ERP','CRM','cobranças','documentos',
  'Inteligência','Saldos da empresa','Contas a receber','Contas a pagar',
  'Visão empresarial','Didit','dois dias úteis','revisão',
]){
  assert.ok(html.toLowerCase().includes(label.toLowerCase()),'Missing user-facing feature: '+label);
}
for(const clause of [
  'Prévia conceitual','não exibe saldos reais','liberação financeira',
  'contrato social','ato constitutivo','CCMEI',
  'revisão empresarial feita manualmente',
  'A aprovação do cadastro não libera automaticamente',
]){
  assert.ok(html.includes(clause),'Missing financial/auth disclaimer: '+clause);
}
assert.ok(!/Saldo Conta Nexa.{0,80}R\$\s*\d/.test(html),
  'Public preview must never fabricate financial account balances');
assert.match(html,/<a[^>]+href="#abrir-conta"/);
assert.match(html,/<a[^>]+href="\/merchant"/);
assert.match(html,/<a[^>]+href="\/cadastro"/);
assert.doesNotMatch(html,/Identidade empresarial validada|Você aprova\./,
  'Public copy must not imply KYC complete or customer approves their own PJ');
assert.match(css,/\.pj-banking \.pj-product/);
assert.match(css,/\.pj-banking \.pj-kpi-row/);
assert.match(css,/@media\(max-width:650px\)/);
assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
assert.doesNotMatch(css,/(?:^|\n)body\s*\{/,
  'Bank-ERP CSS must not change the shared Nexa PF site');
assert.doesNotMatch(css,/(?:^|\n)(?:\.sidebar|\.hero|nav|main)\s*\{/,
  'New CSS cannot have unscoped global selectors');
assert.match(html,/<section id="plataforma"/);
assert.match(html,/<section id="conta"/);
assert.match(html,/<section id="abrir-conta"/);
assert.match(html,/<section id="precos"/);
console.log('PASS: scoped premium Nexa PJ bank+ERP landing, honest demo, PF Didit + manual KYB, mobile and no legacy spillover');
