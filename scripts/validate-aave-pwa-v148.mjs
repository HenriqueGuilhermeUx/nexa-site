#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';

const wallet=fs.readFileSync('wallet-v148.html','utf8');
const manifest=JSON.parse(fs.readFileSync('manifest.webmanifest','utf8'));
const netlify=fs.readFileSync('netlify.toml','utf8');
const sw=fs.readFileSync('sw.js','utf8');
assert.equal(manifest.id,'/wallet-v148.html');
assert.equal(manifest.start_url,'/wallet-v148.html');
assert.equal(manifest.scope,'/');
assert.ok(sw);
for(const marker of [
  '<main id="aave" class="page hidden">',
  'aavePilotAvailability','aavePrivyHandoff','onclick="go(\'aave\')"',
  "api('/invest-credit/aave/pilot/status',{headers:auth(false)})",
  'response.pilotEnabled===true','button.disabled=!aavePwaPilotReady',
  'if(!aavePwaPilotReady||!token)',
  "location.href='/portal/'", "if(id==='aave')void loadAavePwaStatus();",
  '<main id="wallet" class="page hidden">',
  '<main id="rewards" class="page hidden">',
  "go('deposit')","go('withdraw')","go('send')",
  "let token=localStorage.getItem('nexa_access_token')",
]) assert.ok(wallet.includes(marker),'Missing PWA Aave or legacy safety marker: '+marker);
const snippet=wallet.slice(wallet.indexOf('let aavePwaPilotReady=false;'),
  wallet.indexOf('function selectAsset(a)'));
assert.ok(!snippet.includes('eth_sendTransaction'));
assert.ok(!snippet.includes('privateKey'));
assert.ok(!snippet.includes('signTransaction'));
assert.ok(!snippet.includes('localStorage.setItem'));
assert.ok(netlify.includes('NEXA_PORTAL_COMMIT'));
assert.ok(wallet.includes("if('serviceWorker'in navigator)navigator.serviceWorker.register('/sw.js')"));
assert.ok(!wallet.includes('nexa_aave_seed'));
console.log('Installed Nexa PWA v148 Aave entry PASS: no wallet signer, auth-gated same-origin portal, immutable manifest/scope and legacy actions.');
