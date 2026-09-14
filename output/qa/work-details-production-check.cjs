// Read-only smoke check for the compact worker-history details release.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const base = 'https://swapna-garmentsweb-production.up.railway.app';
(async () => {
  const report = { checkedAt: new Date().toISOString(), origin: base, codeCommit: process.env.RELEASE_COMMIT, deploymentId: process.env.RELEASE_DEPLOYMENT, checks: {}, pages: {}, assets: [] };
  const get = async route => {
    const response = await fetch(new URL(route, base), {cache:'no-store',signal:AbortSignal.timeout(30000)});
    return {response,body:await response.text()};
  };
  const health = await get('/api/health');
  assert.equal(health.response.status,200);
  report.health=JSON.parse(health.body);
  assert.equal(report.health.status,'ok');
  assert.equal(report.health.database,'connected');
  for (const route of ['/api/session','/api/work/history','/api/work/history/not-a-uuid']) {
    const {response,body}=await get(route);
    assert.equal(response.status,401,route);
    assert.match(response.headers.get('cache-control')||'',/no-store/);
    if(route==='/api/session') {assert.equal(JSON.parse(body).setupRequired,false); report.checks.ownerSetupClosed=true;}
    report.checks[route]={status:response.status,cacheControl:response.headers.get('cache-control')};
  }
  const urls=new Set();
  for (const route of ['/','/my-work/history','/my-work/history/00000000-0000-4000-8000-000000000001']) {
    const {response,body}=await get(route);
    assert.equal(response.status,200,route);
    report.pages[route]=response.status;
    for(const match of body.matchAll(/(?:src|href)="([^" ]+\.(?:js|css)(?:\?[^" ]*)?)"/g))if(match[1].startsWith('/_next/static/'))urls.add(match[1].replaceAll('&amp;','&'));
  }
  const published=(await Promise.all([...urls].map(async url=>{
    const {response,body}=await get(url);
    assert.equal(response.status,200,url); report.assets.push({url,status:response.status}); return body;
  }))).join('\n');
  for(const marker of ['Full work record','Work information','Saved measurements','Phone not provided','Customer details are no longer available for this order.','tablist','tabpanel','aria-selected','grid-template-columns'])assert.ok(published.includes(marker),`Missing deployed feature: ${marker}`);
  report.checks.compactWorkDetailsAssets=true;
  report.scope='Public pages, deployed assets, health and unsigned API checks only. Worker interactions verified locally with synthetic fixtures; no production data writes.';
  fs.writeFileSync(path.join(__dirname,'work-details-production-release.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify({success:true,checkedAt:report.checkedAt,health:report.health,pages:report.pages,assets:report.assets.length,featureMarkers:true}));
})().catch(error=>{console.error(error);process.exitCode=1;});
