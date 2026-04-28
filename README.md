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

TODO: Solution to be written at the end of workshop