---
name: Stale check-in sweep — DONE (deployed)
description: Stale check-ins ARE swept by a deployed scheduled Cloud Function. Do not rebuild this.
type: project
---
Stale check-ins are swept automatically. This is built and deployed — do not rebuild it.

**What handles it:** sweepStaleCheckIns, a deployed scheduled Cloud Function that runs every 5 minutes and resets check-ins older than 60 minutes. hourlyCleanup handles related Firestore cleanup. The architecture originally planned for this same job to also handle 24h message retention cleanup.

**How to apply:** Do not rebuild this or add client-side workarounds. If stale check-ins appear to misbehave, debug the existing sweepStaleCheckIns / hourlyCleanup functions rather than writing new ones. (Confirmed deployed June 2026; consistent with the "Auto-checkout timing" entry in DECISIONS.md.)