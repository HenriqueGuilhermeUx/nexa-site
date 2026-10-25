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
 const res=await fetch(ORIGIN+path,{
  method:'GET',redirect:'manual',
  headers:{accept:path.endsWith('.webmanifest')?'application/manifest+json':'text/html'},
  signal:AbortSignal.timeout(12000)
 });
 assert.equal(res.status,200,ORIGIN+path+' must respond HTTP 200 without redirect');
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
assert.ok(portal.includes('/portal/assets/'),
 'The existing Privy Portal must serve assets from the /portal/ base');
assert.ok(!portal.includes('Nexa — Sua vida, um só lugar'),
 'Do not serve the Nexa Life landing in the wallet portal');

const manifest=JSON.parse(await checkedGet('/manifest.webmanifest'));
assert.equal(manifest.name,'Nexa Wallet','The installed Wallet PWA identity must remain stable');
assert.equal(manifest.start_url,'/wallet-v148.html');
assert.equal(manifest.id,'/wallet-v148.html');
await checkedGet('/wallet-v148.html');

// This check cannot establish Privy OTP eligibility, wallet identity/address,
// user session continuity, blockchain correctness or financial execution safety.
// Those remain separately mandatory end-to-end acceptance tests.
console.log('Nexa Wallet read-only HTTPS/domain, portal, PWA and legacy route preflight PASS.');
