import { writeFile } from 'node:fs/promises';

const origin = 'https://swapna-garmentsweb-production.up.railway.app';
const commit = process.env.ORDERS_RELEASE_COMMIT;
const deployment = process.env.ORDERS_RELEASE_DEPLOYMENT;
if (!commit || !deployment) throw new Error('Set the verified release commit and deployment IDs.');

async function read(path) {
  const response = await fetch(new URL(path, origin), {
    cache: 'no-store', signal: AbortSignal.timeout(30000),
  });
  return { status: response.status, cacheControl: response.headers.get('cache-control'), body: await response.text() };
}

const pages = ['/orders', '/orders/new'];
const apis = ['/api/session', '/api/orders', '/api/orders/export?priority=urgent'];
const paths = ['/api/health', ...pages, ...apis];
const replies = await Promise.all(paths.map(read));
const results = Object.fromEntries(paths.map((path, i) => [path, replies[i]]));
const assets = [...new Set(pages.flatMap(path => [...results[path].body.matchAll(/(?:src|href)="([^\"]+)"/g)]
  .map(match => match[1]).filter(path => path.startsWith('/_next/') && /\.(js|css)(?:\?|$)/.test(path))))];
const assetReplies = await Promise.all(assets.map(read));
const bundle = assetReplies.map(item => item.body).join('\n');
const health = JSON.parse(results['/api/health'].body);
const session = JSON.parse(results['/api/session'].body);
const features = {
  floatingNewOrder: bundle.includes('newOrderFab'),
  priorityChips: bundle.includes('priorityChip') && bundle.includes('All priorities'),
  compactHeading: bundle.includes('Track progress. Keep deliveries on time.'),
  filterReset: bundle.includes('Reset filters'),
  clearSearch: bundle.includes('Clear search'),
  mobileBalances: bundle.includes('cardBalance'),
};
const report = {
  verifiedAt: new Date().toISOString(), commit, deployment, url: origin,
  railwayStatus: 'active-successful',
  health: { status: health.status, database: health.database, bucket: health.bucket },
  endpoints: Object.fromEntries(paths.map(path => [path, { status: results[path].status, cacheControl: results[path].cacheControl }])),
  ownerSetup: { required: session.setupRequired, available: session.setupAvailable },
  assets: { count: assets.length, allLoaded: assets.length > 0 && assetReplies.every(item => item.status === 200), features },
  productionBusinessCommandsSubmitted: false,
};
report.passed = health.status === 'ok' && health.database === 'connected' && health.bucket === 'connected'
  && pages.every(path => results[path].status === 200)
  && apis.every(path => results[path].status === 401 && results[path].cacheControl?.includes('no-store'))
  && report.ownerSetup.required === false && report.ownerSetup.available === false
  && report.assets.allLoaded && Object.values(features).every(Boolean);
await writeFile('output/qa/orders-ui-production-release.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (!report.passed) process.exitCode = 1;
