const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const base = 'https://swapna-garmentsweb-production.up.railway.app';

(async () => {
  const report = { checkedAt: new Date().toISOString(), origin: base, codeCommit: '469195f', deploymentId: '7446035e-02f5-40d2-b168-3d2f16fe51cf', checks: {}, pages: {}, assets: [] };
  const get = async route => {
    const response = await fetch(new URL(route, base), { cache: 'no-store', signal: AbortSignal.timeout(30000) });
    return { response, body: await response.text() };
  };
  const health = await get('/api/health');
  assert.equal(health.response.status, 200);
  report.health = JSON.parse(health.body);
  for (const route of ['/api/session', '/api/billing', '/api/work/history', '/api/work/history/not-a-uuid']) {
    const { response, body } = await get(route);
    assert.equal(response.status, 401, route);
    assert.match(response.headers.get('cache-control') || '', /no-store/);
    if (route === '/api/session') {
      const session = JSON.parse(body);
      assert.equal(session.setupRequired, false);
      report.checks.ownerSetupClosed = true;
    }
    report.checks[route] = { status: response.status, cacheControl: response.headers.get('cache-control') };
  }
  const assetUrls = new Set();
  for (const route of ['/', '/orders/release-verification', '/my-work/history', '/my-work/history/00000000-0000-4000-8000-000000000001']) {
    const { response, body } = await get(route);
    assert.equal(response.status, 200, route);
    report.pages[route] = response.status;
    for (const match of body.matchAll(/(?:src|href)="([^" ]+\.(?:js|css)(?:\?[^" ]*)?)"/g)) {
      if (match[1].startsWith('/_next/static/')) assetUrls.add(match[1].replaceAll('&amp;', '&'));
    }
  }
  const assets = await Promise.all([...assetUrls].map(async url => {
    const { response, body } = await get(url);
    assert.equal(response.status, 200, url);
    report.assets.push({ url, status: response.status });
    return body;
  }));
  const published = assets.join('\n');
  for (const marker of ['Bill preview', 'Print / Save PDF', 'Billed to', 'Payment record', 'Customer, phone, order', 'Current customer contact details.', 'Customer details are no longer available for this order.', 'compact-bill', 'A5 portrait']) {
    assert.ok(published.includes(marker), `Missing published feature: ${marker}`);
  }
  report.checks.newBillAndCustomerAssets = true;
  report.scope = 'Read-only public pages, deployed assets, health, and unsigned API checks. Authenticated behavior verified locally with isolated data.';
  fs.writeFileSync(path.join(__dirname, 'bill-history-production-release.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ success: true, checkedAt: report.checkedAt, health: report.health, pages: report.pages, assets: report.assets.length, featureMarkers: true }));
})().catch(error => { console.error(error); process.exitCode = 1; });
