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

// Temporary, reversible authentication safety gate. A user who deep-links to
// the new Wallet domain must be sent ONLY to an identical path at the original
// trusted origin (never copy tokens/cookies, never create or link a wallet).
const TRUSTED='https://trynexa.com.br';
async function expectTemporaryHandoff(path,expectedPath){
 const res=await fetch(ORIGIN+path,{
  method:'GET',redirect:'manual',signal:AbortSignal.timeout(12000)
 });
 assert.equal(res.status,302,'Wallet auth route must use temporary HTTP 302: '+path);
 const destination=new URL(res.headers.get('location')||'',ORIGIN+path);
 assert.equal(destination.origin,TRUSTED,'Auth handoff must go only to original site');
 assert.equal(destination.pathname,expectedPath,'Auth handoff must preserve explicit path');
 assert.equal(destination.search,'','Auth handoff must not include query params');
 assert.equal(destination.hash,'','Auth handoff must not include fragments');
 return destination;
}
await expectTemporaryHandoff('/portal','/portal');
await expectTemporaryHandoff('/portal/index.html','/portal/index.html');
await expectTemporaryHandoff('/cadastro','/cadastro');
await expectTemporaryHandoff('/wallet-v148.html','/wallet-v148.html');

// Root /portal/ is optionally canonicalized by Netlify Pretty URLs before
// the auth redirect. If so, that single internal hop must have a fixed target.
const portalWithSlash=await fetch(ORIGIN+'/portal/',{
 method:'GET',redirect:'manual',signal:AbortSignal.timeout(12000)
});
assert.ok([301,302].includes(portalWithSlash.status),'Unsafe slash normalization');
if(portalWithSlash.status===301){
 const location=new URL(portalWithSlash.headers.get('location')||'',ORIGIN+'/portal/');
 assert.equal(location.origin,ORIGIN);
 assert.equal(location.pathname,'/portal');
 await expectTemporaryHandoff('/portal','/portal');
}else{
 const loc=new URL(portalWithSlash.headers.get('location')||'',ORIGIN+'/portal/');
 assert.equal(loc.origin,TRUSTED);
 assert.equal(loc.pathname,'/portal');
}

// Old origin remains directly usable and keeps both original React and
// legacy login surfaces, with no redirect back to the untrusted origin.
for(const [path,marker] of [
 ['/portal','<title>Nexa | Portal Web</title>'],
 ['/portal/index.html','/portal/assets/'],
 ['/cadastro','<title>Cadastro | Nexa</title>']
]){
 const res=await fetch(TRUSTED+path,{redirect:'manual',signal:AbortSignal.timeout(12000)});
 assert.equal(res.status,200,'Original trusted route must remain available: '+path);
 assert.ok((await res.text()).includes(marker),'Trusted content changed: '+path);
}
const manifest=JSON.parse(await checkedGet('/manifest.webmanifest'));
assert.equal(manifest.name,'Nexa Wallet','The installed Wallet PWA identity must remain stable');
assert.equal(manifest.start_url,'/wallet-v148.html');
assert.equal(manifest.id,'/wallet-v148.html');


// This check cannot establish Privy OTP eligibility, wallet identity/address,
// user session continuity, blockchain correctness or financial execution safety.
// Those remain separately mandatory end-to-end acceptance tests.
console.log('Nexa Wallet domain, trusted-origin temporary auth fallback and PWA preflight PASS.');
