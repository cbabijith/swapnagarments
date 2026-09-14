const { chromium } = require('C:/Users/moham/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const root = 'C:/flutter_projects/swapnagarments/output/qa';
const base = process.env.WORKER_TEST_URL || 'http://localhost:3118';
const user = {name:'Anjali Nair',email:'anjali@example.test',role:'worker',staffId:'worker-a'};
const entries = Array.from({length:26}, (_, i) => ({
  id:`completion-${i}`,orderNumber:`SG-${2400+i}`,pieceId:`piece-${String(i+1).padStart(6,'0')}`,
  garment:['Blouse','Churidar','Gown'][i%3],station:i%2?3:0,stepName:i%2?'Stitching':'Cutting',
  completedAt:new Date(Date.UTC(2026,8,14-Math.floor(i/3),8-i%3,30)).toISOString()
}));
(async()=>{
  const browser=await chromium.launch({headless:true,channel:'chrome'});
  const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,timezoneId:'America/Los_Angeles'});
  await page.clock.setFixedTime(new Date('2026-09-14T10:00:00Z'));
  const errors=[], checks=[];
  let failure=false, empty=false, delay=0;
  page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/api/**',async route=>{
    const url=new URL(route.request().url());
    assert.equal(route.request().method(),'GET','History QA must remain read-only');
    let body;
    if(url.pathname==='/api/session') body={owner:user};
    else if(url.pathname==='/api/work/history') {
      if(delay) await new Promise(resolve=>setTimeout(resolve,delay));
      if(failure) return route.fulfill({status:503,json:{error:'History temporarily unavailable'}});
      let selected=empty?[]:entries;
      const q=url.searchParams.get('q')?.toLowerCase();
      if(q) selected=selected.filter(e=>[e.garment,e.orderNumber,e.stepName].some(v=>v.toLowerCase().includes(q)));
      const station=url.searchParams.get('station');
      if(station && station!=='all') selected=selected.filter(e=>e.station===Number(station));
      const size=Number(url.searchParams.get('pageSize')||20), current=Number(url.searchParams.get('page')||1);
      body={revision:1,entries:selected.slice((current-1)*size,current*size),page:{page:current,pageSize:size,total:selected.length,pageCount:Math.ceil(selected.length/size)}};
    } else if(url.pathname.startsWith('/api/work/history/')) {
      body={revision:1,entry:{...entries.find(e=>url.pathname.endsWith(e.id)),snapshot:null}};
    } else throw new Error(`Unexpected API request: ${url.pathname}`);
    await route.fulfill({json:body});
  });
  const count=async n=>page.waitForFunction(n=>document.querySelectorAll('[data-history-entry]').length===n,n);
  const fits=async label=>{
    const result=await page.evaluate(()=>({width:document.documentElement.scrollWidth,viewport:innerWidth}));
    assert.ok(result.width<=result.viewport,`${label} overflow: ${JSON.stringify(result)}`);
  };
  const screenshot=async name=>page.screenshot({path:`${root}/history-ui-${name}.png`,fullPage:false});
  const search=()=>page.getByRole('textbox',{name:'Search work history'});
  const station=()=>page.getByRole('combobox',{name:'Filter completed station'});
  try {
    await page.goto(base+'/my-work/history');
    await count(20);
    assert.equal(await page.getByRole('region',{name:'Today',exact:true}).locator('[data-history-entry]').count(),3);
    await page.getByRole('heading',{name:'Yesterday',exact:true}).waitFor();
    for(const width of [320,360,390,430,768,1440]) {
      await page.setViewportSize({width,height:width<768?844:1000});
      await fits(`History ${width}`);
      if(width<768) {
        const first=await page.locator('[data-history-entry]').first().boundingBox();
        assert.ok(first.y<390,`First history entry too low at ${width}: ${first.y}`);
        assert.ok(first.height<140,`History entry too tall: ${first.height}`);
        for(const target of [station(),page.getByRole('button',{name:'Refresh work history'})]) {
          const box=await target.boundingBox();
          assert.ok(box.width>=44 && box.height>=44,'Touch targets must be at least 44px');
        }
        assert.ok(await search().evaluate(e=>parseFloat(getComputedStyle(e).fontSize)>=16));
      }
      await screenshot(String(width));
      checks.push(`History fits ${width}px; compact cards and readable controls`);
    }
    await page.setViewportSize({width:390,height:844});
    await search().fill('Churidar');
    await count(9);
    await station().selectOption('3');
    await count(5);
    await screenshot('filtered-390');
    await page.locator('[data-history-entry]').first().click();
    await page.getByRole('heading',{name:'Completion details',exact:true}).waitFor();
    await page.getByRole('link',{name:'Back to history',exact:true}).click();
    await count(5);
    assert.equal(await search().inputValue(),'Churidar');
    assert.equal(await station().inputValue(),'3');
    checks.push('Search and station filter combine; opening details and returning preserves both filters');
    await page.getByRole('button',{name:'Clear search',exact:true}).click();
    await count(13);
    assert.ok(await search().evaluate(e=>e===document.activeElement));
    await search().fill('no-such-order');
    await page.getByRole('heading',{name:'No matching completed work',exact:true}).waitFor();
    await screenshot('no-results-390');
    await page.getByRole('button',{name:'Show all completed work',exact:true}).click();
    await count(20);
    assert.equal(await station().inputValue(),'all');
    checks.push('Clear search keeps keyboard focus; empty results offer a working reset');
    await page.getByRole('button',{name:'Next page',exact:true}).click();
    await count(6);
    assert.equal(await page.locator('[aria-label="Completed work results"]').evaluate(e=>e===document.activeElement),true);
    await page.locator('[data-history-entry]').first().click();
    await page.getByRole('heading',{name:'Completion details',exact:true}).waitFor();
    await page.getByRole('link',{name:'Back to history',exact:true}).click();
    await count(6);
    await page.getByText('21–26 of 26',{exact:true}).waitFor();
    await page.getByRole('button',{name:'Previous page',exact:true}).click();
    await count(20);
    checks.push('Pagination moves focus to results and preserves page when returning from details');
    failure=true;
    await page.getByRole('button',{name:'Refresh work history',exact:true}).click();
    await page.getByText('History temporarily unavailable',{exact:true}).waitFor();
    await count(20);
    failure=false;
    await page.getByRole('button',{name:'Try again',exact:true}).click();
    await page.getByText('History temporarily unavailable',{exact:true}).waitFor({state:'hidden'});
    failure=true;
    await page.reload();
    await page.getByText('History temporarily unavailable',{exact:true}).waitFor();
    await screenshot('error-390');
    failure=false;
    await page.getByRole('button',{name:'Try again',exact:true}).click();
    await count(20);
    checks.push('Refresh failures preserve entries; initial and refresh errors both recover with retry');
    empty=true;
    await page.reload();
    await page.getByRole('heading',{name:'No completed work yet',exact:true}).waitFor();
    await screenshot('empty-390');
    assert.equal(await page.getByRole('link',{name:'Go to my work',exact:true}).getAttribute('href'),'/my-work');
    empty=false;
    delay=1500;
    await page.reload();
    await page.getByText('Loading records…',{exact:true}).waitFor();
    await screenshot('loading-390');
    await count(20);
    delay=0;
    checks.push('First-use empty state and loading placeholders render correctly');
    entries[0].garment='Custom embroidered '+('verylonggarmentname'.repeat(10));
    entries[0].orderNumber='SG-'+('1234567890'.repeat(10));
    entries[0].stepName='Special '+('long-stitching-stage-'.repeat(8));
    await page.reload();
    await count(20);
    await page.setViewportSize({width:320,height:720});
    await fits('Long content 320');
    await screenshot('long-content-320');
    await page.getByRole('navigation',{name:'Record pages'}).scrollIntoViewIfNeeded();
    const pagination=await page.getByRole('navigation',{name:'Record pages'}).boundingBox();
    const nav=await page.locator('.worker-nav').boundingBox();
    assert.ok(pagination.y+pagination.height<=nav.y,'Bottom navigation overlaps pagination');
    await page.setViewportSize({width:844,height:390});
    await fits('Landscape');
    checks.push('Long garment, order and stage names wrap at 320px; bottom navigation leaves pagination reachable');
    assert.deepEqual(errors,[]);
    fs.writeFileSync(`${root}/history-ui-results.json`,JSON.stringify({mode:'Local production build; synthetic read-only fixtures; device timezone America/Los_Angeles',checks,errors},null,2));
    console.log(JSON.stringify({checks,errors},null,2));
  } catch(error) {
    await screenshot('failure');
    console.log(JSON.stringify({errors,body:await page.locator('body').innerText()},null,2));
    throw error;
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
