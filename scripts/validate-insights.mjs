import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const text=p=>readFileSync(p,'utf8');
const slugs=['o-que-e-usdc','pix-usdc-como-funciona','por-que-verificar-identidade','como-proteger-carteira-digital','primeira-utilizacao-nexa'];
const home=text('insights/index.html'),root=text('index.html'),sitemap=text('sitemap.xml'),feed=text('insights/feed.xml'),utm=text('insights/utm-links.js');
assert.match(root,/href="\/insights\/"/);
assert.match(home,/<h1>/);
assert.match(home,/id="comece"/);
for(const route of ['/primeiros-nexa','/cadastro','/portal/']){
  assert.ok(home.includes('href="'+route+'"'),'Missing high-intent route '+route);
}
assert.match(home,/data-nexa-cta="route-primeiros"/);
assert.match(home,/data-nexa-cta="route-cadastro"/);
assert.match(root,/Quero fazer parte dos Primeiros Nexa/);
const adminJs=text('admin.js'),adminHtml=text('admin.html');
assert.match(adminJs,/\/admin\/crm-acquisition-report/);
assert.match(adminJs,/renderInsightsAcquisition/);
assert.match(adminJs,/correspondência de e-mail/);
assert.match(adminHtml,/src="\/admin\.js\?v=8"/);
assert.match(adminJs,/esc\(item\.source/);


assert.match(home,/https:\/\/wa\.me\/551333289704/);
assert.match(home,/https:\/\/t\.me\/NexaInsights/);
assert.match(root,/https:\/\/t\.me\/NexaInsights/);
assert.match(home,/@NexaTheoBot/);
assert.match(home,/primeira-utilizacao-nexa\\.html/);
const firstUse=text("insights/primeira-utilizacao-nexa.html");
assert.match(firstUse,/o portal Nexa/);
assert.match(firstUse,/somente pelo ambiente autenticado/);
assert.match(firstUse,/Não transfira dinheiro para contas indicadas/);
assert.ok(!firstUse.includes("href=\"https://t.me/NexaTheoBot\""));
assert.match(home,/ainda está em ativação/);
assert.ok(!home.includes('href="https://t.me/NexaTheoBot"'),
  'Bot must not be promoted as a live support channel before activation');
for(const slug of slugs){
 const path='insights/'+slug+'.html';
 assert.ok(existsSync(path),'Missing '+path);
 const content=text(path);
 assert.match(content,/<meta name="description"/);
 assert.match(content,/rel="canonical"/);
 assert.match(content,/data-nexa-cta/);
 assert.match(content,/https:\/\/trynexa\.com\.br/);
 assert.match(home,new RegExp(slug+'\\.html'));
 assert.match(feed,new RegExp(slug+'\\.html'));
 assert.match(sitemap,new RegExp(slug+'\\.html'));
 assert.doesNotMatch(content,/<(?:a|h1|h2|h3)[^>]*>[^<]*(?:compre agora|ganho garantido|lucro certo|rendimento sem risco)/i);
}
assert.match(utm,/utm_source/);
assert.match(utm,/utm_campaign/);
assert.match(utm,/incoming\.get/);
assert.doesNotMatch(home,/https:\/\/t\.me\/NexaTheoBot/);
assert.ok(existsSync('docs/nexa-insights-launch-plan-20261109.md'));
console.log('Nexa Insights: site, four articles, feed, SEO and safe CTA contract PASS');
