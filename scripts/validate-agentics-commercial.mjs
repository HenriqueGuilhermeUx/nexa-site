import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';

const agents=readFileSync('agentics/empresas.html','utf8');
const trust=readFileSync('agentics/trust.html','utf8');
const main=readFileSync('agentics/index.html','utf8');
const roadmap=readFileSync('agentics/ecossistema.html','utf8');
const premium=readFileSync('agentics/beta.html','utf8');
const redirects=readFileSync('netlify.toml','utf8');
const support=readFileSync('suporte.html','utf8');

for(const [label,html,canonical] of [
 ['Agentics Infrastructure',agents,'https://trynexa.com.br/agentics/empresas'],
 ['Nexa Trust',trust,'https://trynexa.com.br/agentics/trust'],
]){
 assert(html.includes('<html lang="pt-BR">'),label+': missing localization');
 assert(html.includes('id="principal"'),label+': missing main landmark');
 assert(html.includes('href="'+canonical+'"'),label+': canonical mismatch');
 assert(html.includes('href="/privacidade"'),label+': privacy page required');
 assert(html.includes('contato@trynexa.com.br'),label+': contact missing');
 assert(html.includes('https://wa.me/5511947984328'),label+': verified company WhatsApp missing');
 assert(html.includes('Dados')||html.includes('dados'),label+': security content required');
 assert(html.includes('homologação'),label+': availability caveat absent');
 assert(html.includes('piloto'),label+': controlled pilot must be described');
 assert(html.includes('proposta'),label+': B2B commercial contact required');
 for(const forbidden of [
  /<form\b/i,/<input\b/i,/<script\b/i,/<iframe\b/i,/<button\b/i,
  /fetch\s*\(/i,/XMLHttpRequest/i,/localStorage/i,/sessionStorage/i,
  /data-netlify/i,/POST\s+\/api\/v1/i,/ISO\s*27001\s*certificad/i,
  /SOC\s*2\s*certificad/i,/LGPD\s+certificad/i
 ]){
  assert(!forbidden.test(html),label+': prohibited active data capture or unproven claim');
 }
}
assert(agents.includes('Nexa Agentics Infrastructure'));
assert(agents.includes('Nexa Trust Data Security'));
assert(agents.includes('Nexa Enterprise'));
assert(agents.includes('NÃO')||agents.includes('ainda não'));
assert(trust.includes('controlador'));
assert(trust.includes('operador'));
assert(trust.includes('segregação'));
assert(trust.includes('não exige')||trust.includes('independente'));
assert(main.includes('href="/agentics/empresas"'));
assert(main.includes('href="/agentics/trust"'));
assert(roadmap.includes('href="/agentics/empresas"'));
assert(roadmap.includes('href="/agentics/trust"'));
assert(premium.includes('href="/agentics/empresas"'));
for(const [route,location] of [
 ['/agentics/empresas','/agentics/empresas.html'],
 ['/agentics/trust','/agentics/trust.html'],
]){
 assert(redirects.includes('from = "'+route+'"'),'redirect from '+route);
 assert(redirects.includes('to = "'+location+'"'),'redirect to '+location);
 assert(redirects.includes('from = "'+route+'/"'),'slash alias '+route);
}
assert(redirects.includes('from = "/portal/*"'),'Portal fallback must remain');
assert(redirects.includes('from = "/agentics/beta"'),'Existing beta must remain');
assert(redirects.includes('from = "/agentics/demo"'),'Existing demo must remain');
assert(redirects.includes('from = "/pj"'),'Existing PJ route must remain');
assert(support.includes('mailto:contato@trynexa.com.br'),'Contact must match company support');
assert(support.includes('https://wa.me/5511947984328'),'WhatsApp must match company support');
assert(existsSync('docs/agentics-trust-commercial-readiness-20261022.md'));
assert(existsSync('agentics/agentics.css'));
console.log('NEXA_AGENTICS_TRUST_COMMERCIAL_STATIC_SAFETY_PASS');
