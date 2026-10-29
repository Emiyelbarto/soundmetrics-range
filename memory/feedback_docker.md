---
name: Don't run docker compose commands
description: User handles all docker compose builds/restarts manually — never run them
type: feedback
---

Never run `docker compose` commands (build, up, down, restart). Only edit files. User will rebuild themselves.

**Why:** User preference — they want control over when containers are rebuilt.

**How to apply:** After any file edit, stop. Do not follow up with a docker compose command.
