# GoSniff Round 3: Architecture Plan
## Friends/Pack System + Visibility Toggles

---

## What We're Building (and Why the Order Matters)

Round 3 adds two features that are deeply intertwined:

1. **Visibility toggles on check-in** ("Visible to Everyone" vs "Visible to Friends Only")
2. **Friends/pack system** (mutual friend requests so "friends only" actually means something)

You can't ship one without the other. A "Visible to Friends Only" button with no way to add friends is a dead button. A friends system with no privacy payoff feels like busywork. They ship together.

---

## Current State (What We Have Now)

### Firestore Collections

```
humans/
  {uid}
    - email
    - createdAt

dogs/
  {dogId}
    - name, photoURL, breed, size, energy, gender, age
    - humanIds: [uid, ...]
    - checkedIn: boolean
    - checkedInAt: string (location name)
    - checkedInLocation: { lat, lng }
    - checkedInTime: timestamp
    - privacyZone: "checked-in" | "browsing" | "offline"
```

### Current Visibility Logic (MapView.js, line 116)

```javascript
const q = query(collection(db, 'dogs'), where('checkedIn', '==', true));
```

This query fetches ALL checked-in dogs. No filtering, no privacy zones. Every checked-in dog is visible to every user. The `privacyZone` field exists on the dog document but nothing reads it yet.

### Current Auth Context (auth-context.js)

Handles: auth, dog CRUD, check-in/out, account deletion. All in one file (about 175 lines). Still manageable, but adding friends logic here would push it past the tipping point.

---

## The Architecture Decision: Where Does Friends Logic Live?

### Option A: Cram It Into auth-context.js (Don't Do This)

This is what "vibe coding" would do. Just keep adding functions to the one context file. It's the fastest path to the Reddit post you just shared.

### Option B: Separate Context for Social Features (Do This)

Create a new `social-context.js` (or `pack-context.js` to stay on brand) that handles:
- Friend requests (send, accept, decline, cancel)
- Friends list (who is in my pack)
- Blocking (already specced but not built)
- Visibility filtering (which dogs should I see on the map)

**Why this is better:** auth-context stays focused on auth and dog profile CRUD. Pack context handles all the social graph stuff. MapView imports from both. Each file has one job.

---

## New Firestore Collections

### `packRequests/` (Friend Requests)

```
packRequests/
  {requestId}  (auto-generated)
    - fromDogId: string       (the dog sending the request)
    - toDogId: string         (the dog receiving the request)
    - fromHumanId: string     (human behind the sending dog)
    - toHumanId: string       (human behind the receiving dog)
    - status: "pending" | "accepted" | "declined" | "blocked"
    - message: string | null          (optional note sent with request, e.g. "Wanna sniff butts sometime?")
    - createdAt: timestamp
    - respondedAt: timestamp | null
```

**Why store both dogId AND humanId?**
- Dog IDs are the public identity (what you see on screen)
- Human IDs are needed for blocking (block the human, not just one dog)
- When someone accepts a pack request, we need both to build the relationship

**Why a separate collection instead of an array on the dog document?**
- Firestore arrays don't support querying "show me all pending requests TO this dog" efficiently
- A separate collection lets us query both directions (sent and received)
- Easier to add metadata later (request message, mutual friends count, etc.)

### `packLinks/` (Confirmed Friendships)

```
packLinks/
  {linkId}  (auto-generated)
    - dogIds: [dogId1, dogId2]        (sorted alphabetically for consistent querying)
    - humanIds: [humanId1, humanId2]  (sorted alphabetically)
    - createdAt: timestamp
```

**Why a separate collection instead of storing friends as an array on the dog?**

This is the big architecture decision. Here's the tradeoff:

| Approach | Pros | Cons |
|----------|------|------|
| Array on dog doc (`friends: [id1, id2, ...]`) | Simpler reads, fewer queries | Firestore limits array-contains queries to one per compound query. Can't ask "show me dogs that are checked in AND are my friend" in a single query. Also, arrays get unwieldy past ~100 items. |
| Separate `packLinks` collection | Clean queries, scales well, easy to add metadata | Extra read on load, slightly more complex code |

