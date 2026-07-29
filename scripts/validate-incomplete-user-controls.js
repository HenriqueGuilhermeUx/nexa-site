const assert = require('node:assert/strict');
const fs = require('node:fs');

const admin = fs.readFileSync('admin.js', 'utf8');

assert.match(admin, /function canDeleteIncompleteClient\(client\)/);
assert.match(admin, /Excluir incompleto/);
assert.match(admin, /async function deleteIncompleteClient\(id\)/);
assert.match(admin, /Cadastro incompleto sem KYC, carteira ou histórico financeiro/);
assert.match(admin, /\/admin\/users\/\$\{encodeURIComponent\(id\)\}/);
assert.doesNotMatch(admin, /async function deleteTestClient\(id\)/);

console.log('Control Center incomplete-user deletion controls validated.');
