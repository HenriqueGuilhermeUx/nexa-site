const fs = require('node:fs');
const assert = require('node:assert/strict');
const load = (file) => fs.readFileSync(file, 'utf8');
const wallet = load('wallet-v148.html');
const archivedPortal = load('portal.html');
const rewards = load('rewards.html');
const explore = load('explorar.html');
const maya = load('maya.html');
const home = load('index.html');

// A legacy Rewards position is NOT an onchain Privy Earn vault position.
// Keep historical reads, but no new legacy ledger reserve from the browser.
for (const [name, source] of [['Wallet PWA', wallet], ['archived portal', archivedPortal]]) {
  assert.doesNotMatch(source, /\/rewards\/join/, name + ' cannot create an internal Rewards position');
  assert.match(source, /\/rewards\/positions/, name + ' should retain legacy history reads');
  assert.match(source, /Privy Earn/, name + ' should explain current provider');
}
assert.doesNotMatch(wallet, /onclick="go\('aave'\)"/, 'Direct Aave is no longer marketed in Wallet');
assert.match(wallet, /\/rewards\.html/);
assert.match(wallet, /\/explorar\.html/);
assert.match(archivedPortal, /id="rewardBtn"[^>]+disabled/, 'legacy form stays inactive');
assert.match(rewards, /não é fixo nem garantido/i);
assert.match(rewards, /não inicia operações financeiras/i);
assert.match(explore, /https:\/\/m\.uber\.com\//);
assert.doesNotMatch(explore, /href="https:\/\/www\.ticketmaster\.com\.br\//, 'Ticketmaster deferred');
assert.match(explore, /https:\/\/www\.sympla\.com\.br\//);
assert.match(explore, /https:\/\/www\.bitrefill\.com\/br\/pt\/gift-cards\/uber-brazil\//);
assert.match(explore, /O USDC da Nexa não é debitado diretamente pela Uber/);
assert.match(explore, /A Nexa não processa essa compra/);
assert.match(rewards, /Morpho/);
assert.match(rewards, /Steakhouse Prime USDC/);
assert.doesNotMatch(explore, /99\s*(?:táxi|taxi|app)/i);
assert.doesNotMatch(explore, /onclick\s*=/i, 'provider opens must require direct user click on external links');
assert.match(maya, /\/explorar\.html/);
assert.match(home, /\/explorar\.html/);
assert.match(home, /\/rewards\.html/);
console.log('Nexa Rewards + Maya Explorar: safe, link-only, no legacy Rewards execution.');
