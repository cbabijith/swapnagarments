const { chromium } = require('C:/Users/moham/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const root='C:/flutter_projects/swapnagarments/output/qa';
const base=process.env.WORKER_TEST_URL||'http://localhost:3119';
const user={name:'Anjali Nair',email:'anjali@example.test',role:'worker',staffId:'worker-a'};
const profile={id:'worker-a',name:user.name,email:user.email,role:'Worker',color:'sage',skills:[0,1,3],available:true,capacityMinutes:480};
const pieces=Array.from({length:3},(_,i)=>({order:{id:`order-${i}`,number:`SG-${2400+i}`,priority:i===0?'urgent':'normal',dueDate:'2026-09-14'},item:{id:`piece-${i}`,garment:['Blouse','Churidar','Gown'][i],station:0,work:{version:1,assigneeId:user.staffId,status:['in_progress','blocked','pending'][i]}}}));
const entries=Array.from({length:3},(_,i)=>({id:`completion-${i}`,orderNumber:`SG-${2300+i}`,pieceId:`finished-${i}`,garment:['Blouse','Churidar','Gown'][i],station:0,stepName:'Cutting',completedAt:new Date(Date.UTC(2026,8,14-i,6,30)).toISOString()}));
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'chrome'});
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const checks=[],errors=[];
 let failProfile=false,failWork=false,failHistory=false,missingProfile=false,empty=false,profileDelay=0,signOutMode='success',signOutCalls=0;
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/api/**',async route=>{
  const url=new URL(route.request().url());let body;
  if(url.pathname==='/api/auth') {
   assert.equal(route.request().method(),'DELETE');signOutCalls++;
   if(signOutMode==='network') return route.abort('failed');
   if(signOutMode==='failure') return route.fulfill({status:503,json:{error:'Could not sign out'}});
   await new Promise(resolve=>setTimeout(resolve,600));
   return route.fulfill({json:{success:true}});
  }
  assert.equal(route.request().method(),'GET','Profile must not change worker or shop records');
  if(url.pathname==='/api/session') body={owner:user};
  else if(url.pathname==='/api/work/profile') {
   if(profileDelay) await new Promise(resolve=>setTimeout(resolve,profileDelay));
   if(failProfile) return route.fulfill({status:503,json:{error:'Profile temporarily unavailable'}});
   body={revision:1,profile:missingProfile?null:profile};
  } else if(url.pathname==='/api/work') {
   if(failWork) return route.fulfill({status:503,json:{error:'Work temporarily unavailable'}});
   body={revision:1,today:'2026-09-14',summary:{total:empty?0:27,pending:empty?0:12,inProgress:empty?0:10,blocked:empty?0:5,overdue:empty?0:1,unassigned:0},pieces:empty?[]:pieces,page:{page:1,pageSize:3,total:empty?0:27,pageCount:empty?0:9}};
  } else if(url.pathname==='/api/work/history') {
   if(failHistory) return route.fulfill({status:503,json:{error:'History temporarily unavailable'}});
   body={revision:1,entries:empty?[]:entries,page:{page:1,pageSize:3,total:empty?0:123,pageCount:empty?0:41}};
  } else if(url.pathname.startsWith('/api/work/history/')) body={revision:1,entry:{...entries[0],snapshot:null}};
  else throw new Error(`Unexpected API request: ${url.pathname}`);
  await route.fulfill({json:body});
 });
 const ready=()=>page.getByRole('heading',{name:'Profile details',exact:true}).waitFor();
 const fits=async label=>{
  const size=await page.evaluate(()=>({width:document.documentElement.scrollWidth,viewport:innerWidth}));
  assert.ok(size.width<=size.viewport,`${label} overflow ${JSON.stringify(size)}`);
 };
 const screenshot=async name=>page.screenshot({path:`${root}/profile-ui-${name}.png`,fullPage:false});
 const current=()=>page.locator('[data-profile-current]');
 const completed=()=>page.locator('[data-profile-history]');
 try {
  await page.goto(base+'/my-work/profile');await ready();
  const overview=page.getByRole('navigation',{name:'Work overview'});
  assert.deepEqual(await overview.locator('strong').allTextContents(),['27','123']);
  await page.getByText('8 hours',{exact:true}).waitFor();
  assert.equal(await page.getByRole('heading',{name:user.name,exact:true}).count(),1);
  for(const width of [320,360,390,430,768,1440]) {
   await page.setViewportSize({width,height:width<768?844:1000});await fits(`Profile ${width}`);
   if(width<=430) {
    const box=await overview.boundingBox();assert.ok(box.y+box.height<640,`Work shortcuts too low at ${width}`);
    for(const target of [page.getByRole('button',{name:'Sign out',exact:true}),current().locator('summary'),completed().locator('summary')]) {
     const box=await target.boundingBox();assert.ok(box.height>=44 && box.width>=44,'Touch target under 44px');
    }
   }
   await screenshot(String(width));checks.push(`Profile fits ${width}px with readable details and reachable work shortcuts`);
  }
  await page.setViewportSize({width:390,height:844});
  await current().locator('summary').focus();await page.keyboard.press('Enter');
  assert.equal(await current().getAttribute('open'),'');
  assert.equal(await current().locator('[data-profile-work-entry]').count(),3);
  assert.deepEqual(await current().locator('dd').allTextContents(),['12','10','5']);
  const firstHref=await current().locator('[data-profile-work-entry]').first().getAttribute('href');
  assert.equal(new URL(firstHref,base).searchParams.get('code'),'swapna:order-0:piece-0');
  await fits('Expanded work');await screenshot('current-work-390');
  await current().locator('summary').click();
  await completed().locator('summary').click();
  await completed().locator('[data-profile-history-entry]').first().click();
  await page.getByRole('heading',{name:'Completion details',exact:true}).waitFor();
  await page.getByRole('link',{name:'Profile',exact:true}).click();await ready();
  checks.push('Work totals use full server counts; keyboard expands previews; links open the selected assignment or history record');
  await overview.getByRole('link').first().click();
  await page.waitForURL('**/my-work');
  await page.getByRole('link',{name:'Profile',exact:true}).click();await ready();
  await overview.getByRole('link').last().click();
  await page.getByRole('heading',{name:'Work history',exact:true}).waitFor();
  await page.getByRole('link',{name:'Profile',exact:true}).click();await ready();
  checks.push('Both work overview shortcuts navigate correctly');
  profile.available=false;profile.capacityMinutes=95;await page.reload();await ready();
  await page.getByText('Unavailable for new work',{exact:true}).waitFor();
  await page.getByText('You can still resume or finish work already started.',{exact:true}).waitFor();
  await page.getByText('1 hour 35 min',{exact:true}).waitFor();await screenshot('unavailable-390');
  profile.name='Anjali '+('Nair '.repeat(18)).trim();profile.email='long.worker.'+'x'.repeat(110)+'@example.test';profile.role='Senior garment specialist';profile.skills=[0,1,2,3,4];
  await page.reload();await ready();await page.setViewportSize({width:320,height:844});await fits('Long profile');await screenshot('long-details-320');
  profile.name=user.name;profile.email=user.email;profile.role='Worker';profile.skills=[];profile.capacityMinutes=30;await page.reload();await ready();
  await page.getByText('No skills added yet',{exact:true}).waitFor();await page.getByText('30 min',{exact:true}).waitFor();
  checks.push('Availability guidance, hour/minute capacity, empty skills and long account details render correctly');
  profile.skills=[0,1,3];profile.available=true;profile.capacityMinutes=480;
  failWork=true;await page.reload();await ready();await page.getByText('Work temporarily unavailable',{exact:true}).waitFor();
  assert.equal(await overview.locator('strong').first().innerText(),'—');
  failWork=false;await page.getByRole('button',{name:'Try again',exact:true}).click();await page.getByText('Work temporarily unavailable',{exact:true}).waitFor({state:'hidden'});
  failHistory=true;await page.reload();await ready();await page.getByText('History temporarily unavailable',{exact:true}).waitFor();failHistory=false;
  await page.getByRole('button',{name:'Try again',exact:true}).click();await page.getByText('History temporarily unavailable',{exact:true}).waitFor({state:'hidden'});
  failProfile=true;await page.reload();await page.getByText('Profile temporarily unavailable',{exact:true}).waitFor();
  assert.ok(await page.getByRole('button',{name:'Sign out',exact:true}).isVisible());await screenshot('error-320');failProfile=false;
  await page.getByRole('button',{name:'Try again',exact:true}).click();await ready();
  checks.push('Each query can fail and recover independently; unavailable totals are not shown as zero and sign out remains accessible');
  missingProfile=true;await page.reload();await page.getByRole('heading',{name:'Profile unavailable',exact:true}).waitFor();missingProfile=false;
  await page.getByRole('button',{name:'Try again',exact:true}).click();await ready();
  empty=true;await page.reload();await ready();assert.deepEqual(await overview.locator('strong').allTextContents(),['0','0']);
  await current().locator('summary').click();await page.getByText('Your queue is clear. New assignments will appear here.',{exact:true}).waitFor();
  await completed().locator('summary').click();await page.getByText('No completed work yet. Your finished stages will appear here.',{exact:true}).waitFor();
  await fits('Empty previews');await screenshot('empty-320');empty=false;
  profileDelay=1200;await page.reload();await page.getByText('Loading records…',{exact:true}).waitFor();await screenshot('loading-320');await ready();profileDelay=0;
  checks.push('Missing profile, loading and empty work states offer clear feedback');
  signOutMode='network';await page.getByRole('button',{name:'Sign out',exact:true}).click();await page.getByRole('alert').filter({hasText:'Could not sign out. Please try again.'}).waitFor();
  signOutMode='failure';await page.getByRole('button',{name:'Sign out',exact:true}).click();await page.getByText('Could not sign out. Please try again.',{exact:true}).waitFor();
  await page.getByRole('button',{name:'Sign out',exact:true}).scrollIntoViewIfNeeded();
  const button=await page.getByRole('button',{name:'Sign out',exact:true}).boundingBox(),nav=await page.locator('.worker-nav').boundingBox();
  assert.ok(button.y+button.height<=nav.y,'Bottom nav obscures sign out');
  await page.getByRole('button',{name:'Dismiss notification',exact:true}).click();
  signOutMode='success';await page.getByRole('button',{name:'Sign out',exact:true}).click();
  assert.ok(await page.getByRole('button',{name:'Signing out…',exact:true}).isDisabled());
  await page.locator('.worker-shell').waitFor({state:'hidden'});assert.equal(signOutCalls,3);
  checks.push('Sign out recovers from network and server failures, prevents repeat taps while pending, and returns to sign in');
  assert.deepEqual(errors,[]);
  fs.writeFileSync(`${root}/profile-ui-results.json`,JSON.stringify({mode:'Local production build; synthetic API fixtures; no live shop data',checks,errors},null,2));
  console.log(JSON.stringify({checks,errors},null,2));
 } catch(error) { await screenshot('failure');console.log(JSON.stringify({errors,body:await page.locator('body').innerText()},null,2));throw error; }
 finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