**Recommendation: Separate collection.** Here's why:

For a pilot with 10-20 users, either approach works. But the array approach creates a dead end: once you need to filter the map by "friends only," you'd have to fetch ALL checked-in dogs, then client-side filter against the friends array. That means downloading every checked-in dog's data even when you only want to see friends. With a separate collection, you can fetch your friend list once on load, cache it, and use it to filter efficiently.

---

## Pack Request Rules (Updated May 15, 2026)

Three actions on a received pack request: **Accept / Decline / Block**

- **Decline** = "not right now." The sender CAN send another request later. This is not permanent.
- **Block** = permanent. Prevents all future pack requests from that dog/human. Unblock option available in Blocked Dogs list.
- **Accept** = adds to pack, unlocks messaging.

**Key behavior details:**
- Blocking does NOT hide the blocked dog from the map. The user may want to see them to avoid them, or add them to their Frenemy list.
- Unblocking is always available from the Blocked Dogs list.
- A declined request can be resent by the original sender (no cooldown period for now).

### Sending a Pack Request with a Note

When sending a pack request, the user can include an optional message (like LinkedIn connection requests). This makes the request feel personal instead of random.

- Message field placeholder text: "Wanna sniff butts sometime?"
- Message is stored as `message` field on the packRequests document (string | null).
- The message is shown to the recipient alongside the request in the Pending Requests list.

### Non-Pack Dog Communication

- Non-pack dogs CANNOT message you directly (no cold messaging to strangers).
- The only way a non-pack dog can contact you is by sending a pack request with a note.
- Messaging only unlocks once both sides have accepted the pack request.

### Blocking from Messages (Future)

When messaging is opened to non-pack dogs (future feature), blocking and deleting conversations are separate actions:
- **Block** = prevents future pack requests and messages. Does NOT hide from map.
- **Delete conversation** = removes the message thread.
- **Unblock** = available from Blocked Dogs list.

### UI Layout in Hamburger / My Pack

```
[dog photo] Dog Name
            Breed
---
Edit Profile
Blocked Dogs (2)       <-- NEW, above My Pack
My Pack (3)
  Pending Requests     <-- at top of My Pack
  Requests Sent        <-- below Pending Requests
  Pack Members         <-- below Requests Sent
Sign Out
```

- Blocked Dogs list sits above My Pack in the hamburger menu
- Inside My Pack: Pending Requests at top, then Requests Sent, then pack members
- Red badge dot on menu still exists as a quick indicator, but the Pending Requests list is the primary way users manage incoming requests
- Each pending request shows: dog photo, dog name, the optional message, and three buttons (Accept / Decline / Block)

### Updated `dogs/` Document (New Fields)

```
dogs/
  {dogId}
    - (all existing fields)
    - visibilityOnCheckIn: "everyone" | "friends"   (NEW: default "everyone")
```

That's it. One new field on the dog document. The visibility toggle sets this field at check-in time.

---

## How Visibility Filtering Actually Works

This is the core logic change. Here's the flow:

### Current Flow (Round 2)
```
User opens map
  -> Query: all dogs where checkedIn == true
  -> Display all results on map
```

### New Flow (Round 3)
```
User opens map
  -> Fetch my pack list (one-time, cached in context)
  -> Query: all dogs where checkedIn == true
  -> Client-side filter:
       - If dog.visibilityOnCheckIn == "everyone" -> show on map
       - If dog.visibilityOnCheckIn == "friends" -> show ONLY if dog.id is in my pack list
       - Always show my own dog
  -> Display filtered results on map
```

**Why client-side filtering instead of a Firestore query?**

Firestore can't do: `where('checkedIn', '==', true) AND (where('visibility', '==', 'everyone') OR where('dogId', 'in', myFriendsList))`. Firestore doesn't support OR queries across different fields like that. So we fetch all checked-in dogs (same query as now) and filter on the client. For a pilot group of 10-20 people, this is perfectly fine. At scale (1000+ concurrent check-ins), you'd move to a cloud function or a different database. But that's a problem for after you have funding.

