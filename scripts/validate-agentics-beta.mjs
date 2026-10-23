import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const html=readFileSync('agentics/beta.html','utf8');
const page=readFileSync('agentics/index.html','utf8');
const demo=readFileSync('agentics/demo.html','utf8');
const redirects=readFileSync('netlify.toml','utf8');
const homepage=readFileSync('index.html','utf8');
assert(html.includes('<html lang="pt-BR">'));
assert(html.includes('<main class="beta-page" id="principal">'));
assert(html.includes('Demonstração pública'));
assert(html.includes('Beta Premium de leitura'));
assert(html.includes('NÃO DISPONÍVEL'));
assert(html.includes('Acesso a dados reais ainda não habilitado'));
assert(html.includes('Nenhum agente recebe permissão'));
assert(html.includes('Sem conexão com sua conta nesta página'));
assert(html.includes('<link rel="canonical" href="https://trynexa.com.br/agentics/beta">'));
assert(page.includes('href="/agentics/beta"'));
assert(demo.includes('href="/agentics/beta"'));
assert(redirects.includes('from = "/agentics/beta"'));
assert(redirects.includes('to = "/agentics/beta.html"'));
assert(redirects.includes('from = "/agentics/demo"'));
assert(redirects.includes('from = "/agentics"'));
assert(homepage.includes('href="/agentics"'));
for(const forbidden of [/<form\b/i,/<input\b/i,/<script\b/i,/<iframe\b/i,
  /fetch\s*\(/i,/XMLHttpRequest/i,/navigator\.sendBeacon/i,
  /dataLayer/i,/<button[^>]*type=["']submit/i,
  /window\.location\s*=/i]){
 assert(!forbidden.test(html),'Agentics beta static preview cannot collect user data or execute JS');
}
for(const asset of ['agentics/agentics.css','agentics/demo.html','icon.svg','favicon.svg'])
 assert(existsSync(asset),'Missing linked design asset: '+asset);
console.log('NEXA_AGENTICS_PUBLIC_BETA_PREVIEW_SAFE_PASS');
