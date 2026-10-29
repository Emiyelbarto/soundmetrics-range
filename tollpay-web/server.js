// TollPay Portal web tier (single public origin, port 4000). Thin BFF + /api reverse proxy.
// The app knows the AES key server-side (normal); the lab point is that the SAME
// key is also shipped, readable, in the static client bundle under /static.
const express = require('express');
const path = require('path');
const { aesEncrypt, aesDecrypt, verifyJwt } = require('./crypto');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const API = process.env.TP_API_INTERNAL || 'http://localhost:4001';

app.use('/static', express.static(path.join(__dirname, 'public', 'static')));

// Reverse-proxy the API under the SAME origin as the portal. This is what lets
// the lab run by IP with no CORS, no CSP tuning and no /etc/hosts. The browser
// only ever talks to the portal origin; the API stays internal.
app.all('/api/*', async (req, res) => {
  const headers = {};
  for (const h of ['authorization', 'cookie', 'content-type']) if (req.headers[h]) headers[h] = req.headers[h];
  const init = { method: req.method, headers };
  if (!['GET', 'HEAD'].includes(req.method)) init.body = JSON.stringify(req.body || {});
  try {
    const r = await fetch(API + req.originalUrl, init);
    const text = await r.text();
    res.status(r.status);
    const ct = r.headers.get('content-type'); if (ct) res.set('Content-Type', ct);
    res.send(text);
  } catch (e) {
    res.status(502).json({ error: 'upstream unavailable' });
  }
});