---

## New File Structure

```
lib/
  auth-context.js        (EXISTING - no changes needed)
  pack-context.js        (NEW - friends/pack system)
  firebase.js            (EXISTING - no changes needed)

components/
  MapView.js             (MODIFIED - add visibility filtering, add "Add to Pack" button)
  EditProfile.js         (EXISTING - no changes needed)
  JoinThePack.js         (EXISTING - no changes needed)
  SignIn.js              (EXISTING - no changes needed)
  PawLogo.js             (EXISTING - no changes needed)
  PackRequestBadge.js    (NEW - notification dot for pending requests)
  MyPackList.js          (NEW - view your pack, manage requests)
```

### pack-context.js (New File - What It Contains)

```
PackProvider (wraps app alongside AuthProvider)

State:
  - myPack: []              (list of friend dog IDs, loaded once on auth)
  - pendingReceived: []     (incoming pack requests)
  - pendingSent: []         (outgoing pack requests)
  - blockedDogIds: []       (dogs this user has blocked)

Functions:
  - sendPackRequest(fromDogId, toDogId, message?)
  - acceptPackRequest(requestId)
  - declinePackRequest(requestId)
  - blockDog(requestId)
  - unblockDog(dogId)
  - cancelPackRequest(requestId)
  - removeFromPack(linkId)
  - isInMyPack(dogId) -> boolean
  - isBlocked(dogId) -> boolean
  - getPackRequestStatus(dogId) -> "none" | "sent" | "received" | "accepted" | "blocked"
```

---

## UI Changes

### Check-In Panel (MapView.js)

When the user taps "We're Here!" and the check-in panel opens, two things happen:

**1. Saved spots:** If the user has checked in near this location before, show their previous name(s) as quick-tap buttons above the text input:

```
Your spots nearby:
[ The Pond at McLaren Park ]  [ Big Dog Area ]

Or type a new name:
[________________________________]
```

Tapping a saved spot fills the input instantly. The user can still edit it or type something completely new. If there are no saved spots nearby, this section doesn't appear and the flow works exactly as it does now (reverse geocode suggestion + editable text field).

**How saved spots work in Firestore:**

```
humans/
  {uid}
    - savedSpots: [
        { name: "The Pond at McLaren Park", lat: 37.7183, lng: -122.4573 },
        { name: "Big Dog Area", lat: 37.7191, lng: -122.4580 },
        ...
      ]
```

Stored on the human document as an array. When checking in, the app compares the user's current GPS coordinates against saved spots and shows any within ~0.25 miles. New spots are saved automatically after check-in (deduplicated by proximity, so checking in at the same park with a slightly different GPS reading doesn't create a duplicate).

Cap at ~20 saved spots per user to keep the document size reasonable. Oldest or least-used spots drop off if the cap is hit.

**2. Visibility toggle:** Below the location name, add two toggle buttons:

```
[ Visible to Everyone ]  [ Friends Only ]
         (selected)         (unselected)

Default: "Visible to Everyone"
```

If user selects "Friends Only" and has zero friends, show a gentle nudge:
"You don't have any pack members yet! Check in as visible to everyone, or tap a dog on the map to add them to your pack."

### Dog Profile Sheet (when tapping a pin on the map)

Add a button below the dog's info:

```
Current:    [ Say Hi to {name} ]  (placeholder, alerts "coming soon")
New:        [ Add to My Pack ]    (or "Pending..." or "In Your Pack" based on status)
```

Button states:
- No relationship: "Invite to Your Pack" (teal, tappable) — opens message field with placeholder "Wanna sniff butts sometime?"
- Request sent: "Pack Request Sent" (gray, with Cancel option)
- Request received: "Accept Pack Request" (teal) + "Decline" (gray) + "Block" (red/subtle)
- Already friends: "In Your Pack" (green checkmark, with option to remove)
- Blocked by you: "Blocked" (gray, disabled) — unblock available in Blocked Dogs list
- Previously declined: "Invite to Your Pack" (teal, tappable again — decline is not permanent)

