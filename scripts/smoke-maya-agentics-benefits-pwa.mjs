import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const js=readFileSync('maya-agentics-benefits.js','utf8');
const html=readFileSync('portal.html','utf8');
function load(){
 const ctx={};vm.createContext(ctx);vm.runInContext(js,ctx,{timeout:1000});
 return ctx.NexaMayaAgenticsBenefits;
}
const alice='11111111-1111-4111-8111-111111111111';
function valid(premiumActive){
 return {contract:'nexa-maya-agentics-benefits-v1',actorUserId:alice,
 mayaGeneralAccess:true,mayaAgenticsPremiumBenefit:true,premiumActive,
 agenticsPilotStatus:'under_homologation',previewAvailable:false,
 externalEffects:false,financialExecution:false,reviewRequired:true};
}
test('the logged-in PWA contains a clear benefit but never claims the pilot is live',()=>{
 assert.match(html,/id="mayaAgenticsBenefitsCard"/);
 assert.match(html,/MAYA \+ AGENTICS · BENEFÍCIO PREMIUM/);
 assert.match(html,/Maya para todos/);
 assert.match(html,/Maya \+ Agentics Premium/);
 assert.match(html,/Em homologação/);
 assert.match(html,/data-maya-agentics-action disabled/);
 assert.match(html,/<script src="\/maya-agentics-benefits\.js" defer><\/script>/);
});
test('browser presentation is network-free, side-effect-free, and has no token ingestion',()=>{
 for(const item of [/\bfetch\s*\(/,/XMLHttpRequest/,/localStorage/,/sessionStorage/,/sendBeacon/,/postMessage/,/['\"]Authorization['\"]\s*:/i,/wallet\.transfer/i,/sendPix/i,/agentics.*execute/i]){
   assert.doesNotMatch(js,item);
 }
 const api=load();
 assert.equal(api.pilot.previewAvailable,false);
 assert.equal(api.pilot.financialExecution,false);
});
test('premium status is never inferred from a forged, stale or cross-user response',()=>{
 const p=load();
 for(const [response,owner] of [
  [null,alice],[{...valid(true),actorUserId:'22222222-2222-4222-8222-222222222222'},alice],
  [{...valid(true),previewAvailable:true},alice],
  [{...valid(true),financialExecution:true},alice],
  [{...valid(true),agenticsPilotStatus:'released'},alice],
  [{...valid(true),premiumActive:'true'},alice],
  [valid(true),''],[{},alice]
 ]) {
   const result=p.safeBenefits(response,owner);
   assert.equal(result.verified,false);
   assert.equal(result.premiumActive,null);
   assert.equal(result.previewAvailable,false);
 }
 const basic=p.safeBenefits(valid(false),alice);
 assert.equal(basic.verified,true);assert.equal(basic.premiumActive,false);
 const premium=p.safeBenefits(valid(true),alice);
 assert.equal(premium.verified,true);assert.equal(premium.premiumActive,true);
 assert.equal(premium.previewAvailable,false);
});
test('UI never enables Agentics button, including for confirmed Premium',()=>{
 const api=load();
 for(const plan of [null,api.safeBenefits(valid(false),alice),api.safeBenefits(valid(true),alice)]){
  const action={disabled:false};
  const nodes={
    '[data-maya-agentics-status]':{textContent:''},
    '[data-maya-agentics-entitlement]':{textContent:''}
  };
  const element={querySelector:q=>nodes[q],querySelectorAll:q=>q==='[data-maya-agentics-action]'?[action]:[]};
  api.renderBenefits(element,plan);
  assert.equal(action.disabled,true);
  assert.match(nodes['[data-maya-agentics-status]'].textContent,/ainda não disponível/);
 }
});
