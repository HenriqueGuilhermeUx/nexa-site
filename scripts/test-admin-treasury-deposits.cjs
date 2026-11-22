// Read-only Nexa Admin deposit operations renderer regression tests.
const { readFileSync } = require('node:fs');
const { runInNewContext } = require('node:vm');
const assert = require('node:assert/strict');

const source = readFileSync('admin-treasury-deposits.js', 'utf8');
const window = {};
runInNewContext(source, { window });
const render = window.renderDepositOperationsPanel;
assert.equal(typeof render, 'function');
const absent = render(null);
assert.match(absent, /ainda não disponível/);
assert.doesNotMatch(absent, /R\$ 0,00|0 USDC/);

const evil = '<img src=x onerror=alert(1)>';
const sample = {
  success: true,
  mode: 'READ_ONLY_OPERATOR_ASSISTANCE',
  coverage: { status: 'UNKNOWN', providerBalancesVerified: false, availableUsdc: null, additionalUsdcToBuy: null },
  alerts: [{ key: evil, severity: 'REVIEW_REQUIRED', action: evil }],
  settlements: [{
    id: evil, fiatProvider: 'woovi', fiatStatus: 'paid',
    grossBrl: '10.00', netBrlForUsdc: '9.10', obligationUsdcRecorded: '1.4768',
    linkedVerifiedDeliveryCount: 1, linkedDeliveryCount: 1,
    operation: { evidence: 'CONFIRMED_RECORD', reason: evil },
  }],
  deliveries: [{
    id: 'delivery-1', status: 'provider_uncertain', amountUsdc: '1',
    operation: { reason: 'Não reenviar' },
  }],
};
const html = render(sample);
assert.match(html, /Não comprovada/);
assert.match(html, /Não comprovado/);
assert.match(html, /Não reenviar/);
assert.match(html, /delivery-1/);
assert.doesNotMatch(html, /<img src=x/);
assert.match(html, /&lt;img/);
assert.doesNotMatch(html, /undefined|NaN/);
assert.match(html, /Registro confirmado/);
assert.doesNotMatch(html, /button[^>]*comprar|button[^>]*transferir/i);
console.log('Nexa treasury operator UI: safe fallback, escaping, unknown coverage, uncertainty PASS');