function getCookie(req, name) {
  const m = new RegExp('(?:^|;\\s*)' + name + '=([^;]+)').exec(req.headers.cookie || '');
  return m ? decodeURIComponent(m[1]) : null;
}
// The session cookie holds the AES-wrapped envelope (the blob), not a JWT. Read
// it by decrypting back to the JWT; fall back to treating it as a raw JWT.
function sessionJwt(req) {
  const raw = getCookie(req, 'tp_session');
  if (!raw) return null;
  try { return aesDecrypt(raw); } catch { return raw; }
}
async function apiFetch(pathname, { token, method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  const r = await fetch(API + pathname, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const text = await r.text();
  let json; try { json = JSON.parse(text); } catch { json = { raw: text }; }
  return { status: r.status, json };
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function page(title, inner) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>TollPay — ${esc(title)}</title><link rel="stylesheet" href="/static/portal.css"></head>
<body><header class="bar"><span class="logo">TollPay</span>
<nav><a href="/dashboard">Dashboard</a><a href="/tasks">Tasks</a><a href="/admin">Admin</a>
<a href="/" onclick="fetch('/portal/logout',{method:'POST'})">Logout</a></nav></header>
<main>${inner}</main></body></html>`;
}

app.get('/health', (req, res) => res.json({ status: 'healthy', service: 'tollpay-web' }));

// Exfil collector. Stands in for the attacker's own server so the lab works over
// a single public port with no callback to the student's machine (NAT-proof).
// GET /collect?id=X&d=... stores a value; GET /collect?id=X reads them back.
const collected = {};
app.get('/collect', (req, res) => {
  const id = String(req.query.id || 'default');
  if (req.query.d !== undefined) {
    (collected[id] = collected[id] || []).push(String(req.query.d));
    res.set('Content-Type', 'image/gif');
    return res.end(Buffer.from('R0lGODlhAQABAAAAACw=', 'base64')); // 1x1 gif
  }
  res.json({ id, entries: collected[id] || [] });
});

// Serve the login/register SPA shell.
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

// The browser authenticates against /api/v1/login itself and gets back the
// AES-wrapped envelope (the blob a student sees in Burp). It then posts that
// envelope here to open a session: the portal decrypts it and sets the cookie.
app.post('/portal/login', async (req, res) => {
  const envelope = (req.body && req.body.envelope) || '';
  let jwt;
  try { jwt = aesDecrypt(envelope); } catch { return res.status(400).json({ error: 'bad envelope' }); }
  const v = verifyJwt(jwt);
  if (!v || !v.claims) return res.status(401).json({ error: 'invalid token' });
  // Store the ENCRYPTED envelope as the session, not the JWT. To read or tamper
  // their own session a student has to decrypt it with the leaked AES key.
  res.set('Set-Cookie', `tp_session=${encodeURIComponent(envelope)}; HttpOnly; Path=/; SameSite=Lax`);
  res.json({ ok: true, scope: v.claims.scope, redirect: '/dashboard' });
});

// Set a session from a raw JWT (lets a student browse as a re-signed MODERATOR token).
app.post('/portal/session', async (req, res) => {
  const jwt = (req.body && req.body.jwt) || '';
  const me = await apiFetch('/api/v1/customers/me', { token: jwt });
  if (me.status !== 200) return res.status(401).json({ error: 'token rejected by API' });
  // Wrap the JWT back into an envelope so the session cookie stays a blob.
  res.set('Set-Cookie', `tp_session=${encodeURIComponent(aesEncrypt(jwt))}; HttpOnly; Path=/; SameSite=Lax`);
  res.json({ ok: true, scope: me.json.scope });
});

app.post('/portal/logout', (req, res) => {
  res.set('Set-Cookie', 'tp_session=; HttpOnly; Path=/; Max-Age=0');
  res.json({ ok: true });
});

// Proxy task creation with the session cookie (mod+).
app.post('/portal/task', async (req, res) => {
  const token = sessionJwt(req);
  const r = await apiFetch('/api/v1/tasks', { token, method: 'POST', body: { title: req.body.title, body: req.body.body } });
  res.status(r.status).json(r.json);
});

app.post('/portal/pay', async (req, res) => {
  const token = sessionJwt(req);
  const r = await apiFetch('/api/v1/payments', { token, method: 'POST', body: { amount: req.body.amount } });
  res.status(r.status).json(r.json);
});

app.get('/dashboard', async (req, res) => {
  const token = sessionJwt(req);
  if (!token) return res.redirect('/');
  const me = await apiFetch('/api/v1/customers/me', { token });
  if (me.status !== 200) return res.redirect('/');
  const c = me.json;
  const cards = (c.cards || []).map(x => `<li>${esc(x.brand)} ****${esc(x.last4)} exp ${esc(x.exp)}</li>`).join('') || '<li>no cards on file</li>';
  // accountId + serialNumber rendered into the DOM — the data the XSS payload scrapes.
  res.send(page('Dashboard', `
    <h1>Account Overview</h1>
    <div class="card">
      <div class="profile" id="profile" data-account-id="${esc(c.accountId)}" data-serial="${esc(c.serialNumber)}">
        <p><b>Name:</b> ${esc(c.fullName)}</p>
        <p><b>Account ID:</b> <span id="accountId">${esc(c.accountId)}</span></p>
        <p><b>TollTag Serial:</b> <span id="serialNumber">${esc(c.serialNumber)}</span></p>
        <p><b>Plan:</b> ${esc(c.plan)} &nbsp; <b>Plate:</b> ${esc(c.plate)} (${esc(c.state)})</p>
        <p><b>Scope:</b> ${esc(c.scope)}</p>
      </div>
      <h3>Payment Cards</h3><ul>${cards}</ul>
      <h3>Pay a Toll</h3>
      <form onsubmit="payToll(event)"><input name="amount" placeholder="amount" value="2.35">
      <button>Charge card</button></form><p id="payResult"></p>
    </div>
    <script src="/static/app.4f2a9c7b.js"></script>`));
});

app.get('/tasks', async (req, res) => {
  const token = sessionJwt(req);
  const r = await apiFetch('/api/v1/tasks', { token });
  if (r.status === 401) {
    return res.status(401).send(page('Tasks', `<h1>Dispute Tasks</h1>
      <p class="warn">Only moderators and administrators can view the task queue.</p>`));
  }
  // VULN: task bodies are rendered without sanitisation (stored XSS sink).
  const items = (r.json.tasks || []).map(t =>
    `<li class="task"><b>${esc(t.title)}</b> <span class="muted">by ${esc(t.author)}</span><div>${t.body}</div></li>`).join('');
  res.send(page('Tasks', `
    <h1>Dispute Tasks <span class="muted">(moderator)</span></h1>
    <form onsubmit="postTask(event)">
      <input name="title" placeholder="title" required>
      <textarea name="body" placeholder="body" required></textarea>
      <button>Add task</button></form>
    <ul class="tasks">${items}</ul>
    <script src="/static/tasks.9e1d55a0.js"></script>`));
});

app.get('/admin', async (req, res) => {
  const token = sessionJwt(req);
  const r = await apiFetch('/api/v1/admin/report', { token });
  if (r.status !== 200) {
    return res.status(r.status).send(page('Admin', `<h1>Administration</h1>
      <p class="warn">${esc((r.json && r.json.error) || 'Forbidden')}</p>`));
  }
  res.send(page('Admin', `<h1>Administration — Settlement</h1>
    <div class="card"><p><b>${esc(r.json.report)}</b></p>
    <p><b>Settlement key:</b> <code>${esc(r.json.settlementKey)}</code></p>
    <p class="muted">${esc(r.json.note)}</p></div>`));
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`tollpay-web listening on ${PORT}`));
