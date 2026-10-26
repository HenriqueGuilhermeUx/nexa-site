import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=(p)=>readFileSync(p,'utf8');
const index=read('index.html'),wallet=read('wallet.html'),lifeGateway=read('meu-espaco.html');
const redirects=read('netlify.toml'),builder=read('scripts/build-site.mjs');
const worker=read('sw.js');
const plainRedirects=read('_redirects');
const walletProtectedAliases=["/login","/login/","/login.html","/cadastro.html","/recuperar-senha","/recuperar-senha/","/recuperar-senha.html"];
for(const alias of walletProtectedAliases){
  const marker='https://wallet.trynexa.com.br'+alias+' https://trynexa.com.br'+alias+' 302!';
  assert.ok(plainRedirects.includes(marker),'Missing wallet-only 302 alias '+alias);
  assert.ok(plainRedirects.indexOf(marker) < plainRedirects.indexOf('/login  /login.html'),
    'Domain alias guard must precede legacy global redirects');
}
assert.ok(!plainRedirects.includes('https://trynexa.com.br/login https://wallet.trynexa.com.br'),
  'Original login must not be redirected to unapproved Wallet domain');

assert.match(index,/<title>Nexa — Sua vida, um só lugar<\/title>/);
assert.match(index,/NEXA · SEU ESPAÇO/);
assert.match(index,/Maya · Coordenadora/);
assert.match(index,/Investimentos · F-Insight/);
assert.match(index,/Cripto · Nexa Wallet/);
assert.match(index,/Nexa PJ/);
assert.match(index,/Nexa Global/);
assert.match(index,/Nexa ID/);
assert.match(index,/href="\/meu-espaco"/);
assert.match(lifeGateway,/<title>Meu Espaço Nexa — Acesso antecipado<\/title>/);
assert.match(lifeGateway,/Homologação por convite/);
assert.match(lifeGateway,/nex-personal-preview-api\.onrender\.com/);
assert.match(lifeGateway,/target="_blank" rel="noopener noreferrer"/);
assert.match(lifeGateway,/não cria carteira, conta bancária ou autorização de movimentação/);
assert.ok(!lifeGateway.includes("nexa_access_token")&&!lifeGateway.includes("x-privy-access-token"));
assert.match(redirects,/from = "\/meu-espaco"/);
assert.match(redirects,/to = "\/meu-espaco\.html"/);
assert.match(index,/href="\/wallet">Conhecer a Nexa Wallet<\/a>/);
assert.match(index,/Privy, USDC, Pix e conexões/);
assert.match(index,/Uma marca\. Experiências especializadas/);
assert.match(index,/wallet\.trynexa\.com\.br está em preparação/);
for(const url of ['/portal/','/cadastro','/pj','/agentics','/global','/identity','/primeiros-nexa','/privacidade','/termos','/lgpd','/suporte']){
 assert.ok(index.includes('href="'+url+'"'),'Missing legacy or public destination: '+url);
}
assert.match(wallet,/<title>Nexa Wallet — Sua carteira\. Seus ativos\.<\/title>/);
assert.match(wallet,/href="https:\/\/trynexa\.com\.br\/portal"/);
assert.match(wallet,/href="https:\/\/trynexa\.com\.br\/cadastro"/);
assert.equal((wallet.match(/href="https:\/\/trynexa\.com\.br\/portal"/g)||[]).length,2);
assert.equal((wallet.match(/href="https:\/\/trynexa\.com\.br\/cadastro"/g)||[]).length,3);
assert.doesNotMatch(wallet,/href="\/(portal|cadastro)"/);
assert.match(wallet,/Durante a homologação do novo domínio Wallet/);
assert.ok(!wallet.includes('window.location')&&!wallet.includes('localStorage.')&&!wallet.includes('sessionStorage.'),
 'Marketing landing cannot transfer session or auto-redirect between origins');
assert.match(wallet,/Pix → USDC/);
assert.match(wallet,/Exemplo visual da experiência/);
assert.doesNotMatch(wallet,/<link rel="manifest" href="\/manifest\.webmanifest">/,
 'Wallet should not statically advertise a broken PWA install on an unapproved origin');
assert.equal((wallet.match(/location\.hostname === 'trynexa\.com\.br'/g)||[]).length,2,
 'PWA manifest and service worker must each restrict registration to original origin');
assert.equal((wallet.match(/location\.hostname === 'www\.trynexa\.com\.br'/g)||[]).length,2,
 'Existing www origin must remain supported');
assert.match(wallet,/walletManifest\.rel = 'manifest'/);
assert.match(wallet,/walletManifest\.href = '\/manifest\.webmanifest'/);
assert.match(wallet,/A instalação do PWA continua disponível no endereço original/);
assert.match(wallet,/navigator\.serviceWorker\.register\('\/sw\.js'\)/);
assert.ok(!index.includes('<link rel="manifest" href="/manifest.webmanifest">'),
 'Unified Nexa homepage must not advertise the old Wallet PWA identity');
assert.ok(!index.includes("navigator.serviceWorker.register('/sw.js')"),
 'Unified Nexa homepage must not register the old Wallet root service worker');
// Host-specific temporary redirects must shadow generic /portal and /cadastro
// routes ONLY for wallet.trynexa.com.br. Do not affect trynexa.com.br, PJ,
// Global, API proxies, old Wallet PWA files or existing customer sessions.
for(const [path,destination] of [
 ['/portal','/portal'],
 ['/portal/*','/portal/:splat'],
 ['/cadastro','/cadastro'],
 ['/wallet-v148.html','/wallet-v148.html']
]){
 const route=[
  '[[redirects]]',
  '  from = "https://wallet.trynexa.com.br'+path+'"',
  '  to = "https://trynexa.com.br'+destination+'"',
  '  status = 302',
  '  force = true'
 ].join('\n');
 assert.ok(redirects.includes(route),'Missing host-scoped safe fallback: '+path);
}
assert.ok(redirects.indexOf('from = "https://wallet.trynexa.com.br/portal"') <
 redirects.indexOf('from = "/portal"'),'Host-specific fallback must precede common portal rewrite');
assert.ok(redirects.indexOf('from = "https://wallet.trynexa.com.br/cadastro"') <
 redirects.indexOf('from = "/cadastro"'),'Host-specific fallback must precede common signup rewrite');
assert.ok(!redirects.includes('from = "https://trynexa.com.br/portal"\n  to = "https://wallet.trynexa.com.br'),
 'Never send existing sessions back to the unaudited Privy origin');
assert.match(redirects,/from = "https:\/\/wallet\.trynexa\.com\.br\/"/);
assert.match(redirects,/to = "\/wallet\.html"/);
assert.match(redirects,/from = "\/wallet"/);
assert.match(redirects,/for = "\/manifest\.webmanifest"/);
assert.match(redirects,/Content-Type = "application\/manifest\+json"/);
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
