// Local-only synthetic worker data for reviewing the work-details layout.
const http = require('node:http');
const fixtureId = (i) => `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`;
const asset = {id:'garment-basic-saree-blouse',label:'Basic saree blouse',kind:'garment',view:'front'};
const measurements = ['Bust','Waist','Shoulder','Blouse length','Sleeve length','Armhole','Front neck','Back neck'].map((label,i)=>({id:`m${i}`,label,type:'number'}));
const snapshot = {
  material:'Navy blue cotton silk with matching lining.',priority:'urgent',dueDate:'2026-09-18',assignedAt:'2026-09-13T08:30:00Z',startedAt:'2026-09-14T04:30:00Z',
  measurement:{unit:'in',confirmed:true,fields:[...measurements,{id:'fit',label:'Fit preference',type:'text'},{id:'empty',label:'Unrecorded',type:'number'}],values:{m0:36,m1:30,m2:14,m3:15,m4:6,m5:16,m6:6.5,m7:8,fit:'Comfort fit',empty:''},image:asset},
  design:{notes:'Princess seams, boat neck and elbow sleeves. Add a back opening with covered hooks.',garmentImage:asset,choices:[{...asset,id:'garment-princess-seam-blouse',label:'Princess seam blouse'}],garmentReferences:[asset],references:[]}
};
const entries = Array.from({length:4},(_,i)=>({id:fixtureId(i+1),orderNumber:`SG-${2400+i}`,pieceId:`piece-${i+1}`,garment:'Blouse',station:0,stepName:'Cutting',completedAt:'2026-09-14T10:00:00Z',customer:i===1?null:i===2?{name:'A customer with a very long name that must wrap cleanly on small phones',phone:''}:{name:'Lakshmi Nair',phone:'+91 90000 00001'},snapshot:i===1?null:i===3?{...snapshot,material:'',design:undefined,measurement:{unit:'cm',confirmed:false,fields:[],values:{}}}:snapshot}));
http.createServer(async(req,res)=>{
  const url=new URL(req.url,'http://localhost:3124');
  res.setHeader('Cache-Control','no-store');
  if(url.pathname.startsWith('/api/')) {
    if(req.method!=='GET'){res.writeHead(405);return res.end();}
    let data;
    if(url.pathname==='/api/session')data={owner:{name:'Anjali',email:'anjali@example.test',role:'worker',staffId:'worker-fixture'}};
    else if(url.pathname==='/api/work/history')data={revision:1,entries:entries.map(({snapshot,...entry})=>entry),page:{page:1,pageSize:20,total:entries.length,pageCount:1}};
    else if(url.pathname.startsWith('/api/work/history/')) {const entry=entries.find(e=>url.pathname.endsWith(e.id)); if(!entry){res.writeHead(404,{'Content-Type':'application/json'});return res.end(JSON.stringify({error:'Completed work not found'}));}data={revision:1,entry};}
    else {res.writeHead(404,{'Content-Type':'application/json'});return res.end(JSON.stringify({error:'No fixture for this route'}));}
    res.writeHead(200,{'Content-Type':'application/json'});return res.end(JSON.stringify(data));
  }
  try {
    const headers={...req.headers};delete headers.host;delete headers['accept-encoding'];
    const upstream=await fetch(`http://localhost:3123${req.url}`,{headers,redirect:'manual'});
    res.statusCode=upstream.status;
    upstream.headers.forEach((value,key)=>{if(!['content-encoding','content-length','transfer-encoding','connection'].includes(key))res.setHeader(key,value)});
    res.end(Buffer.from(await upstream.arrayBuffer()));
  } catch(error) {res.writeHead(502);res.end('Local preview server unavailable');}
}).listen(3124,'127.0.0.1',()=>console.log('Synthetic worker review at http://127.0.0.1:3124/my-work/history/'+fixtureId(1)));
