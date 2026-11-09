import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const text=p=>readFileSync(p,'utf8');
const slugs=['o-que-e-usdc','pix-usdc-como-funciona','por-que-verificar-identidade','como-proteger-carteira-digital'];
const home=text('insights/index.html'),root=text('index.html'),sitemap=text('sitemap.xml'),feed=text('insights/feed.xml'),utm=text('insights/utm-links.js');
assert.match(root,/href="\/insights\/"/);
assert.match(home,/<h1>/);
assert.match(home,/https:\/\/wa\.me\/551333289704/);
assert.match(home,/Telegram oficial em prepara(c|ç)(a|ã)o/);
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
 assert.doesNotMatch(content,/ganho garantido|compre agora|lucro certo|rendimento sem risco/i);
}
assert.match(utm,/utm_source/);
assert.match(utm,/utm_campaign/);
assert.match(utm,/incoming\.get/);
assert.doesNotMatch(home,/https:\/\/t\.me\/NexaTheoBot/);
assert.ok(existsSync('docs/nexa-insights-launch-plan-20261109.md'));
console.log('Nexa Insights: site, four articles, feed, SEO and safe CTA contract PASS');