### Menu Dropdown

Add "My Pack" menu item between "Edit Profile" and "Sign Out":

```
[dog photo] Dog Name
            Breed
---
Edit Profile
Blocked Dogs (2)   <-- NEW, above My Pack
My Pack (3)        <-- with count badge
Sign Out
```

### My Pack Screen (New Component)

List view organized in this order:
- **Pending Requests** (received) at the top — with Accept/Decline/Block buttons and the sender's optional message
- **Requests Sent** (outgoing) — with Cancel button
- **Pack Members** (confirmed friends) — with dog photo, name, breed, and "Remove from pack" option (with confirmation)

### Blocked Dogs Screen

Accessible from the hamburger menu above My Pack:
- Simple list of blocked dogs with photo, name, breed
- "Unblock" button on each entry
- Unblocking does NOT automatically send or accept a pack request — it just re-opens the door for future requests

---

## Firestore Security Rules (Important)

This is the part most vibe-coded apps skip entirely. For the pilot, the critical rules are:

```
packRequests:
  - Anyone authenticated can CREATE a request (fromHumanId must match their uid)
  - Cannot CREATE a request if recipient has blocked the sender
  - Only the recipient can UPDATE status to "accepted", "declined", or "blocked"
  - Only the sender can DELETE (cancel) a pending request
  - Users can only READ requests where they are sender OR recipient

packLinks:
  - Only created by the system (when a request is accepted)
  - Users can only READ links where their humanId is in the humanIds array
  - Either party can DELETE (unfriend)

dogs:
  - The visibilityOnCheckIn field can only be set by the dog's own human
```

---

## Build Order (What to Code First)

This is the sequence that minimizes "broken in-between states" where half the feature works:

### Step 1: Create pack-context.js with Firestore queries
- Set up the PackProvider
- Implement sendPackRequest, acceptPackRequest, declinePackRequest
- Implement myPack list loading (real-time listener on packLinks)
- Wire up PackProvider in page.js alongside AuthProvider
- **Test with Firestore console** (manually create test data to verify queries work)

### Step 2: Build MyPackList.js component
- Show current pack members
- Show pending received requests with accept/decline
- Show pending sent requests with cancel
- Add "My Pack" to the dropdown menu in MapView

### Step 3: Add "Add to My Pack" button to dog profile sheet
- Show appropriate button state based on getPackRequestStatus()
- Wire up sendPackRequest on tap
- Handle the "request received" state (accept/decline inline)

### Step 4: Add visibility toggle to check-in panel
- Two toggle buttons: "Visible to Everyone" / "Friends Only"
- Pass selected visibility to checkIn function
- Store as visibilityOnCheckIn on the dog document

### Step 5: Update MapView filtering
- Load myPack from PackContext
- Filter nearbyDogs based on visibilityOnCheckIn + pack membership
- Always show own dog regardless of others' settings

### Step 6: Add PackRequestBadge to menu
- Small dot/number on the menu button when pending requests exist
- Count of pending received requests

---

## Community Alerts System

### Alert Types

Preset options (each with an icon/emoji):
- Coyote spotted
- Aggressive dog off leash
- Park ranger giving tickets
- Something stinky to roll in (this is the GoSniff personality showing up)
- Custom/other (user types their own description)

### Firestore Schema

```
alerts/
  {alertId}  (auto-generated)
    - type: "coyote" | "aggressive_dog" | "ranger" | "stinky" | "custom"
    - customText: string | null       (only if type is "custom")
    - location: { lat, lng }
    - locationName: string            (human-readable, e.g. "Dolores Park")
    - reportedByDogId: string
    - reportedByHumanId: string
    - createdAt: timestamp
    - expiresAt: timestamp            (createdAt + 30 minutes)
    - confirmCount: number            (starts at 0)
    - denyCount: number               (starts at 0)
    - confirmedByHumanIds: [uid, ...] (prevents double-voting)
    - deniedByHumanIds: [uid, ...]    (prevents double-voting)
    - active: boolean                 (false when expired or voted down)
```

