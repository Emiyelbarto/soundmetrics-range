// TollPay API. Internal service, reverse proxied by the portal under /api. Vulnerable by design.
const express = require('express');
const { aesEncrypt, aesDecrypt, signJwt, verifyJwt } = require('./crypto');
const db = require('./db');

const app = express();
app.use(express.json());

// --- VULN: reflective CORS with credentials. Any origin is trusted. ---
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) res.set('Access-Control-Allow-Origin', origin); // reflect, do not validate
  res.set('Access-Control-Allow-Credentials', 'true');
  res.set('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  res.set('Access-Control-Expose-Headers', 'Content-Disposition');
  res.set('Vary', 'Origin');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

const now = () => Math.floor(Date.now() / 1000);

function buildIdentity(cust, { wrap }) {
  const base = {
    lockedid: cust.accountId, accountId: cust.accountId,
    username: cust.username, scope: cust.scope,
  };
  const access = signJwt({ ...base, type: 'access_token', nbf: now(), iat: now(), exp: now() + 120 });
  const refresh = signJwt({ ...base, type: 'refresh_token', nbf: now(), iat: now(), exp: now() + 3600 });
  return {
    $type: 'TollPay.Model.Security.UserIdentity',
    Username: cust.username,
    access_token: wrap ? aesEncrypt(access) : access,   // browser login = AES wrapped; unauth bug = plaintext
    refresh_token: wrap ? aesEncrypt(refresh) : refresh,
    UserId: cust.accountId,
    Scope: cust.scope,
    expires_in: new Date((now() + 120) * 1000).toISOString(),
  };
}

// Pull a JWT from Authorization: Bearer or the tp_session cookie, verify it.
function authed(req) {
  const h = req.headers['authorization'] || '';
  let token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) {
    const m = /(?:^|;\s*)tp_session=([^;]+)/.exec(req.headers.cookie || '');
    if (m) token = decodeURIComponent(m[1]);
  }
  if (!token) return null;
  // The portal session cookie is an AES envelope; the Authorization header is a
  // raw JWT. Try the token as-is, then try decrypting it.
  let v = verifyJwt(token);
  if (!v) { try { v = verifyJwt(aesDecrypt(token)); } catch { /* not an envelope */ } }
  return v && v.claims && !v.expired ? v.claims : null;
}
function requireScope(...scopes) {
  return (req, res, next) => {
    const claims = authed(req);
    if (!claims) return res.status(401).json({ error: 'Unauthorized: missing or invalid token' });
    if (!scopes.includes(claims.scope)) {
      return res.status(401).json({ error: `Unauthorized: scope '${claims.scope}' cannot access this resource` });
    }
    req.claims = claims;
    next();
  };
}

// --- Public ---
app.get('/health', (req, res) => res.json({ status: 'healthy', service: 'tollpay-api' }));

app.post('/api/v1/register', (req, res) => {
  const { username, password, email, plate, state } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'username and password required' });
  if (db.findByUsername(username)) return res.status(409).json({ error: 'username taken' });
  const accountId = String(3000000000 + Math.floor(Math.random() * 99999999));
  const serialNumber = 'TP.000' + (3000000 + Math.floor(Math.random() * 999999));
  const cust = { accountId, serialNumber, username, password, scope: 'EXTERNAL',
    firstName: 'New', lastName: 'Customer', email: email || '', address: '', plate: plate || '', state: state || '',
    plan: 'PREPAID', cards: [] };
  db.customers.push(cust);
  res.json({ accountId, serialNumber, scope: 'EXTERNAL', message: 'account created' });
});

// Browser login: returns the AES-wrapped token envelope.
app.post('/api/v1/login', (req, res) => {
  const { username, password } = req.body || {};
  const cust = db.findByUsername(username);
  if (!cust || cust.password !== password) return res.status(401).json({ error: 'invalid credentials' });
  res.json(buildIdentity(cust, { wrap: true }));
});

// Token refresh. Accepts a raw JWT refresh_token, returns a fresh raw access_token.
app.post('/api/v1/token/refresh', (req, res) => {
  const rt = (req.body && req.body.refresh_token) || '';
  const v = verifyJwt(rt);
  if (!v || !v.claims || v.claims.type !== 'refresh_token') {
    return res.status(401).json({ error: 'invalid refresh token' });
  }
  const cust = db.findByAccountId(v.claims.accountId);
  if (!cust) return res.status(401).json({ error: 'unknown account' });
  const access = signJwt({ lockedid: cust.accountId, accountId: cust.accountId, username: cust.username,
    scope: cust.scope, type: 'access_token', nbf: now(), iat: now(), exp: now() + 120 });
  res.json({ access_token: access, Scope: cust.scope, expires_in: new Date((now() + 120) * 1000).toISOString() });
});

// --- VULN: unauthenticated token minting (the SPTRIPS bug) ---
// Any accountId + its SerialNumber yields a valid, plaintext JWT for that account.
app.get('/api/v1/customers/:accountId/setuponlineaccesstolltag', (req, res) => {
  const cust = db.findByAccountId(req.params.accountId);
  const serial = req.query.SerialNumber;
  if (!cust || cust.serialNumber !== serial) {
    return res.status(404).json({ error: 'no tolltag found for that account/serial' });
  }
  res.json(buildIdentity(cust, { wrap: false })); // plaintext tokens, no auth required
});

// --- Customer tier ---
app.get('/api/v1/customers/me', requireScope('EXTERNAL', 'MODERATOR', 'ADMIN'), (req, res) => {
  const cust = db.findByAccountId(req.claims.accountId);
  if (!cust) return res.status(404).json({ error: 'not found' });
  res.json({
    accountId: cust.accountId, serialNumber: cust.serialNumber, scope: cust.scope,
    fullName: `${cust.firstName} ${cust.lastName}`, email: cust.email, address: cust.address,
    plate: cust.plate, state: cust.state, plan: cust.plan, cards: cust.cards,
  });
});

app.get('/api/v1/toll-usage', requireScope('EXTERNAL', 'MODERATOR', 'ADMIN'), (req, res) => {
  res.json({ accountId: req.claims.accountId, usage: db.tollUsage[req.claims.accountId] || [] });
});

app.post('/api/v1/payments', requireScope('EXTERNAL', 'MODERATOR', 'ADMIN'), (req, res) => {
  const { amount, last4 } = req.body || {};
  res.json({ status: 'accepted', accountId: req.claims.accountId, amount, last4, confirmation: 'PMT-' + Date.now() });
});

// --- Moderator tier (reachable only by re-signing a JWT with the leaked secret) ---
app.get('/api/v1/tasks', requireScope('MODERATOR', 'ADMIN'), (req, res) => res.json({ tasks: db.tasks }));

app.post('/api/v1/tasks', requireScope('MODERATOR', 'ADMIN'), (req, res) => {
  const { title, body } = req.body || {};
  if (!title || !body) return res.status(400).json({ error: 'title and body required' });
  const task = { id: db.tasks.length + 1, author: req.claims.username, title: String(title), body: String(body) };
  db.tasks.push(task);
  res.json({ status: 'created', task });
});

// --- Admin tier (final objective) ---
app.get('/api/v1/admin/report', requireScope('ADMIN'), (req, res) => {
  res.json({
    report: 'Monthly Settlement Report',
    generatedFor: req.claims.username,
    settlementKey: db.FLAG_MD5,
    note: 'settlementKey is the lab flag (an MD5). Crack it with rockyou.txt.',
  });
});

const PORT = process.env.PORT || 4001;
app.listen(PORT, () => console.log(`tollpay-api listening on ${PORT}`));
