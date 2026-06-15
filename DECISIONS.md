# GoSniff — Decisions Log

Settled decisions and why. Anything marked DO NOT CHANGE should not be reopened without
explicit approval. The date on each entry is when it was logged here; where the decision
was actually made earlier, that is noted in the body.

Ren: I seeded this from our project history. Please review and correct anything I
misremembered, and fix any dates you know precisely.

---

## 2026-06-14 — Two products stay fully separate
Decision: GoSniff and GoDogPro are independent. Separate Firebase projects, billing, APIs,
repos, and credentials. GoSniff's Firebase project is gosniff415.
Reason: Keeps each business clean, avoids cross-contamination of data and costs.
Status: DO NOT CHANGE.

---

## 2026-06-14 — Core stack
Decision: Next.js / React PWA on Vercel (auto-deploy from GitHub main). Firebase for Auth,
Firestore (us-west2), Cloud Functions (us-central1), FCM. Google Maps JavaScript API.
Reason: Already built and working; non-technical founder needs a stable, known stack.
Status: DO NOT CHANGE without a new entry.

---

## 2026-06-14 — Password reset uses the custom SendGrid flow, not native Firebase
Decision: The only reset path is the custom flow: in-app "Forgot password?" link ->
/forgot-password page -> sendPasswordResetEmail Cloud Function -> SendGrid email ->
/reset-password?code= page that consumes the single-use code only on final submit.
The native Firebase sendPasswordResetEmail path is deliberately NOT used.
Reason: The native firebaseapp.com handler breaks for Yahoo and similar providers, whose
link scanners open the link and burn the single-use code before the user clicks. Our
custom page does not spend the code on page load, so it survives scanners. Confirmed
working end-to-end on 2026-06-08.
Status: DO NOT CHANGE. Do not wire the native reset path back into any button. The orphaned
native code (resetPassword in auth-context.js, its import, and the oobCode branch in
reset-password/page.js) is dead and may be deleted during a future cleanup pass.
2026-06-14 audit confirmed the only reachable path is the custom flow: SignIn links to
/forgot-password; nothing calls resetPassword() in auth-context.js; the oobCode branch is
unreachable because no in-app code sends a native email. Dead-code removal targets when
cleaned up: resetPassword + its sendPasswordResetEmail import in auth-context.js, and the
oobCode branch in reset-password/page.js.

---

## 2026-06-14 — Email sender
Decision: Send from ren@godogpro.com as a verified single sender in SendGrid. Full domain
authentication for gosniff.app is deferred.
Reason: Domain auth proved unstable (SendGrid regenerates the em-prefix when sender
profiles are deleted, breaking the Namecheap DNS records). Single sender is reliable for
the pilot. Revisit domain auth only if real Yahoo users report missing emails.
Status: Settled for now. Do not delete/recreate sender profiles casually.

---

## 2026-06-14 — Privacy posture
Decision: The dog is the public identity. Human accounts are private by design. Location
attaches to named places rather than raw GPS wherever possible.
Reason: Core product principle and trust promise.
Status: DO NOT CHANGE.

---

## 2026-06-14 — Friends Only filtering is server-side
Decision: "Meet New Dogs" / "Friends Only" visibility. Toggle asks every check-in, default
"Meet New Dogs," no remembered preference. Friends-Only filtering MUST be enforced
server-side.
Reason: Client-side filtering leaks private check-ins (flagged by tester Aaron).
Status: DO NOT CHANGE the server-side requirement.

---

## 2026-06-14 — Pack / friends model
Decision: Mutual dog-to-dog requests. Firestore uses separate packRequests and packLinks
collections (not arrays on dog docs). Social logic lives in pack-context.js, separate from
auth-context.js. "Pack" is used sparingly as a fun label only.
Reason: Clean data model; pack theory is outdated in dog behavior science, so it is not the
organizing metaphor.
Status: DO NOT CHANGE the data model without a new entry.

---

## 2026-06-14 — Messaging architecture
Decision: Pack-only, dog-to-dog identity. Deterministic conversation IDs (sorted
dogId1_dogId2). Messages in a Firestore subcollection. Unread counts as a map on the human
document. Conversations are fully deleted (not frozen) when a pack link ends. Messages
auto-delete 24 hours after they are read. 1000-character limit per message.
Reason: Settled in the messaging architecture doc.
Status: DO NOT CHANGE without a new entry.

---

