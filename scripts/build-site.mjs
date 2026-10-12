import {execFileSync} from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import {resolve} from 'node:path';

const root = process.cwd();
const portalSource = resolve(root, '.portal-src');
const portalOutput = resolve(root, 'portal');
const globalAppSource = resolve(root, '.global-app-src');
const globalAppOutput = resolve(root, 'global-app');
const repository =
  process.env.NEXA_PORTAL_REPOSITORY ||
  'https://github.com/HenriqueGuilhermeUx/nexa-react-app.git';
const commit =
  process.env.NEXA_PORTAL_COMMIT ||
  '2621945c47805c5f62c910ddefb627078200fa5c';
const globalAppRepository =
  process.env.NEXA_GLOBAL_APP_REPOSITORY ||
  'https://github.com/HenriqueGuilhermeUx/nexa-mobile.git';
const globalAppCommit =
  process.env.NEXA_GLOBAL_APP_COMMIT ||
  'a930c2438691e3b2026fa0a5a5e9a9b9d8ec1499';

function applySharedDesignSystem() {
  const stylesheet = '<link rel="stylesheet" href="/nexa-2026.css">';
  for (const file of readdirSync(root)) {
    if (!file.endsWith('.html')) continue;
    const target = resolve(root, file);
    let html = readFileSync(target, 'utf8');
    if (!html.includes('/nexa-2026.css') && html.includes('</head>')) {
      html = html.replace('</head>', `${stylesheet}\n</head>`);
    }
    html = html.replace(
      /<meta name="theme-color" content="[^"]*">/g,
      '<meta name="theme-color" content="#06111F">',
    );
    writeFileSync(target, html);
  }
}

function run(command, args, options = {}) {
  execFileSync(command, args, {
    stdio: 'inherit',
    ...options,
  });
}

applySharedDesignSystem();

rmSync(portalSource, {recursive: true, force: true});
rmSync(portalOutput, {recursive: true, force: true});
rmSync(globalAppSource, {recursive: true, force: true});
rmSync(globalAppOutput, {recursive: true, force: true});

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

console.log(`Cloning Nexa Global PWA commit ${globalAppCommit}...`);
run('git', ['clone', '--no-checkout', '--filter=blob:none', globalAppRepository, globalAppSource]);
run('git', ['checkout', '--detach', globalAppCommit], {cwd: globalAppSource});

const checkedOutGlobalApp = execFileSync('git', ['rev-parse', 'HEAD'], {
  cwd: globalAppSource,
  encoding: 'utf8',
}).trim();
if (checkedOutGlobalApp !== globalAppCommit) {
  throw new Error(
    `Global PWA commit mismatch: expected ${globalAppCommit}, received ${checkedOutGlobalApp}`,
  );
}

run('npm', ['install', '--include=dev', '--no-audit', '--no-fund'], {
  cwd: globalAppSource,
});
run('npm', ['run', 'typecheck'], {cwd: globalAppSource});
run('npx', ['expo', 'export', '--platform', 'web', '--output-dir', 'dist-web'], {
  cwd: globalAppSource,
  env: {
    ...process.env,
    CI: 'true',
    EXPO_NO_TELEMETRY: '1',
    EXPO_PUBLIC_NEXA_RELEASE_CHANNEL: 'nexa-global',
    EXPO_PUBLIC_NEXA_API_URL:
      'https://nexa-global-us-pilot.onrender.com/api/v1',
    EXPO_PUBLIC_NEXA_FINANCIAL_EXECUTION_ENABLED: 'false',
    EXPO_PUBLIC_NEXA_ASSISTANT_ENABLED: 'false',
    EXPO_PUBLIC_NEXA_EFI_OPEN_FINANCE_ENABLED: 'false',
    EXPO_PUBLIC_NEXA_EFI_OPEN_FINANCE_RECURRING_ENABLED: 'false',
    EXPO_PUBLIC_NEXA_ECOSYSTEM_ENABLED: 'false',
    EXPO_PUBLIC_NEXA_ECOSYSTEM_ONBOARDING_ENABLED: 'false',
  },
});

const globalDist = resolve(globalAppSource, 'dist-web');
if (!existsSync(resolve(globalDist, 'index.html'))) {
  throw new Error('Nexa Global PWA export did not produce dist-web/index.html');
}
if (!existsSync(resolve(globalDist, 'manifest.webmanifest'))) {
  throw new Error('Nexa Global PWA manifest is missing');
}
if (!existsSync(resolve(globalDist, 'sw.js'))) {
  throw new Error('Nexa Global PWA service worker is missing');
}

const globalIcon = resolve(
  globalAppSource,
  'assets/brand/nexa-pilot-icon-exact.png',
);
if (!existsSync(globalIcon)) {
  throw new Error('Nexa Global PWA icon is missing');
}
cpSync(globalIcon, resolve(globalDist, 'icon.png'));

mkdirSync(globalAppOutput, {recursive: true});
cpSync(globalDist, globalAppOutput, {recursive: true});
rmSync(globalAppSource, {recursive: true, force: true});

console.log(
  JSON.stringify(
    {
      ok: true,
      portalCommit: commit,
      portalPublicPath: '/portal/',
      globalAppCommit,
      globalAppPublicPath: '/global-app/',
      financialExecutionEnabled: false,
    },
    null,
    2,
  ),
);


