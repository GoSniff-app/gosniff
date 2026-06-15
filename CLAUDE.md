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

## Commands
- App dev server: `npm run dev` (Next.js, http://localhost:3000).
- Production build / serve: `npm run build` / `npm start`.
- There is NO test framework and NO linter configured (root scripts are only dev/build/start).
  Do not assume Jest/ESLint exist. To sanity-check a function file before deploy:
  `cd functions && PATH="/opt/homebrew/opt/node@22/bin:$PATH" node --check index.js`
- Deploy all functions: `PATH="/opt/homebrew/opt/node@22/bin:$PATH" firebase deploy --only functions`
- Deploy ONE function (preferred — faster, safer): append `:name`, e.g.
  `... firebase deploy --only functions:getVisibleDogs`
- Deploy Firestore rules / indexes: `firebase deploy --only firestore:rules` (or `firestore:indexes`).

## Architecture
- Single-page PWA. `src/app/page.js` is the only real screen: it nests the providers
  `AuthProvider > PackProvider > AlertsProvider > ChatProvider`, then renders `SignIn`
  (logged out) or `MapView` (logged in). The only other routes are `/forgot-password`
  and `/reset-password`. `MapView.js` holds most of the UI (map, pins, check-in, profile
  sheets, pack, chat entry).
- App state lives in four context providers in `src/lib/`, each owning realtime Firestore
  listeners (this is the source of truth, not component state):
  - `auth-context.js` — Auth user + the user's `dogs`. `dogs[0]` is the primary dog ("myDog").
    Owns check-in/out writes.
  - `pack-context.js` — `packLinks` (mutual friendships), `packRequests` (pending invites),
    and `frenemyDogIds` (private one-way "avoid" list stored on the human doc; NOT a block,
    and NOT a visibility filter).
  - `alerts-context.js` — map alerts. `chat-context.js` — conversations + unread counts.
- Backend is one file: `functions/index.js` (Firebase Functions **v2**, except the single v1
  auth trigger). Grouped by role: scheduled (`sweepStaleCheckIns`, `hourlyCleanup`); FCM pushes
  (`sendCheckInNotification`, `sendMessageNotification`, `sendPackRequestNotification`);
  callables (`getVisibleDogs`, plus the custom reset trio `sendPasswordResetEmail` /
  `verifyResetCode` / `confirmPasswordResetWithCode`); auth trigger `sendWelcomeEmail`;
  HTTP `testEmailSend`. All run in `us-central1`.

## Data model (Firestore)
- `dogs/{id}`: `name` (display name), `humanIds[]` (owner uid is `[0]`), `checkedIn`,
  `checkedInAt` (location NAME string, not coords), `checkedInLocation` ({lat,lng}),
  `checkedInTime`, `visibilityOnCheckIn` (`'everyone'` | `'friends'`). Location is raw
  lat/lng only — no geohash/geo index.
- `humans/{uid}`: `fcmTokens[]` (array of `{ token }` objects), `frenemyDogIds[]`,
  `mutedCheckInDogIds[]`, `mutedMessageDogIds[]`, `unreadCounts{}`.
- `packLinks/{id}`: `dogIds` and `humanIds` are each a 2-element SORTED array (so the doc is
  queryable from either side). `packRequests/{id}`: `from/toDogId`, `from/toHumanId`, `status`.
- `conversations/{id}/messages/{id}`: messages subcollection; `readAt` timestamp (null = unread).
  Conversation id = the two dog ids sorted and joined with `_`.
- `mail/{id}`: writing a doc here SENDS email via the SendGrid Trigger Email extension — never
  call SendGrid directly. `passwordResetCodes/{code}`: custom reset codes, consumed (deleted)
  only on final submit by `confirmPasswordResetWithCode` (not on page load — survives email
  link-scanners).

## Conventions discoverable only by reading across files
- Other dogs on the map come from the `getVisibleDogs` callable on a poll (interval set in
  `MapView.js`), NOT a direct Firestore read — this is the server-side enforcement of the
  "Friends Only" boundary above. The user's OWN dog still renders in realtime from auth-context,
  so it never waits for the poll.
- FCM pushes follow one shape: `title` = the dog/sender name, `body` = the action; send to every
  token in `humans/{uid}.fcmTokens`; prune any token that returns
  `messaging/registration-token-not-registered`.
- The lock-screen notification "source" / app name comes from `src/app/layout.js` metadata
  (`appleWebApp.title`); there is no web manifest file.