## 2026-06-14 — Mute model
Decision: Two separate arrays on the human document: mutedCheckInDogIds and
mutedMessageDogIds. Muting is invisible to the other person. In-app badges/dots always
show; mute only silences push notifications and sounds.
Reason: Lets users quiet noise without unfriending or signaling it.
Status: DO NOT CHANGE.

---

## 2026-06-14 — Notifications are FCM push, not SMS
Decision: Use Firebase Cloud Messaging push for check-in, message, and pack-request
notifications. Not SMS. Notification sounds: squeaky toy for messages, whistle for pack
check-ins. (Pack-request push detail: see the 2026-06-14 sendPackRequestNotification entry.)
Reason: SMS cost and stack fit; FCM is already in the stack.
Status: Settled.

---

## 2026-06-14 — Auto-checkout timing
Decision: Auto-checkout at 60 minutes. Warning at 50 minutes ("Still sniffing around?").
Timer resets on location refresh.
Reason: Stale check-ins (users showing checked in hours after leaving) erode trust.
Status: Settled. The scheduled sweep now EXISTS: `sweepStaleCheckIns` (v2 `onSchedule`,
us-central1, every 5 minutes) resets dogs checked in longer than 60 minutes, and
`hourlyCleanup` handles related Firestore hygiene. The earlier "still needs to be built"
note is resolved.

---

## 2026-06-14 — Photo storage migration is required before scale
Decision: Base64 dog photos stored in Firestore are acceptable for the small pilot, but
must migrate to Cloud Storage before scaling.
Reason: Base64 blobs in Firestore do not scale (document size, read cost).
Status: Principle is settled; the migration itself is open work.

---

## 2026-06-14 — UI naming
Decision: Use "Sign Out" consistently (matches the hamburger menu). Visibility labels are
"Meet New Dogs" and "Friends Only."
Reason: Consistency.
Status: Settled.

---

## 2026-06-14 — Map sources other dogs from getVisibleDogs (server-side), polled
Decision: The map no longer reads the `dogs` collection directly for other dogs. Other
checked-in dogs come from the `getVisibleDogs` callable (us-central1), which applies
Friends-Only vs Meet-New-Dogs filtering on the server and returns
`{ dogs: [ { id, ...dogData } ] }` — only dogs the caller may see. MapView stores the result
in the same state the markers render from and does NOT re-apply any client-side visibility
filter (re-filtering could double-hide a friends-only dog the server legitimately returned).
Because a callable is one-shot, MapView polls it: once on mount, then on a repeating interval.
The user's OWN dog is NOT sourced from getVisibleDogs — it renders in realtime from
auth-context so the user always sees themselves immediately.
Reason: Implements the server-side Friends-Only requirement. The old client-side
`visibilityOnCheckIn === 'friends'` filter sent every checked-in dog (including private ones)
to every device and only hid them in the UI — a real location-privacy leak (flagged by tester
Aaron).
Status: DO NOT CHANGE the server-side sourcing — do not restore a direct Firestore read of
other dogs, and do not reintroduce client-side visibility filtering. TUNABLE without a new
entry: the poll interval (currently 10s in MapView.js; was briefly 20s). Tradeoff: other dogs
can lag up to one interval, and each open client calls getVisibleDogs once per interval.

---

## 2026-06-14 — Pack requests send an FCM push (sendPackRequestNotification)
Decision: When a `packRequests` document is created, the Cloud Function
`sendPackRequestNotification` (v2 `onDocumentCreated`, us-central1) sends an FCM push so the
recipient is notified even when the app is closed. It reads `toHumanId` from the request and
goes straight to `humans/{toHumanId}` for the `fcmTokens` (no dog->human hop). Title = sending
dog's `name`; body = "wants to join your pack! 🐾". Webpush link is the generic app link (no
dedicated pending-requests route exists; the in-app `pendingReceived` listener surfaces it on
open). Quiet return if the human doc is missing or has no tokens; stale tokens pruned as in the
other notification functions. A guard returns quietly when `fromHumanId === toHumanId` (a human
with two dogs could otherwise notify themselves — the UI only blocks the primary dog). No mute
support (there is no mute list for pack requests).
Reason: Before this, a closed phone got nothing — the recipient only saw a request if the app
was open.
Status: DO NOT CHANGE without a new entry. Deploy is manual via the Node 22 prefix
(`firebase deploy --only functions:sendPackRequestNotification`).
