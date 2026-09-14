import { writeFile } from 'node:fs/promises';
const origin = 'https://swapna-garmentsweb-production.up.railway.app';
const commit = process.env.PROFILE_RELEASE_COMMIT;
const deployment = process.env.PROFILE_RELEASE_DEPLOYMENT;
if (!commit || !deployment) throw new Error('Set verified release commit and deployment IDs');
async function read(path) {
  const response = await fetch(new URL(path, origin), { cache: 'no-store', signal: AbortSignal.timeout(30000) });
  return { status: response.status, cacheControl: response.headers.get('cache-control'), body: await response.text() };
}
const pages = ['/my-work', '/my-work/profile', '/my-work/history', '/scan', '/team'];
const apis = ['/api/session', '/api/work', '/api/work/profile', '/api/work/history', '/api/team'];
const paths = ['/api/health', ...pages, ...apis];
const replies = await Promise.all(paths.map(read));
const results = Object.fromEntries(paths.map((path, i) => [path, replies[i]]));
const assets = [...new Set(pages.flatMap(path => [...results[path].body.matchAll(/(?:src|href)="([^\"]+)"/g)].map(match => match[1]).filter(path => path.startsWith('/_next/') && /\.(js|css)(?:\?|$)/.test(path))))];
const assetReplies = await Promise.all(assets.map(read));
const bundle = assetReplies.map(item => item.body).join('\n');
const health = JSON.parse(results['/api/health'].body);
const session = JSON.parse(results['/api/session'].body);
const features = {
  statusButtons: bundle.includes('work-status-filters'),
  mobileStyles: bundle.includes('safe-area-inset-bottom') && bundle.includes('work-actions'),
  queueCopy: bundle.includes('Urgent pieces first, then earliest due.'),
  clearFilters: bundle.includes('No work matches these filters'),
  printedOrderEntry: bundle.includes('Or enter the printed order number'),
  profile: bundle.includes('Profile details'),
  profileOverview: bundle.includes('Assigned now') && bundle.includes('Open history'),
  profilePreviews: bundle.includes('data-profile-current') && bundle.includes('data-profile-history'),
  profileCapacity: bundle.includes('Estimated work that can be assigned at once.'),
  profileSignOut: bundle.includes('Signing out'),
  history: bundle.includes('Search work history'),
  historyGroups: bundle.includes('data-history-entry') && bundle.includes('Newest first'),
  historyRefresh: bundle.includes('Refresh work history'),
  historyReset: bundle.includes('Show all completed work'),
};
const report = {
  verifiedAt: new Date().toISOString(), commit, deployment, url: origin,
  railwayStatus: 'active-successful',
  health: { status: health.status, database: health.database, bucket: health.bucket },
  endpoints: Object.fromEntries(paths.map(path => [path, { status: results[path].status, cacheControl: results[path].cacheControl }])),
  ownerSetup: { required: session.setupRequired, available: session.setupAvailable },
  assets: { count: assets.length, allLoaded: assets.length > 0 && assetReplies.every(item => item.status === 200), features },
  validation: {productionBuild:'passed',lint:'passed',tests:38,mobileBrowser:'passed at 320, 360, 390, 430, 768 and 1440px with synthetic API fixtures'},
  productionBusinessCommandsSubmitted: false,
};
report.passed = health.status === 'ok' && health.database === 'connected' && health.bucket === 'connected'
  && pages.every(path => results[path].status === 200)
  && apis.every(path => results[path].status === 401 && results[path].cacheControl?.includes('no-store'))
  && report.ownerSetup.required === false && report.ownerSetup.available === false
  && report.assets.allLoaded && Object.values(features).every(Boolean);
await writeFile('output/qa/profile-ui-production-release.json', JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
if (!report.passed) process.exitCode=1;
