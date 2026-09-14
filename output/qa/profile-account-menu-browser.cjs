const { chromium } = require('C:/Users/moham/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const root='C:/flutter_projects/swapnagarments/output/qa';
const base=process.env.WORKER_TEST_URL||'http://localhost:3119';
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'chrome'});
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const errors=[],checks=[];let fail=true,logouts=0;
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/api/**',async route=>{
  const path=new URL(route.request().url()).pathname;let body;
  if(path==='/api/auth'){
   assert.equal(route.request().method(),'DELETE');logouts++;
   await new Promise(resolve=>setTimeout(resolve,500));
   return route.fulfill({status:fail?503:200,json:fail?{error:'Unavailable'}:{success:true}});
  }
  assert.equal(route.request().method(),'GET');
  if(path==='/api/session') body={owner:{name:'Anjali Nair',email:'anjali@example.test',role:'worker',staffId:'worker-a'}};
  else if(path==='/api/work/profile') body={revision:1,profile:{id:'worker-a',name:'Anjali Nair',email:'anjali@example.test',role:'Worker',color:'sage',skills:[0,3],available:true,capacityMinutes:480}};
  else if(path==='/api/work') body={revision:1,today:'2026-09-14',pieces:[],summary:{total:0,pending:0,inProgress:0,blocked:0,overdue:0,unassigned:0},page:{page:1,pageSize:20,total:0,pageCount:0}};
  else if(path==='/api/work/history') body={revision:1,entries:[],page:{page:1,pageSize:3,total:0,pageCount:0}};
  else throw Error(`Unexpected API ${path}`);
  await route.fulfill({json:body});
 });
 try {
  await page.goto(base+'/my-work');
  await page.getByRole('link',{name:"View Anjali Nair's profile",exact:true}).click();
  await page.getByRole('heading',{name:'Profile details',exact:true}).waitFor();
  const header=page.locator('.worker-header');
  const trigger=header.locator('summary[aria-label="Open account menu"]');
  assert.equal(await header.getByRole('button',{name:'Sign out',exact:true}).count(),0);
  await trigger.click();
  await header.getByRole('button',{name:'Sign out',exact:true}).waitFor();
  assert.equal(logouts,0,'Opening the menu must not sign out');
  for(const width of [320,390,1440]) {
   await page.setViewportSize({width,height:844});
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   const box=await trigger.boundingBox();assert.ok(box.width>=44 && box.height>=44);
   const menu=await header.locator('details > div').boundingBox();assert.ok(menu.x>=0 && menu.x+menu.width<=width);
   await page.screenshot({path:`${root}/profile-account-menu-${width}.png`});
  }
  checks.push('Top profile link navigates to profile; its menu opens without signing out and fits 320, 390 and 1440px');
  await page.keyboard.press('Escape');
  assert.equal(await header.locator('details').getAttribute('open'),null);
  assert.ok(await trigger.evaluate(e=>e===document.activeElement));
  await page.keyboard.press('Enter');await header.getByRole('button',{name:'Sign out',exact:true}).waitFor();
  await trigger.click();assert.equal(await header.locator('details').getAttribute('open'),null);
  checks.push('Escape closes and restores focus; Enter opens and a second tap closes the menu');
  await page.getByRole('link',{name:'History',exact:true}).click();
  await page.getByRole('link',{name:"View Anjali Nair's profile",exact:true}).waitFor();
  await page.getByRole('link',{name:'Profile',exact:true}).click();await trigger.waitFor();
  assert.equal(await header.locator('details').getAttribute('open'),null);
  await trigger.click();await header.getByRole('button',{name:'Sign out',exact:true}).click();
  await page.getByText('Could not sign out. Please try again.',{exact:true}).waitFor();
  assert.ok(await header.getByRole('button',{name:'Sign out',exact:true}).isEnabled());
  await page.getByRole('button',{name:'Dismiss notification',exact:true}).click();fail=false;
  await header.getByRole('button',{name:'Sign out',exact:true}).click();
  assert.ok(await header.getByRole('button',{name:'Signing out…',exact:true}).isDisabled());
  await page.locator('.worker-shell').waitFor({state:'hidden'});assert.equal(logouts,2);
  checks.push('Navigating away resets the menu; sign out can retry a failure, prevents duplicate taps and returns to sign in');
  assert.deepEqual(errors,[]);
  fs.writeFileSync(`${root}/profile-account-menu-results.json`,JSON.stringify({mode:'Local production build with synthetic API fixtures',checks,errors},null,2));
  console.log(JSON.stringify({checks,errors},null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
