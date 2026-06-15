# CLAUDE.md — GoSniff

You are working on GoSniff, a long-running real project. Assume your memory of it is
incomplete. Do not rely on previous chats. The files in this repo, plus DECISIONS.md,
are the source of truth.

## Before making any non-trivial change
1. Read this file (CLAUDE.md).
2. Read DECISIONS.md.
3. Read the files directly relevant to the area being changed.
4. Tell me how the proposed change fits the existing architecture.
5. Do not reopen anything marked DO NOT CHANGE in DECISIONS.md unless I explicitly say so.

## Working rules
- Reuse existing patterns before inventing new ones.
- Do not add new frameworks, libraries, or architectural patterns without my approval.
- Do not duplicate functionality that already exists; search first.
- Keep changes localized to the area being worked on.
- Preserve established naming and file structure.
- If you are unsure, ask instead of guessing.
- Treat DECISIONS.md as authoritative.

## How I work (I am a non-technical founder)
- Give me one terminal command at a time. Wait for me to confirm it worked before the next.
- Never leave placeholder text in a command I am meant to run. Fill in real values.
- Deploy flow for app code: `git add -A && git commit -m "..." && git push`
  (Vercel auto-deploys the `main` branch).

## Stack (do not change without a DECISIONS.md entry)
- Next.js / React PWA, deployed on Vercel from GitHub `main`.
- Firebase project: gosniff415. Firestore region us-west2. Cloud Functions us-central1.
- Auth, Firestore, Cloud Functions, FCM. Google Maps JavaScript API + Geocoding API.
- Email: SendGrid via the Firebase Trigger Email from Firestore extension.

## Hard-won gotchas (these break repeatedly — respect them)
- Firebase CLI deploys MUST use Node 22. Node 25 breaks the CLI. Use:
  `PATH="/opt/homebrew/opt/node@22/bin:$PATH" firebase deploy --only functions`
- If `functions/node_modules` is corrupted, deploy hangs at "Serving at port [X]". Fix:
  `rm -rf node_modules && PATH="/opt/homebrew/opt/node@22/bin:$PATH" npm ci`
- `serverTimestamp()` cannot be nested inside `arrayUnion()` in the modular SDK.
  Use `Date.now()` instead.
- In MapView.js, declare ALL React hooks (useRef, useEffect, useCallback) before any
  early return, or React throws error #310.
- Google Maps creates its own high-z-index stacking context. The app header must use
  `position: fixed` with z-index >= 10001 to stay above it.
- Vercel env vars prefixed `NEXT_PUBLIC_` must be created as NON-sensitive, or they will
  not embed client-side. No trailing newlines (they cause auth failures).

## Absolute boundaries
- GoSniff and GoDogPro are SEPARATE projects. Never cross-wire their Firebase projects,
  billing, APIs, repos, or credentials. Do not touch anything GoDogPro.
- "Friends Only" visibility filtering must be enforced SERVER-SIDE. Client-side filtering
  is a real privacy hole.

## Project map
<!-- Run /init in Claude Code to auto-generate the file map, build commands, and
     conventions from the actual codebase, then trim it to the essentials here. -->
