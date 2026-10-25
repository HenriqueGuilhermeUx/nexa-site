/**
 * Read-only Nexa Wallet custom-domain readiness check.
 *
 * Default: configuration-only, no network.
 * Enabled: NEXA_WALLET_DOMAIN_PREFLIGHT=true node scripts/check-wallet-domain.mjs
 *
 * Never logs or uses cookies, authentication, user IDs, Private Keys, tokens,
 * API mutations or wallet signatures. The hostname is pinned (no SSRF inputs).
 */
import assert from 'node:assert/strict';

const ORIGIN='https://wallet.trynexa.com.br';
const activated=process.env.NEXA_WALLET_DOMAIN_PREFLIGHT==='true';
const config=[
 {path:'/',title:'Nexa Wallet — Sua carteira. Seus ativos.'},
 {path:'/portal/',title:null},
 {path:'/manifest.webmanifest',title:null},
 {path:'/wallet-v148.html',title:null}
];
assert.equal(new URL(ORIGIN).hostname,'wallet.trynexa.com.br');
assert.ok(config.every(e=>e.path.startsWith('/')&&!e.path.startsWith('//')));
if(!activated){
 console.log('Nexa Wallet domain preflight configured. Network disabled until NEXA_WALLET_DOMAIN_PREFLIGHT=true.');
 process.exit(0);
}

async function checkedGet(path){
 let res=await fetch(ORIGIN+path,{
  method:'GET',redirect:'manual',
  headers:{accept:path.endsWith('.webmanifest')?'application/manifest+json':'text/html'},
  signal:AbortSignal.timeout(12000)
 });
 // Netlify Pretty URLs canonicalizes /portal/ -> /portal with HTTP 301.
 // Explicitly permit only that one same-origin hop, never an arbitrary redirect.
 if(path==='/portal/'&&res.status===301){
   const location=res.headers.get('location');
   assert.ok(location,'Portal canonical redirect must provide Location');
   const target=new URL(location,ORIGIN+path);
   assert.equal(target.origin,ORIGIN,'Wallet portal must not redirect to another origin');
   assert.equal(target.pathname,'/portal','Wallet portal may only normalize its trailing slash');
   assert.equal(target.search,'','Wallet portal must not inject redirect query parameters');
   assert.equal(target.hash,'','Wallet portal must not inject redirect fragments');
   res=await fetch(target.href,{method:'GET',redirect:'manual',signal:AbortSignal.timeout(12000)});
 }
 assert.equal(res.status,200,ORIGIN+path+' must respond HTTP 200 (except safe /portal/ canonicalization)');
 assert.ok(String(res.headers.get('content-type')||'').includes(path.endsWith('.webmanifest')?'json':'html'),
  ORIGIN+path+' must expose correct MIME');
 assert.equal(new URL(res.url).host,new URL(ORIGIN).host,'Wallet must stay on wallet origin');
 const body=await res.text();
 assert.ok(body.length>100&&body.length<2_000_000,'Unexpected content length '+path);
 return body;
}

const landing=await checkedGet('/');
assert.ok(landing.includes('<title>Nexa Wallet — Sua carteira. Seus ativos.</title>'),
 'Wallet subdomain cannot show the unified Nexa Life homepage');
assert.ok(landing.includes('href="/portal"'),
 'The old Wallet entry must remain visible');

const portal=await checkedGet('/portal/');
// Netlify's Pretty URLs currently serves the legacy portal at /portal,
// while the separately compiled React frontend is at /portal/index.html.
// Preserve both: forcing /portal to the compiled React build would be a
// customer-facing application migration and needs a separate E2E release.
assert.ok(portal.includes('<title>Nexa | Portal Web</title>'),
 'The existing /portal customer login must remain available');
assert.ok(portal.includes('Entrar no Portal Nexa'),
 'The original login screen must still render');
assert.ok(!portal.includes('Nexa — Sua vida, um só lugar'),
 'Do not serve Nexa marketing in the existing Wallet login');

const mainPortal=await fetch('https://trynexa.com.br/portal',{
 method:'GET',redirect:'manual',signal:AbortSignal.timeout(12000)
});
assert.equal(mainPortal.status,200,'Original production portal must still be available');
assert.equal(new URL(mainPortal.url).host,'trynexa.com.br','Original portal origin must not change');
assert.equal(await mainPortal.text(),portal,
 'Wallet custom domain must preserve the same existing login HTML until authentication cutover is approved');

const compiledPortal=await checkedGet('/portal/index.html');
assert.ok(compiledPortal.includes('/portal/assets/'),
 'The compiled React portal must remain accessible at its existing explicit asset path');

const manifest=JSON.parse(await checkedGet('/manifest.webmanifest'));
assert.equal(manifest.name,'Nexa Wallet','The installed Wallet PWA identity must remain stable');
assert.equal(manifest.start_url,'/wallet-v148.html');
assert.equal(manifest.id,'/wallet-v148.html');
await checkedGet('/wallet-v148.html');

// This check cannot establish Privy OTP eligibility, wallet identity/address,
// user session continuity, blockchain correctness or financial execution safety.
// Those remain separately mandatory end-to-end acceptance tests.
console.log('Nexa Wallet read-only HTTPS/domain, legacy portal equivalence, React assets and PWA preflight PASS.');
