/**
 * Nexa Wallet Privy allowed-origin readiness probe.
 *
 * Checks ONLY Privy's public app configuration. No cookies, OTP, user records,
 * private API credentials, keys, wallet signatures or transfers.
 * Default: inert, no network. Opt in with NEXA_PRIVY_ORIGIN_CHECK=true.
 *
 * A positive result is necessary, NOT sufficient, for migrating accounts.
 * Separate browser CSP and existing-customer same-wallet E2E remain mandatory.
 */
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';

export const PRIVY_APP_ID='cmpen2gm3007v0cjswjlyefji';
export const REQUIRED_ORIGIN='https://wallet.trynexa.com.br';
export const PUBLIC_CONFIG_URL='https://auth.privy.io/api/v1/apps/'+PRIVY_APP_ID;

export function inspectAllowedOrigin(app){
  assert.equal(app?.id,PRIVY_APP_ID,'Unexpected Privy app ID: do not approve a different wallet app');
  assert.ok(Array.isArray(app?.allowed_domains),'Privy configuration missing allowed_domains');
  assert.ok(app.allowed_domains.every(domain=>typeof domain==='string'),'Malformed origin list');
  return app.allowed_domains.includes(REQUIRED_ORIGIN);
}

async function main(){
  if(process.env.NEXA_PRIVY_ORIGIN_CHECK!=='true'){
    console.log('Privy domain gate configured: no network by default. Set NEXA_PRIVY_ORIGIN_CHECK=true for public GET.');
    return;
  }
  const res=await fetch(PUBLIC_CONFIG_URL,{
    method:'GET',redirect:'error',
    headers:{'privy-app-id':PRIVY_APP_ID,accept:'application/json'},
    signal:AbortSignal.timeout(12000)
  });
  assert.equal(res.status,200,'Privy public configuration unavailable (do not assume allowed)');
  assert.ok(String(res.headers.get('content-type')||'').includes('json'),'Unexpected Privy response MIME');
  const app=await res.json();
  if(inspectAllowedOrigin(app)){
    console.log('PRIVY_DOMAIN_CONFIG_ALLOWED: Exact wallet origin appears in the existing Privy app allowed_domains. CSP browser test and same-wallet account E2E still REQUIRED.');
  }else{
    console.error('PRIVY_DOMAIN_CONFIG_BLOCKED: wallet.trynexa.com.br is not authorized in existing Privy app allowed_domains.');
    console.error('Action: add https://wallet.trynexa.com.br to allowed Web & mobile web origins in the SAME Privy dashboard app. Keep existing origins. Do NOT remove auth fallback redirects.');
    process.exitCode=2;
  }
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  await main().catch(err=>{
    console.error('PRIVY_DOMAIN_CONFIG_UNKNOWN: '+(err instanceof Error?err.message:'Public configuration check failed'));
    process.exitCode=1;
  });
}