### How Alerts Work

1. User taps a "Report Alert" button (visible when checked in)
2. Picks an alert type from the preset list (or types custom)
3. Alert is pinned to their current check-in location
4. Alert appears on the map for all users within browsing radius
5. Alert auto-expires after 30 minutes

### Waze-Style "Still There?" Confirmation

This is the mechanic that keeps alerts accurate without burdening the original reporter.

**When it triggers:** If you've been checked in for 10+ minutes and there's an active alert within ~0.5 miles of your location, and you haven't already voted on it, you get a prompt.

**The prompt:**
```
[coyote icon] Coyote spotted near Dolores Park
Reported 25 minutes ago

Still there?

[ Yes, still here ]    [ Nope, all clear ]
```

**What the votes do:**
- "Yes" increments `confirmCount` and resets `expiresAt` to 30 minutes from now (the alert gets a fresh lease on life)
- "Nope" increments `denyCount`
- If `denyCount` >= 3 OR `denyCount` > `confirmCount` (after at least 2 total votes), the alert is marked `active: false` and disappears from the map
- Each user can only vote once per alert (tracked by `confirmedByHumanIds` / `deniedByHumanIds` arrays)

**One prompt per alert per user.** No nagging. If you dismiss it without voting, it doesn't come back.

### Alert Display on Map

Alerts show as distinct markers (not dog pins). Each type gets its own icon so they're recognizable at a glance. Tapping an alert marker shows the details and the "Still there?" vote buttons if you haven't voted yet.

Alerts are visible to ALL users (not filtered by friends-only visibility). A coyote sighting is safety information that should reach everyone.

### Build Order for Alerts

