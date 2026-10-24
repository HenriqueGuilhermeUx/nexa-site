import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=(p)=>readFileSync(p,'utf8');
const index=read('index.html'),wallet=read('wallet.html');
const redirects=read('netlify.toml'),builder=read('scripts/build-site.mjs');
const worker=read('sw.js');
assert.match(index,/<title>Nexa — Sua vida, um só lugar<\/title>/);
assert.match(index,/NEXA · SEU ESPAÇO/);
assert.match(index,/Maya · Coordenadora/);
assert.match(index,/Investimentos · F-Insight/);
assert.match(index,/Cripto · Nexa Wallet/);
assert.match(index,/Nexa PJ/);
assert.match(index,/Nexa Global/);
assert.match(index,/Nexa ID/);
assert.match(index,/Privy, USDC, Pix e conexões/);
assert.match(index,/Uma marca\. Experiências especializadas/);
assert.match(index,/wallet\.trynexa\.com\.br está em preparação/);
for(const url of ['/portal/','/cadastro','/pj','/agentics','/global','/identity','/primeiros-nexa','/privacidade','/termos','/lgpd','/suporte']){
 assert.ok(index.includes('href="'+url+'"'),'Missing legacy or public destination: '+url);
}
assert.match(wallet,/<title>Nexa Wallet — Sua carteira\. Seus ativos\.<\/title>/);
assert.match(wallet,/href="\/portal"/);
assert.match(wallet,/Pix → USDC/);
assert.match(wallet,/Exemplo visual da experiência/);
assert.match(redirects,/from = "https:\/\/wallet\.trynexa\.com\.br\/"/);
assert.match(redirects,/to = "\/wallet\.html"/);
assert.match(redirects,/from = "\/wallet"/);
assert.match(redirects,/from = "\/portal\/\*"/);
assert.match(redirects,/to = "\/portal\/index\.html"/);
assert.match(redirects,/from = "\/api\/v1\/\*"/);
assert.match(redirects,/to = "https:\/\/nexa-backend-p2u0\.onrender\.com\/api\/v1\/:splat"/);
assert.match(builder,/NEXA_PORTAL_COMMIT/);
assert.match(builder,/VITE_BASE_PATH: '\/portal\/'/);
assert.match(worker,/authenticated \|\|/);
assert.match(worker,/url\.pathname\.startsWith\('\/api\/'\)/);
assert.ok(!index.includes('src="https://nex-personal-preview-api.onrender.com"'),'PF isolated preview must not be embedded into public marketing pages');
assert.ok(!index.includes('nexa_access_token')&&!index.includes('x-privy-access-token'),
 'Unified marketing site must never handle production wallet credentials');
assert.ok(!redirects.includes('from = "https://trynexa.com.br/portal/"\n  to = "https://wallet.trynexa.com.br"'),
 'Old wallet deep links must not be redirected before migration');
console.log('Nexa brand/domain split static smoke: legacy portal, PF isolation, Wallet content and routing retained OK');
