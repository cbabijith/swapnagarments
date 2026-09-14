const { chromium } = require('C:/Users/moham/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = __dirname;
const base = process.env.WORKER_TEST_URL || 'http://localhost:3121';
const customer = { name: 'Lakshmi Nair', phone: '+91 90000 00001' };
const entries = Array.from({ length: 25 }, (_, i) => ({
  id: `00000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`,
  orderNumber: `SG-${2400 + i}`, pieceId: `piece-${i + 1}`, garment: i % 2 ? 'Churidar' : 'Blouse',
  station: i % 2 ? 3 : 0, stepName: i % 2 ? 'Stitching' : 'Cutting',
  completedAt: `2026-09-14T${String(10 - Math.floor(i / 5)).padStart(2, '0')}:00:00Z`,
  customer: i === 1 ? null : i === 2 ? { name: 'A customer with a very long name that must wrap cleanly on small phones', phone: '' } : customer,
}));
(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/api/**', async route => {
    assert.equal(route.request().method(), 'GET');
    const url = new URL(route.request().url());
    let body;
    if (url.pathname === '/api/session') body = { owner: { name: 'Anjali', email: 'anjali@example.test', role: 'worker', staffId: 'worker-fixture' } };
    else if (url.pathname === '/api/work/history') {
      let rows = entries;
      const q = url.searchParams.get('q')?.toLowerCase();
      if (q) rows = rows.filter(e => [e.orderNumber, e.garment, e.stepName, e.customer?.name || '', e.customer?.phone || ''].some(v => v.toLowerCase().includes(q)));
      const station = url.searchParams.get('station');
      if (station && station !== 'all') rows = rows.filter(e => e.station === Number(station));
      const current = Number(url.searchParams.get('page') || 1), size = Number(url.searchParams.get('pageSize') || 20);
      body = { revision: 1, entries: rows.slice((current - 1) * size, current * size), page: { page: current, pageSize: size, total: rows.length, pageCount: Math.ceil(rows.length / size) } };
    } else if (url.pathname.startsWith('/api/work/history/')) {
      body = { revision: 1, entry: { ...entries.find(e => url.pathname.endsWith(e.id)), snapshot: null } };
    } else throw new Error(`Unexpected API route ${url.pathname}`);
    return route.fulfill({ json: body });
  });
  const fits = async () => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  try {
    await page.goto(base + '/my-work/history');
    await page.locator('[data-history-entry]').first().waitFor();
    assert.match(await page.locator('[data-history-entry]').first().innerText(), /Lakshmi Nair/);
    assert.match(await page.locator('[data-history-entry]').first().innerText(), /90000 00001/);
    assert.match(await page.locator('[data-history-entry]').nth(1).innerText(), /Customer details unavailable/);
    for (const width of [320, 390, 1440]) {
      await page.setViewportSize({ width, height: width === 1440 ? 1000 : 844 });
      await fits();
      await page.screenshot({ path: path.join(root, `history-customers-${width}.png`) });
    }
    const search = page.getByRole('textbox', { name: 'Search work history' });
    await search.fill('Lakshmi');
    await page.getByRole('status').filter({ hasText: '23 completed stages' }).waitFor();
    await page.locator('[data-history-entry]').first().click();
    const section = page.getByRole('region', { name: 'Customer details', exact: true });
    await section.waitFor();
    assert.match(await section.innerText(), /Lakshmi Nair/);
    assert.equal(await section.getByRole('link').getAttribute('href'), 'tel:+919000000001');
    for (const width of [320, 390, 1440]) {
      await page.setViewportSize({ width, height: width === 1440 ? 1000 : 844 });
      await fits();
      await page.screenshot({ path: path.join(root, `history-customer-details-${width}.png`) });
    }
    await page.getByRole('link', { name: 'Back to history', exact: true }).click();
    assert.equal(await search.inputValue(), 'Lakshmi');
    await search.fill('90000');
    await page.getByRole('status').filter({ hasText: '23 completed stages' }).waitFor();
    await page.getByRole('combobox', { name: 'Filter completed station' }).selectOption('3');
    await page.getByRole('status').filter({ hasText: '11 completed stages' }).waitFor();
    await page.goto(base + '/my-work/history/' + entries[1].id);
    await page.getByText('Customer details are no longer available for this order.', { exact: true }).waitFor();
    await page.goto(base + '/my-work/history/' + entries[2].id);
    await page.getByText('Not provided', { exact: true }).waitFor();
    await page.setViewportSize({ width: 320, height: 844 });
    await fits();
    assert.deepEqual(errors, []);
    fs.writeFileSync(path.join(root, 'history-customers-results.json'), JSON.stringify({ passed: true, widths: [320, 390, 1440], checks: ['List and detail customer name/phone', 'Tap-to-call link', 'Name and phone search', 'Station filter', 'Return navigation retains search', 'Missing customer', 'Missing phone and long name'], errors }, null, 2));
    console.log('Worker history customer browser checks passed.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