This can be built in parallel with Steps 4-6 (it doesn't depend on the friends system):
- Create the alerts Firestore collection and schema
- Build the "Report Alert" button and type picker (only visible when checked in)
- Add alert markers to the map alongside dog pins
- Build the "Still there?" confirmation prompt logic
- Add a Firebase Cloud Function (or client-side check) to expire stale alerts

---

## Auto-Checkout with "Still Sniffing?" Prompt

### The Problem

Users forget to check out. In the pilot, dogs showed as checked in 6+ hours after leaving because the user closed their browser. The current client-side timer can't fire if the app isn't open.

### How It Works

**The 60-minute cycle:**

1. User checks in. A 60-minute countdown starts.
2. At **50 minutes**, the app shows a prompt:

```
Still sniffing around?

{Dog name} has been checked in for 50 minutes.

[ Yep, still here! ]    [ We're leaving ]
```

3. **"Yep, still here!"** resets the 60-minute timer back to zero. The cycle repeats.
4. **"We're leaving"** checks them out immediately.
5. **No response within 10 minutes** (i.e., the 60-minute mark is reached) auto-checks them out.
6. **Refreshing location** at any point also resets the 60-minute timer.

### Client-Side vs. Server-Side

The prompt and timer work client-side (in the browser). But if the user closes the browser entirely, the client-side timer dies. For that case, we need a **Firebase Cloud Function on a scheduled trigger** (runs every 5-10 minutes) that queries all checked-in dogs and checks out any whose `checkedInTime` is older than 60 minutes. This is the server-side safety net.

```
Cloud Function: sweepStaleCheckIns (runs every 5 minutes)
  - Query: all dogs where checkedIn == true
  - For each: if (now - checkedInTime) > 60 minutes, set checkedIn = false
```

### Implementation Notes

- The prompt should appear as an overlay on the map (similar to the alert "Still there?" prompt, but for your own check-in status)
- The prompt should be dismissable but persistent (if you swipe it away without answering, it comes back after a minute)
- The timer reset on location refresh is already in the architecture (Refresh Location button resets the clock)
- The `checkedInTime` field on the dog document is what both client and server use to calculate elapsed time

---

## Empty Map State

### The Problem

When someone opens GoSniff and nobody is checked in, they see an empty map. That's deflating, especially during the early pilot when usage is sparse. It makes the app feel dead and gives no reason to stay.

### The Solution

When zero dogs are checked in within the user's visible radius, show a friendly overlay on the map:

```
[GoSniff logo]

No dogs out right now

Be the first to check in, or check back later!

[number] dogs in your area have GoSniff
[number] check-ins here this week

[ We're Here! ]

[ Invite Your Dog Friends ]
```

The key stats ("X dogs in your area" and "X check-ins this week") prove the app isn't dead even when nobody's at the park right now. The check-in count requires a simple counter document in Firestore that increments on each check-in (no need to query historical data).

### Invite Your Dog Friends

The "Invite Your Dog Friends" button uses the browser's native Share API (on mobile, this opens the share sheet with iMessage, WhatsApp, email, etc.). On desktop, it copies a link to the clipboard.

**The share message:**

```
[Dog name] is on GoSniff! See which dogs are at the park right now and come hang out. [link]
```

The link points to the GoSniff landing page (or a referral URL if we want to track invites later).

**Where the invite button lives:**

1. **Empty map state** (primary placement, highest motivation moment)
2. **My Pack list** (secondary, a small "Invite friends" link at the bottom of the pack list)
3. **After check-in** (optional, a subtle "Invite friends to join you!" prompt that appears once after checking in, not every time)

**Implementation:** The Web Share API (`navigator.share()`) is supported on iOS Safari, Chrome Android, and most mobile browsers, which is where nearly all GoSniff usage will happen. Fallback for desktop: copy link to clipboard with a "Copied!" confirmation.

```javascript
async function handleInvite(dogName) {
  const shareData = {
    title: 'GoSniff - Dogs on the Map',
    text: `${dogName} is on GoSniff! See which dogs are at the park right now and come hang out.`,
    url: 'https://gosniff.app',  // or gosniff.com when acquired
  };
  if (navigator.share) {
    await navigator.share(shareData);
  } else {
    await navigator.clipboard.writeText(shareData.url);
    // show "Copied!" toast
  }
}
```

No backend needed for basic invites. If you want to track referrals later (who invited whom, for growth metrics in the pitch deck), you'd add a referral code to the URL and a simple Firestore document to log it. But that's a post-pilot optimization.

### Bonus: Recent Activity Line

If there were check-ins in the last 24 hours, show a single line above the CTA:

```
Last activity: 3 dogs at Dolores Park, 4 hours ago
```

This gives the user a sense of when people tend to be active and where, which is genuinely useful information.

### Firestore Schema Addition

```
stats/
  {areaId}  (could be a geohash or just "global" for the pilot)
    - totalDogs: number              (incremented on signup)
    - checkInsThisWeek: number       (reset weekly by a cloud function, or rolling 7-day count)
    - lastCheckIn: {
        dogName: string,
        locationName: string,
        time: timestamp
      }
```

For the pilot with 15 users in San Francisco, a single global stats document is fine. At scale you'd shard by geographic area.

---

## Frenemy Alert (Dog-Dog Conflict Prevention)

### The Problem

Not all dogs get along. A user might know from experience that their dog and another specific dog are a bad match (reactivity, resource guarding, bad history, whatever the reason). Right now there's no way to know if that dog is at the park before you show up and walk into a bad situation.

### How It Works

A private, one-way "avoid" list. You flag a dog as one yours doesn't get along with. The other user is never notified and never knows they're on your Frenemy Alert list. It's not blocking (you can still see each other, still be in each other's pack). It's a personal early warning system.

