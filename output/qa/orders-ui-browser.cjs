const { chromium } = require('C:/Users/moham/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const output = 'C:/flutter_projects/swapnagarments/output/qa';

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, timezoneId: 'Asia/Kolkata' });
  const errors = [];
  const checks = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  const chip = name => page.getByRole('button', { name, exact: true });
  const cards = () => page.locator('.mobile-order-card');
  const count = n => page.waitForFunction(n => document.querySelectorAll('.mobile-order-card').length === n, n);
  const reset = () => page.getByRole('button', { name: 'Reset filters', exact: true }).first().click();
  const fab = () => page.locator('main').getByRole('link', { name: 'New order', exact: true });
  try {
    await page.goto('http://localhost:3136/orders');
    // Exercise an interaction before screenshots to let hydration finish.
    await chip('Urgent priority').click();
    await count(2);
    assert.equal(await chip('Urgent priority').getAttribute('aria-pressed'), 'true');
    assert.ok((await cards().allTextContents()).every(text => text.includes('Urgent')));
    await reset();
    await count(12);
    checks.push('Urgent chip filters results and exposes its selected state; reset restores all orders');

    for (const width of [320, 360, 390, 430, 760, 768, 1440]) {
      await page.setViewportSize({ width, height: width <= 760 ? 844 : 1000 });
      const metrics = await page.evaluate(() => ({ width: document.documentElement.scrollWidth, viewport: innerWidth, heading: parseFloat(getComputedStyle(document.querySelector('main h1')).fontSize) }));
      assert.ok(metrics.width <= metrics.viewport, `Page overflows at ${width}px`);
      assert.ok(metrics.heading <= (width <= 760 ? 23 : 27), 'Heading should stay compact');
      const button = await fab().boundingBox();
      assert.ok(button.x >= 0 && button.x + button.width <= width && button.height >= 52, 'FAB is visible and touch friendly');
      if (width <= 760) {
        const nav = await page.getByRole('navigation', { name: 'Mobile navigation' }).boundingBox();
        assert.ok(button.y + button.height < nav.y, 'FAB clears the bottom navigation');
        for (const name of ['All priorities', 'Urgent priority', 'High priority', 'Normal priority']) {
          const box = await chip(name).boundingBox();
          assert.ok(box.height >= 44 && box.width >= 44 && box.x >= 0 && box.x + box.width <= width, `${name} has a usable touch target`);
        }
        assert.ok(await page.getByRole('textbox', { name: 'Search orders', exact: true }).evaluate(el => parseFloat(getComputedStyle(el).fontSize) >= 16));
        assert.ok((await cards().first().boundingBox()).y < 465, 'First order is visible without scrolling');
      }
      if ([320, 390, 1440].includes(width)) await page.screenshot({ path: `${output}/orders-ui-${width}.png`, fullPage: false });
      checks.push(`Layout fits ${width}px; compact heading and FAB position verified`);
    }

    await page.setViewportSize({ width: 390, height: 844 });
    const filterTop = (await cards().first().boundingBox()).y;
    await chip('High priority').click();
    await count(3);
    assert.ok((await cards().allTextContents()).every(text => text.includes('High')));
    assert.ok(Math.abs((await cards().first().boundingBox()).y - filterTop) < 1, 'Selecting a filter must not shift the list');
    await page.getByRole('combobox', { name: 'Filter orders' }).selectOption('due');
    await count(1);
    assert.match(await cards().first().innerText(), /Anjali Menon/);
    await page.getByRole('textbox', { name: 'Search orders', exact: true }).fill('no-matching-order');
    await page.getByRole('heading', { name: 'No orders match' }).waitFor();
    await page.screenshot({ path: `${output}/orders-ui-empty-390.png` });
    await page.getByRole('button', { name: 'Clear search', exact: true }).click();
    await count(1);
    await reset();
    await count(12);
    assert.equal(await page.getByRole('combobox', { name: 'Filter orders' }).inputValue(), 'all');
    assert.equal(await chip('All priorities').getAttribute('aria-pressed'), 'true');
    assert.equal(await page.getByRole('textbox', { name: 'Search orders', exact: true }).inputValue(), '');
    checks.push('Search, status and priority filters combine; empty state, clear search and full reset work without layout jumps');

    await chip('Normal priority').click();
    await count(7);
    assert.ok((await cards().allTextContents()).every(text => text.includes('Normal')));
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export', exact: true }).click();
    const download = await downloadPromise;
    const csv = fs.readFileSync(await download.path(), 'utf8');
    assert.ok(csv.includes('normal') && !csv.includes('urgent') && !csv.includes('high'), 'Export follows selected priority');
    checks.push('Normal chip and filtered CSV export work');

    await chip('High priority').focus();
    await page.keyboard.press('Space');
    await count(3);
    assert.equal(await chip('High priority').getAttribute('aria-pressed'), 'true');
    await reset();
    await count(12);
    await cards().last().scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    const last = await cards().last().boundingBox();
    const floating = await fab().boundingBox();
    assert.ok(last.y + last.height < floating.y, 'Last record can scroll fully above the FAB');
    await page.evaluate(() => window.scrollTo(0, 0));
    const destination = await cards().first().getAttribute('href');
    await cards().first().click();
    await page.waitForURL(`**${destination}`);
    await page.getByRole('link', { name: 'Back to orders', exact: true }).click();
    await count(12);
    await fab().click();
    await page.waitForURL('**/orders/new');
    await page.getByRole('heading', { name: 'New order', exact: true }).waitFor();
    checks.push('Keyboard chip selection, last-row clearance, order details and New order FAB navigation work');
    assert.deepEqual(errors, [], 'No browser runtime or hydration errors');
    fs.writeFileSync(`${output}/orders-ui-results.json`, JSON.stringify({ checks, errors }, null, 2));
    console.log(JSON.stringify({ checks, errors }, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
