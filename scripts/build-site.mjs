import {execFileSync} from 'node:child_process';
import {cpSync, existsSync, mkdirSync, rmSync} from 'node:fs';
import {resolve} from 'node:path';

const root = process.cwd();
const portalSource = resolve(root, '.portal-src');
const portalOutput = resolve(root, 'portal');
const repository =
  process.env.NEXA_PORTAL_REPOSITORY ||
  'https://github.com/HenriqueGuilhermeUx/nexa-react-app.git';
const commit =
  process.env.NEXA_PORTAL_COMMIT ||
  '5b4bfe9f79dcedfc8511ef48345a80d6c2218c0e';

function run(command, args, options = {}) {
  execFileSync(command, args, {
    stdio: 'inherit',
    ...options,
  });
}

rmSync(portalSource, {recursive: true, force: true});
rmSync(portalOutput, {recursive: true, force: true});

console.log(`Cloning validated Nexa portal commit ${commit}...`);
run('git', ['clone', '--no-checkout', '--filter=blob:none', repository, portalSource]);
run('git', ['checkout', '--detach', commit], {cwd: portalSource});

const checkedOut = execFileSync('git', ['rev-parse', 'HEAD'], {
  cwd: portalSource,
  encoding: 'utf8',
}).trim();
if (checkedOut !== commit) {
  throw new Error(`Portal commit mismatch: expected ${commit}, received ${checkedOut}`);
}

run('npm', ['install', '--no-audit', '--no-fund'], {cwd: portalSource});
run('npm', ['run', 'check'], {
  cwd: portalSource,
  env: {
    ...process.env,
    VITE_BASE_PATH: '/portal/',
    VITE_API_URL:
      process.env.VITE_API_URL ||
      'https://nexa-backend-p2u0.onrender.com/api/v1',
    VITE_PRIVY_APP_ID:
      process.env.VITE_PRIVY_APP_ID || 'cmpen2gm3007v0cjswjlyefji',
    VITE_PRIVY_CLIENT_ID:
      process.env.VITE_PRIVY_CLIENT_ID ||
      'client-WY6ZY2Ptr39FTjXumMRAfqM2Bx8m9DUWxcSgXg6CWaMyT',
  },
});

const dist = resolve(portalSource, 'dist');
if (!existsSync(resolve(dist, 'index.html'))) {
  throw new Error('Validated portal build did not produce dist/index.html');
}

mkdirSync(portalOutput, {recursive: true});
cpSync(dist, portalOutput, {recursive: true});
rmSync(portalSource, {recursive: true, force: true});

console.log(
  JSON.stringify(
    {
      ok: true,
      portalCommit: commit,
      publicPath: '/portal/',
      output: 'portal/',
      financialExecutionEnabled: false,
    },
    null,
    2,
  ),
);
