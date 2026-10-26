import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const workers={};
let reads=0,writes=0,downloads=[];
const cache={
  open:async()=>({put:async()=>{writes++}}),
  match:async()=>{reads++;return null;}
};
const result={ok:true,clone(){return result;}};
const context={
  self:{
    location:{origin:'https://trynexa.com.br'},
    addEventListener(name,listener){workers[name]=listener;}
  },
  caches:cache,
  fetch:async req=>{downloads.push(req.url);return result;},
  URL,
  console
};
vm.runInNewContext(readFileSync('sw.js','utf8'),context,{filename:'sw.js'});
assert.equal(typeof workers.fetch,'function');

async function simulate(path,mode='navigate',method='GET'){
  const req={url:'https://trynexa.com.br'+path,method,mode,headers:{has:()=>false}};
  let response;
  const event={request:req,respondWith(promise){response=Promise.resolve(promise);}};
  workers.fetch(event);
  if(response)await response;
  await Promise.resolve();
  return Boolean(response);
}

for(const path of [
 '/meu-espaco/app',
 '/meu-espaco/app/',
 '/meu-espaco/app/index.html',
 '/meu-espaco/app/assets/bundle.js',
 '/meu-espaco/app/assets/styles.css',
 '/meu-espaco/app/nexa-logo.svg',
 '/meu-espaco/app/financas'
]){
 const beforeReads=reads,beforeWrites=writes,beforeFetch=downloads.length;
 assert.equal(await simulate(path,path.includes('/assets/')?'same-origin':'navigate'),true);
 assert.equal(reads,beforeReads,'Wallet SW read the Life OS cache: '+path);
 assert.equal(writes,beforeWrites,'Wallet SW wrote into the Life OS namespace: '+path);
 assert.equal(downloads.length,beforeFetch+1,'Life OS must use network-only fetch: '+path);
}

const readsBefore=reads,writesBefore=writes;
assert.equal(await simulate('/wallet-v148.html'),true,'Old Wallet PWA still uses navigation routing');
await new Promise(resolve=>setImmediate(resolve));
assert.ok(writes>writesBefore,'Original Wallet navigation caching unexpectedly disabled');
assert.equal(await simulate('/portal/assets/example.js','same-origin'),true);
assert.ok(reads>readsBefore,'Original Wallet static asset cache unexpectedly disabled');
assert.equal(await simulate('/api/v1/health'),true,'Original Wallet API still network-only');
assert.equal(await simulate('/meu-espaco/app/conta','navigate','POST'),false,'Non-GET must not be intercepted');

console.log('Wallet root SW: future Nexa Life OS never cached, existing Wallet navigation/assets preserved PASS');
