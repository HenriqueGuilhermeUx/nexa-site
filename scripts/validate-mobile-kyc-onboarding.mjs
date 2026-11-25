import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const signup=readFileSync('cadastro.html','utf8');
const netlify=readFileSync('netlify.toml','utf8');
assert.match(signup,/Após criar a conta · ative sua carteira no app/);
assert.match(signup,/A Didit continua disponível no/);
assert.match(signup,/href="\/portal\/"/);
assert.match(signup,/\/ativar-carteira\.html\?origem=cadastro/);
assert.match(signup,/entre na mesma conta/);
assert.match(signup,/Não precisa depositar/);
assert.match(signup,/id="educationConsent" type="checkbox"/);
assert.doesNotMatch(signup,/id="educationConsent"[^>]*checked/i);
assert.match(netlify,/NEXA_PORTAL_COMMIT\s*=\s*"[0-9a-f]{40}"/);
const pinned=netlify.match(/NEXA_PORTAL_COMMIT\s*=\s*"([0-9a-f]{40})"/)?.[1];
assert.notEqual(pinned,'eebe294281cfe9d64bef66958d85594e3aae4806',
 'Do not swap pinned production portal to diverged React main');
assert.match(netlify,/NEXA_GLOBAL_APP_COMMIT\s*=\s*"a930c2438691e3b2026fa0a5a5e9a9b9d8ec1499"/);
console.log('Native Privy-first web handoff, Didit portal fallback and pinned portal/global app PASS');
