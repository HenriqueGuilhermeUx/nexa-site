import assert from 'node:assert/strict';
import test from 'node:test';
import {
 PRIVY_APP_ID,REQUIRED_ORIGIN,PUBLIC_CONFIG_URL,inspectAllowedOrigin
} from './check-privy-origin.mjs';

test('pins existing Nexa Wallet Privy app and exact HTTPS wallet origin',()=>{
 assert.equal(PRIVY_APP_ID,'cmpen2gm3007v0cjswjlyefji');
 assert.equal(REQUIRED_ORIGIN,'https://wallet.trynexa.com.br');
 assert.equal(PUBLIC_CONFIG_URL,'https://auth.privy.io/api/v1/apps/'+PRIVY_APP_ID);
});
test('requires exact origin rather than parent, wildcard or path variant',()=>{
 const allowed=['https://trynexa.com.br','https://www.trynexa.com.br'];
 assert.equal(inspectAllowedOrigin({id:PRIVY_APP_ID,allowed_domains:allowed}),false);
 for(const value of ['https://*.trynexa.com.br','http://wallet.trynexa.com.br',
  'https://wallet.trynexa.com.br/','https://wallet.trynexa.com.br/portal']){
  assert.equal(inspectAllowedOrigin({id:PRIVY_APP_ID,allowed_domains:[value]}),false);
 }
 assert.equal(inspectAllowedOrigin({id:PRIVY_APP_ID,allowed_domains:[...allowed,REQUIRED_ORIGIN]}),true);
});
test('fails closed when app ID mismatches or response omits allowed_domains',()=>{
 assert.throws(()=>inspectAllowedOrigin({id:'wrong-app',allowed_domains:[REQUIRED_ORIGIN]}));
 assert.throws(()=>inspectAllowedOrigin({id:PRIVY_APP_ID}));
 assert.throws(()=>inspectAllowedOrigin({id:PRIVY_APP_ID,allowed_domains:[null]}));
});
