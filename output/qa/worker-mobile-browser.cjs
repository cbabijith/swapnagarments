const { chromium } = require('C:/Users/moham/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const root = 'C:/flutter_projects/swapnagarments/output/qa';
const base = process.env.WORKER_TEST_URL || 'http://localhost:3118';
const user = { name: 'Anjali Nair', email: 'anjali@example.test', role: 'worker', staffId: 'worker-a' };
const profile = { id: 'worker-a', name: user.name, email: user.email, role: 'Worker', color: 'sage', skills: [0, 1, 3], available: true, capacityMinutes: 480 };
const today = '2026-09-14';
const pieces = Array.from({length:5}, (_, i) => ({
  order: { id: `order-${i}`, number: `SG-${2100+i}`, priority: i === 0 ? 'urgent' : 'normal', dueDate: today },
  item: { id: `piece-${i}`, garment: i % 2 ? 'Churidar' : 'Blouse', material: 'Cotton with matching lining', station: i % 2 ? 3 : 0,
    measurement: {confirmed:true, unit:'in', fields:[{id:'chest',label:'Chest',type:'number'},{id:'length',label:'Length',type:'number'}], values:{chest:'36',length:'15'}},
    work: { assigneeId: user.staffId, status: i === 0 ? 'in_progress' : i === 1 ? 'blocked' : 'pending', version: 1, ...(i===1?{blockedReason:'Waiting for matching lining fabric.'}:{}) } },
  assigneeName: user.name,
}));
const entries = Array.from({length:7}, (_, i) => ({id:`completion-${i}`, orderNumber:`SG-${2000+i}`, pieceId:`finished-${i}`, garment:i%2?'Churidar':'Blouse', station:0, stepName:'Cutting', completedAt:new Date(Date.UTC(2026,8,14-i,6,30)).toISOString()}));
(async () => {
  const browser = await chromium.launch({headless:true, channel:'chrome'});
  const page = await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const errors=[];
  const checks=[];
  let failQueue=false;
  let failProfile=false;
  let mutations=0;
  let revision=1;
  page.on('pageerror', error=>errors.push(error.message));
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url());
    let body;
    if (url.pathname==='/api/session') body={owner:user};
    else if (url.pathname==='/api/work/profile') {
      if(failProfile) return route.fulfill({status:503,json:{error:'Profile temporarily unavailable'}});
      body={revision,profile};
    } else if(url.pathname==='/api/work' && route.request().method()==='POST') {
      const { action }=route.request().postDataJSON();
      const piece=pieces.find(p=>p.item.id===action.pieceId);
      if (action.operation==='complete') pieces.splice(pieces.indexOf(piece),1);
      else piece.item.work.status=action.operation==='block'?'blocked':'in_progress';
      if(action.reason) piece.item.work.blockedReason=action.reason;
      mutations++;
      body={revision:++revision};
    } else if(url.pathname==='/api/work') {
      if(failQueue) return route.fulfill({status:503,json:{error:'Work temporarily unavailable'}});
      let selected=pieces;
      if(url.searchParams.get('code')) selected=selected.filter(p=>`swapna:${p.order.id}:${p.item.id}`===url.searchParams.get('code') || p.order.number===url.searchParams.get('code'));
      if(url.searchParams.get('status') && url.searchParams.get('status')!=='all') selected=selected.filter(p=>p.item.work.status===url.searchParams.get('status'));
      if(url.searchParams.get('station') && url.searchParams.get('station')!=='all') selected=selected.filter(p=>p.item.station===Number(url.searchParams.get('station')));
      const size=Number(url.searchParams.get('pageSize')||20);
      body={revision,today,summary:{total:pieces.length,pending:pieces.filter(p=>p.item.work.status==='pending').length,inProgress:pieces.filter(p=>p.item.work.status==='in_progress').length,blocked:pieces.filter(p=>p.item.work.status==='blocked').length,overdue:0,unassigned:0},pieces:selected.slice(0,size),page:{page:1,pageSize:size,total:selected.length,pageCount:Math.ceil(selected.length/size)}};
    } else if(url.pathname==='/api/work/history') {
      let selected=entries;
      if(url.searchParams.get('q')) selected=selected.filter(e=>e.garment.toLowerCase().includes(url.searchParams.get('q').toLowerCase()));
      if(url.searchParams.get('station') && url.searchParams.get('station')!=='all') selected=selected.filter(e=>e.station===Number(url.searchParams.get('station')));
      const size=Number(url.searchParams.get('pageSize')||20);
      body={revision,entries:selected.slice(0,size),page:{page:1,pageSize:size,total:selected.length,pageCount:Math.ceil(selected.length/size)}};
    } else if(url.pathname.startsWith('/api/work/history/')) {
      body={revision,entry:{...entries[0],snapshot:{material:'Cotton with matching lining',dueDate:today,priority:'urgent',measurement:pieces[0].item.measurement}}};
    } else if(url.pathname==='/api/auth') body={success:true};
    else throw new Error(`Unexpected API request: ${url.pathname}`);
    return route.fulfill({json:body});
  });
  const fits=async(label)=>{
    const overflow=await page.evaluate(()=>({viewport:innerWidth,width:document.documentElement.scrollWidth}));
    assert.ok(overflow.width<=overflow.viewport,`${label}: ${JSON.stringify(overflow)}`);
  };
  const screenshot=async(name)=>{
    await page.evaluate(()=>document.activeElement?.blur());
    await page.screenshot({path:`${root}/worker-mobile-${name}.png`,fullPage:false});
  };
  try {
    await page.goto(base+'/my-work');
    await page.locator('.work-card').first().waitFor();
    for(const width of [320,360,390,430,768,1440]) {
      await page.setViewportSize({width,height:width<768?844:1000});
      await fits(`Queue ${width}`);
      if(width<=430) {
        const card=await page.locator('.work-card').first().boundingBox();
        assert.ok(card.y<410,`First task should be reachable near the top at ${width}px, actual ${card.y}`);
        for(const element of await page.locator('.work-actions .button, .worker-nav a, .work-status-filters button').all()) {
          const box=await element.boundingBox();
          assert.ok(box.height>=44 && box.width>=44,`Touch target too small at ${width}: ${JSON.stringify(box)}`);
        }
        assert.ok(await page.locator('select[aria-label="Work station"]').evaluate(e=>parseFloat(getComputedStyle(e).fontSize)>=16));
      }
      await screenshot(`queue-${width}`);
      checks.push(`Queue fits ${width}px${width<=430?', first task above 410px, touch targets at least 44px':''}`);
    }
    await page.setViewportSize({width:390,height:844});
    await page.getByRole('button',{name:'To do',exact:true}).click();
    await page.waitForFunction(()=>document.querySelectorAll('.work-card').length===3);
    assert.equal(await page.getByRole('button',{name:'To do',exact:true}).getAttribute('aria-pressed'),'true');
    await page.getByRole('combobox',{name:'Work station',exact:true}).selectOption('4');
    await page.getByRole('heading',{name:'No work matches these filters'}).waitFor();
    await page.getByRole('button',{name:'Show all work',exact:true}).click();
    await page.waitForFunction(()=>document.querySelectorAll('.work-card').length===5);
    checks.push('Status and station filters update results; empty filters can be cleared');
    await page.locator('.work-details summary').first().click();
    await page.getByText('Confirmed measurements').first().waitFor();
    await fits('Expanded measurements');
    await screenshot('measurements-390');
    await page.locator('.work-details summary').first().click();
    await page.getByRole('button',{name:'Complete stage',exact:true}).first().click();
    await page.getByRole('dialog').waitFor();
    await fits('Completion dialog');
    await screenshot('complete-dialog-390');
    await page.getByRole('button',{name:'Cancel',exact:true}).click();
    assert.equal(mutations,0,'Cancel must not mutate work');
    await page.getByRole('button',{name:'Start work',exact:true}).first().click();
    await page.waitForFunction(()=>document.querySelectorAll('.work-in_progress').length===2);
    assert.equal(mutations,1);
    await page.getByRole('button',{name:'Dismiss notification'}).click();
    checks.push('Measurements expand; cancelling completion leaves work untouched; Start work refreshes the card');
    await page.getByRole('button',{name:'Block',exact:true}).first().click();
    await page.getByRole('textbox',{name:'Reason',exact:true}).fill('Waiting for a fabric delivery');
    await screenshot('block-dialog-390');
    await page.getByRole('button',{name:'Cancel',exact:true}).click();
    await page.getByRole('link',{name:'History',exact:true}).click();
    await page.getByRole('heading',{name:'Work history',exact:true}).waitFor();
    await page.locator('[data-history-entry]').first().waitFor();
    for(const width of [320,390,430]) {
      await page.setViewportSize({width,height:844});
      await fits(`History ${width}`);
      await screenshot(`history-${width}`);
    }
    await page.getByRole('textbox',{name:'Search work history'}).fill('Churidar');
    await page.getByText('3 completed stages',{exact:true}).waitFor();
    checks.push('History layouts fit phones; history search returns the matching garments');
    await page.locator('[data-history-entry]').first().click();
    await page.getByRole('heading',{name:'Completion details',exact:true}).waitFor();
    for(const width of [320,390]) {
      await page.setViewportSize({width,height:844});
      await fits(`History details ${width}`);
      await screenshot(`history-details-${width}`);
    }
    await page.getByRole('link',{name:'Back to history',exact:true}).click();
    await page.getByText('3 completed stages',{exact:true}).waitFor();
    assert.equal(await page.getByRole('textbox',{name:'Search work history'}).inputValue(),'Churidar');
    checks.push('Completed work details fit phones and preserve history search on return');
    await page.getByRole('link',{name:'Profile',exact:true}).click();
    await page.getByRole('heading',{name:'Profile details',exact:true}).waitFor();
    for(const width of [320,390,430,1440]) {
      await page.setViewportSize({width,height:844});
      await fits(`Profile ${width}`);
      await screenshot(`profile-${width}`);
    }
    await page.setViewportSize({width:320,height:720});
    profile.name='Anjali '+('Nair '.repeat(18)).trim();
    profile.email='long.worker.'+'x'.repeat(90)+'@example.test';
    profile.available=false;
    await page.reload();
    await page.getByText('Unavailable for new work',{exact:true}).waitFor();
    await fits('Long identity');
    failProfile=true;
    await page.reload();
    await page.getByText('Profile temporarily unavailable',{exact:true}).waitFor();
    assert.equal(await page.getByRole('button',{name:'Sign out',exact:true}).count(),1);
    failProfile=false;
    await page.getByRole('button',{name:'Try again',exact:true}).click();
    await page.getByRole('heading',{name:'Profile details',exact:true}).waitFor();
    checks.push('Profile fits long names and email addresses; retry and sign out remain available on failure');
    await page.getByRole('link',{name:'Scan piece',exact:true}).click();
    await page.getByRole('heading',{name:'Scan a garment label',exact:true}).waitFor();
    for(const width of [320,390,430]) {
      await page.setViewportSize({width,height:844});
      await fits(`Scan ${width}`);
      await screenshot(`scan-${width}`);
    }
    const input=page.getByRole('textbox',{name:'Or enter the printed order number'});
    assert.ok(await input.evaluate(e=>parseFloat(getComputedStyle(e).fontSize)>=16));
    await input.fill('SG-2100');
    await page.getByRole('button',{name:'Find piece',exact:true}).click();
    await page.getByText('Showing the scanned label').waitFor();
    assert.equal(await page.locator('.work-card').count(),1);
    await page.getByRole('button',{name:'Show full queue'}).click();
    await page.waitForFunction(()=>document.querySelectorAll('.work-card').length===5);
    failQueue=true;
    await page.getByRole('button',{name:'Refresh work queue'}).click();
    await page.getByText('Work temporarily unavailable',{exact:true}).waitFor();
    failQueue=false;
    await page.getByRole('button',{name:'Try again',exact:true}).click();
    await page.getByText('Work temporarily unavailable',{exact:true}).waitFor({state:'hidden'});
    checks.push('Scan supports printed order lookup; queue errors recover with retry');
    await page.locator('.query-pagination').scrollIntoViewIfNeeded();
    const pagination=await page.locator('.query-pagination').boundingBox();
    const nav=await page.locator('.worker-nav').boundingBox();
    assert.ok(pagination.y+pagination.height<=nav.y,'Bottom navigation must not obscure the last content');
    await page.setViewportSize({width:844,height:390});
    await fits('Landscape queue');
    await page.getByRole('link',{name:'Profile',exact:true}).click();
    await page.getByRole('heading',{name:'Profile details',exact:true}).waitFor();
    await page.getByRole('button',{name:'Sign out',exact:true}).click();
    await page.locator('.worker-shell').waitFor({state:'hidden'});
    checks.push('Profile sign out returns to the sign-in screen');
    assert.deepEqual(errors,[]);
    fs.writeFileSync(`${root}/worker-mobile-results.json`,JSON.stringify({mode:'Local production build; synthetic API fixtures, no live data',checks,errors},null,2));
    console.log(JSON.stringify({checks,errors},null,2));
  } catch(error) {
    console.log(JSON.stringify({errors,body:await page.locator('body').innerText()},null,2));
    await screenshot('failure');
    throw error;
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
