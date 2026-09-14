const fs = require('node:fs');
const assert = require('node:assert/strict');
const origin = 'https://swapna-garmentsweb-production.up.railway.app';

(async () => {
  const paths = [
    '/api/health', '/api/session', '/', '/orders', '/customers', '/billing',
    '/workflow', '/team', '/calendar', '/settings', '/my-work',
    '/my-work/history', '/my-work/calendar', '/api/orders', '/api/customers',
    '/api/billing', '/api/team', '/api/work', '/api/work/history',
    '/api/calendar/day?date=2026-09-14', '/api/work/calendar/day?date=2026-09-14',
  ];
  const assets = new Set();
  let health, ownerSetupClosed;
  const routes = await Promise.all(paths.map(async path => {
    const response = await fetch(origin + path, {signal: AbortSignal.timeout(30000)});
    const expected = path.startsWith('/api/') && path !== '/api/health' ? 401 : 200;
    assert.equal(response.status, expected, path);
    if (path === '/api/health') {
      health = await response.json();
      assert.equal(health.database, 'connected');
      assert.equal(health.bucket, 'connected');
    } else if (path === '/api/session') {
      const body = await response.json();
      ownerSetupClosed = body.setupRequired === false && body.setupAvailable === false;
      assert.equal(ownerSetupClosed, true);
    } else if (!path.startsWith('/api/')) {
      const html = await response.text();
      for (const match of html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g)) {
        if (match[1].startsWith('/_next/static/')) assets.add(match[1]);
      }
    }
    if (path.startsWith('/api/')) assert.match(response.headers.get('cache-control') || '', /no-store/);
    return {path, status: response.status};
  }));
  const scrollAssets = [];
  await Promise.all([...assets].map(async path => {
    const response = await fetch(origin + path, {signal: AbortSignal.timeout(30000)});
    assert.equal(response.status, 200, path);
    const script = await response.text();
    if (script.includes('All records loaded') && script.includes('IntersectionObserver')) scrollAssets.push(path);
  }));
  assert.ok(scrollAssets.length, 'The deployed assets must contain automatic scroll loading');
  const result = {checkedAt: new Date().toISOString(), origin, health, routes, assetsChecked: assets.size, scrollAssets, ownerSetupClosed, liveBusinessWrites: 0};
  fs.writeFileSync('output/qa/scroll-pagination-production-health.json', JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result, null, 2));
})().catch(error => { console.error(error.message); process.exitCode = 1; });