**Flagging a dog:** On the dog profile sheet (when you tap a pin), add a small option: "Frenemy Alert" (maybe behind a three-dot menu so it's not prominent). Tapping it adds that dog to your Frenemy Alert list with a simple confirmation: "Got it. We'll give you a heads-up if [dog name] is checked in somewhere you're heading."

**The warning:** When you tap "We're Here!" to check in, the app checks if any dogs on your Frenemy Alert list are currently checked in at that location (or nearby). If so, a warning appears before you finalize the check-in:

```
Heads up!

Rex is checked in at Dolores Park right now.
You have Rex on your Frenemy Alert list.

[ Check in anyway ]    [ Not today ]
```

"Check in anyway" proceeds with normal check-in. "Not today" cancels and returns to the map.

**Browsing mode:** When scrolling the map, dogs on your Frenemy Alert list could have a subtle visual indicator on their pin (maybe a small orange dot or outline) so you can see at a glance where they are without having to tap each pin.

### Firestore Schema

```
humans/
  {uid}
    - (existing fields)
    - frenemyDogIds: [dogId1, dogId2, ...]
```

Same pattern as `mutedDogIds`. Simple array on the human document. No new collections needed.

### Privacy

- Completely private. The other user is never notified.
- The avoid list is stored on the human document, not the dog document, so no one else can see it.
- No judgment language in the UI. It's "dog to avoid" not "bad dog" or "dangerous dog." Dogs have conflicts for all kinds of reasons and it's not always about aggression.
- This is separate from the community "aggressive dog off leash" alert, which is a public safety warning. The avoid list is personal and private.

### Why This Matters (Pitch Deck)

This feature only exists because GoSniff is built by a certified behavior consultant. A tech founder would build blocking. A dog behavior expert knows that two dogs can be individually wonderful and still be a terrible match for each other, and that the responsible thing is to help owners avoid those situations proactively rather than reactively. This is a real differentiator.

---

## What This Does NOT Include (Intentionally)

These are future features that are specced in the product doc but should NOT be part of this round:

- **Blocking** (blocks the human behind the dog). Important, but adds significant complexity to every query. Build it in Round 4 after friends/visibility is solid.
- **Multiple dogs per account check-in selection.** The "which dogs are you checking in with?" flow. Currently you just check in your one dog. Multi-dog is Round 4.

---

## Step 7: In-App Messaging (Pack Members Only)

This ships after Steps 1-6 are working. Messaging depends on the pack system (you only message pack members) and uses the same notification infrastructure as check-in alerts.

### What This Is (and Isn't)

This is walkie-talkie messaging, not an inbox. Short, contextual, in-the-moment: "be there in 10!" / "which entrance?" / "we're leaving, come now if you want to catch us." No group chats (yet), no media attachments, no read receipts, no threading. Dog-to-dog identity (messages show as coming from Biscuit, not from Sarah).

### Firestore Schema

```
conversations/
  {conversationId}  (deterministic: sorted dogId1_dogId2)
    - dogIds: [dogId1, dogId2]       (sorted alphabetically)
    - humanIds: [humanId1, humanId2] (sorted alphabetically)
    - lastMessage: string            (preview text)
    - lastMessageTime: timestamp
    - lastMessageFrom: dogId

conversations/{conversationId}/messages/
  {messageId}  (auto-generated)
    - fromDogId: string
    - text: string
    - createdAt: timestamp
```

**Why a deterministic conversation ID (sorted dogId1_dogId2)?**
When Biscuit wants to message Mochi, we need to check if a conversation already exists. If the ID is just `biscuit123_mochi456` (always sorted alphabetically), we can look it up directly without querying. No duplicates, no "which conversation is ours?" problem.

**Why messages as a subcollection instead of an array?**
Arrays in Firestore have a 1MB document size limit. A busy conversation would hit that eventually. Subcollections scale infinitely and can be paginated (load last 50 messages, then load more on scroll).

### Unread Count

```
humans/
  {uid}
    - (existing fields)
    - unreadCounts: { conversationId1: 3, conversationId2: 1, ... }
```

Store unread counts on the human document as a map. When a new message arrives, increment the count for that conversation. When the user opens the conversation, reset that conversation's count to 0. This avoids having to query every conversation's messages just to show a badge number.

### New Files

```
components/
  ChatList.js          (NEW - list of conversations with last message preview)
  ChatView.js          (NEW - single conversation, message bubbles, input)

lib/
  chat-context.js      (NEW - or add to pack-context.js if it stays small)
```

### How You Get to a Conversation

Three entry points:

1. **From the dog profile sheet:** The "Say Hi to Biscuit" button (currently a placeholder) opens or creates a conversation with that dog.
2. **From the My Pack list:** Each pack member has a message icon. Tap to open conversation.
3. **From a check-in notification:** "Biscuit just checked in at Dolores Park" notification includes a quick-reply option or a tap-to-message action.

### UI: Chat View

Simple, clean, mobile-first:
- Dog's photo and name in the header
- Message bubbles (your dog's messages on the right in teal, their dog's messages on the left in gray)
- Text input at the bottom with a send button
- Messages load newest-at-bottom, auto-scroll on new message
- No typing indicators, no "seen" receipts (keeps it simple)

### UI: Chat List (Inbox)

Accessible from the menu dropdown (new "Messages" item with unread badge):
- List of conversations sorted by most recent message
- Each row: dog photo, dog name, last message preview, timestamp
- Unread conversations have a bold name and a small dot indicator
- Tap a row to open that conversation

### Message Notifications

Uses the same infrastructure as check-in notifications (either SMS via Twilio or push notifications, depending on what we build for check-in alerts). When a new message arrives and the user isn't currently viewing that conversation, they get notified: "Biscuit: be there in 10!"

Respects the mute setting: if you've muted a dog's check-in notifications, that also mutes their message notifications. (Or we could make these separate toggles. For the pilot, bundling them is simpler.)

### Security Rules

```
conversations:
  - Users can only READ conversations where their humanId is in humanIds
  - Conversations are only CREATED when both parties are pack members
  - Users cannot DELETE conversations (messages persist)

messages (subcollection):
  - Users can only CREATE messages in conversations they belong to
  - fromDogId must match a dog owned by the authenticated user
  - Users can only READ messages in conversations they belong to
  - Messages cannot be edited or deleted (keeps it simple for now)
```

---

## Questions to Decide Before We Start Coding

1. **Default visibility for new check-ins:** "Visible to Everyone" makes sense for the pilot (you want people to see each other). But should we remember the user's last choice? If someone always checks in as "Friends Only," having to re-select every time is annoying.

2. **Can you see someone's profile if they checked in as "Friends Only" and you're not friends?** The product spec says friends-only dogs are invisible to non-friends. That means you can't even see them to send a pack request. This is the correct privacy behavior, but it means the only way to add someone to your pack is to see them while they're checked in as "visible to everyone" (or meet them in person and search by name, which we haven't built yet). For the pilot, this is probably fine since everyone knows each other.

3. **Pack request identity:** When you send a pack request, the other person sees it as dog-to-dog ("Biscuit wants to join your pack!"). But should we show any human info? For the pilot, probably not needed. At scale, you might want "Biscuit (sent by a mutual pack member's human)" or similar trust signals.

4. **Pack size limit?** Probably not needed for pilot, but worth thinking about. Dunbar's number for dogs is probably somewhere around 50 meaningful connections. No limit for now, revisit if someone tries to add 500 dogs.

---

## Estimated Scope

If we build this step by step in the order above:
- Step 1 (pack-context): The foundation. Most of the thinking is here.
- Step 2 (MyPackList): Straightforward UI component.
- Step 3 (Add to Pack button): Small change to existing dog profile sheet.
- Step 4 (visibility toggle): Small change to check-in panel.
- Step 5 (map filtering): Small change to existing MapView query logic.
- Step 6 (badge): Tiny UI addition.
- Community alerts: Can be built in parallel with Steps 4-6. New Firestore collection, alert markers on map, "Still there?" confirmation prompt. Moderate effort.
- Empty map state: Small effort. One overlay component, one stats document in Firestore.
- Step 7 (messaging): Moderate effort. Two new components (ChatList, ChatView), new Firestore collections, ties into notification infrastructure. Ships after Steps 1-6 are solid.

None of Steps 1-6 require touching auth-context.js. That file stays exactly as it is. All new social logic lives in pack-context.js. Alerts get their own lightweight context or live alongside pack-context. Messaging (Step 7) gets its own context or extends pack-context. This is the whole point of planning the architecture first.

---

*Ready to start with Step 1 when you are.*
