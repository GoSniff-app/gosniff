---
name: Stale check-in sweep — known bug, deferred
description: Stale check-ins are not being swept; fix requires a Firebase Cloud Function. Do not fix inline.
type: project
---

Stale check-ins are not being swept from Firestore.

**Why:** Needs a Firebase Cloud Function (scheduled/nightly job) to sweep expired check-ins. The architecture notes this same function will also handle 24h message retention cleanup.

**How to apply:** Do not attempt to fix this inline or with client-side workarounds. When the Cloud Functions step comes up (Step 10 of messaging architecture), address both stale check-ins and message retention in the same scheduled job.
