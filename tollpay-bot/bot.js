// TollPay admin "victim". Logs in as the admin and keeps reviewing the task
// queue, so any stored XSS a moderator plants runs in an authenticated admin
// browser. This is what makes the XSS -> account-takeover chain fire.
const puppeteer = require('puppeteer-core');

const PORTAL = process.env.TP_PORTAL || 'http://tollpay-web:4000';
const USER = process.env.TP_ADMIN_USER || 'toll-admin';
const PASS = process.env.TP_ADMIN_PASS || 'Adm1n_T0llP4y!';
const INTERVAL = parseInt(process.env.TP_INTERVAL || '25000', 10);
const CHROME = process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function waitForPortal() {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(PORTAL + '/health');
      if (r.ok) return;
    } catch {}
    await sleep(2000);
  }
  throw new Error('portal never came up');
}

// Log in as admin through the real UI so the httpOnly session cookie is set.
// The session cookie is the access token, which the API expires in 120s, so we
// call this again at the top of every review cycle to keep the admin logged in.
async function login(page) {
  await page.goto(PORTAL + '/', { waitUntil: 'networkidle2' });
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {}),
    page.evaluate((u, p) => {
      document.querySelector('input[name="username"]').value = u;
      document.querySelector('input[name="password"]').value = p;
      document.querySelector('form').dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    }, USER, PASS),
  ]);
  await sleep(1000);
}

async function main() {
  await waitForPortal();
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
  const page = await browser.newPage();
  console.log('[bot] admin reviewing tasks every', INTERVAL, 'ms');

  // Review loop: re-auth, then visit /tasks, which renders every stored task
  // body (the XSS sink). Re-login each cycle because the session expires in 120s.
  for (;;) {
    try {
      await login(page);
      await page.goto(PORTAL + '/tasks', { waitUntil: 'networkidle2' });
      await sleep(4000); // let any injected script run
    } catch (e) {
      console.log('[bot] review error:', e.message);
    }
    await sleep(INTERVAL);
  }
}

main().catch(e => { console.error('[bot] fatal:', e); process.exit(1); });
