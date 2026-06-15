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
Decision: Use Firebase Cloud Messaging push for check-in and message notifications. Not
SMS. Notification sounds: squeaky toy for messages, whistle for pack check-ins.
Reason: SMS cost and stack fit; FCM is already in the stack.
Status: Settled.

---

## 2026-06-14 — Auto-checkout timing
Decision: Auto-checkout at 60 minutes. Warning at 50 minutes ("Still sniffing around?").
Timer resets on location refresh.
Reason: Stale check-ins (users showing checked in hours after leaving) erode trust.
Status: Settled. (Open work, not a decision: a scheduled Cloud Function to sweep stale
check-ins when the browser is closed still needs to be built.)

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
