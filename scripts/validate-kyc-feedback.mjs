import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
const read = path => readFileSync(path,'utf8');

for(const path of [
  'ajuda-verificacao.html','ajuda-verificacao-enviado.html',
  'cadastro.html','suporte.html','insights/primeira-utilizacao-nexa.html'
])assert.ok(existsSync(path), 'Missing feedback surface: '+path);

const page=read('ajuda-verificacao.html');
const thanks=read('ajuda-verificacao-enviado.html');
const signup=read('cadastro.html');
const support=read('suporte.html');
const guide=read('insights/primeira-utilizacao-nexa.html');

assert.match(page, /<form name="nexa-kyc-feedback" method="POST"/);
assert.match(page, /data-netlify="true"/);
assert.match(page, /netlify-honeypot="bot-field"/);
assert.match(page, /name="bot-field"/);
assert.match(page, /name="form-name" value="nexa-kyc-feedback"/);
assert.match(page, /action="\/ajuda-verificacao-enviado"/);
assert.match(page, /name="dificuldade" value="didit_nao_abriu"/);
assert.match(page, /name="dificuldade" value="nao_consegui_entrar"/);
assert.match(page, /name="dificuldade" value="seguranca_ou_privacidade"/);
assert.match(page, /name="dispositivo" value="android"/);
assert.match(page, /name="dispositivo" value="iphone"/);
assert.ok((page.match(/type="radio" name="dificuldade"/g)||[]).length >= 7);
assert.doesNotMatch(page, /<textarea|type="file"|name="(?:cpf|email|senha|password|token|documento|identidade|nome|userId|accountId)"/i,
  'Anonymous feedback may not collect customer identifiers or documents');
assert.doesNotMatch(page, /<script|window\.localStorage|window\.sessionStorage|Authorization:|\/api\/v1\/kyc/i,
  'Feedback must not access authentication or financial credentials');
assert.match(page, /não verifica sua identidade/i);
assert.match(page, /não pedimos|não informe|não informamos/i);
assert.match(page, /href="\/privacidade"/);
assert.match(page, /href="https:\/\/t\.me\/NexaTheoBot"/);
assert.match(page, /href="\/portal\/"/);
assert.match(thanks, /não altera seu cadastro nem inicia uma sessão biométrica/i);
for(const [source,sourceName]of [[signup,'signup'],[support,'support'],[guide,'onboarding guide']]){
  assert.match(source, /href="\/ajuda-verificacao\.html"/,
   'KYC feedback link missing from '+sourceName);
}
console.log('Nexa KYC feedback: privacy-minimal static Netlify form, honeypot, relevant links and thank-you page PASS');
