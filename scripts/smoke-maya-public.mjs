import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
const source=readFileSync('maya-public.js','utf8');
const html=readFileSync('maya.html','utf8');
const gateway=readFileSync('meu-espaco.html','utf8');
const home=readFileSync('index.html','utf8');
// The static site has no package.json; import the pure ESM code in memory.
const mod=await import('data:text/javascript;charset=utf-8,'+encodeURIComponent(source));
const {MAYA_PUBLIC_TOPICS,publicMayaFindTopic,publicMayaTopicById}=mod;

test('Maya public UI is real static guidance, not a second authenticated wallet',()=>{
 assert.match(html,/id="maya-public-form"/);
 assert.match(html,/id="maya-public-result"/);
 assert.match(html,/src="\/maya-public.js"/);
 assert.match(html,/Nexa PF/);
 assert.match(gateway,/href="\/maya\.html"/);
 assert.match(home,/<a href="\/maya\.html">Maya<\/a>/,"Maya must be visible in main navigation");
 assert.match(home,/Experimentar Maya gratuitamente/,"Maya must be reachable from the main CTA");
 assert.match(html,/A versão com seus dados e especialistas fica no aplicativo Nexa PF/);
 assert.doesNotMatch(html,/https:\/\/.*(?:privy|alchemy|render|supabase)/i);
});
test('does not send or store user-entered text',()=>{
 assert.doesNotMatch(source,/\b(fetch|XMLHttpRequest|sendBeacon|localStorage|sessionStorage|postMessage)\b/);
 assert.doesNotMatch(source,/window\.location\s*=/);
 assert.doesNotMatch(html,/<script[^>]*src="https?:/i);
});
test('routes real subjects and keeps the Wallet assistant separate',()=>{
 for(const [subject,expected] of [
  ['organizar minhas despesas','expenses'],
  ['meus objetivos e metas','planning'],
  ['ver meu patrimônio','financial'],
  ['investimento em CDB','investments'],
  ['comparar uma compra de celular','shopping'],
  ['quero simular um cenário','simulations'],
  ['contas a vencer','payments'],
  ['revisar contrato','contracts'],
  ['emitir IPTU','public_services'],
  ['renegociar dívida','debt_review'],
  ['entender meus direitos','legal_support'],
  ['transferir USDC da Wallet','crypto'],
  ['pagar por Pix','crypto'],
 ])assert.equal(publicMayaFindTopic(subject)?.id,expected,subject);
});
test('unknown or oversized prompts fail safely',()=>{
 assert.equal(publicMayaFindTopic(''),null);
 assert.equal(publicMayaFindTopic('a'.repeat(201)),null);
 assert.equal(publicMayaFindTopic('xyzzy'),null);
 assert.equal(publicMayaTopicById('owner_1'),null);
 assert.equal(MAYA_PUBLIC_TOPICS.length,12);
 assert.equal(new Set(MAYA_PUBLIC_TOPICS.map(x=>x.id)).size,12);
 for(const topic of MAYA_PUBLIC_TOPICS){
  assert.equal(topic.steps.length,3);
  assert.ok(topic.note.length>10);
 }
});
