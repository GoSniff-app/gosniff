# GoSniff: In-App Messaging Architecture
## Step 7 of Round 3 — Full Build Plan

---

## What We're Building

Walkie-talkie messaging between pack members. Short, contextual, in-the-moment: "be there in 10!" / "which entrance?" / "we're leaving, come now if you want to catch us." Dog-to-dog identity throughout (messages show as coming from Biscuit, not from Sarah).

This ships after Round 3 Steps 1-6 (pack system, visibility toggles, community alerts) are working. Messaging depends on the pack system — you can only message dogs in your pack.

---

## What This Is NOT

- Not an inbox. It's a walkie-talkie.
- No group chats (future).
- No media attachments (future).
- No read receipts (maybe never).
- No typing indicators (maybe never).
- No message threading.
- No message editing or deleting by users.

---

## Key Decisions (All Confirmed)

### Pack-Only Messaging with Invite-with-a-Message Hybrid

You can only have full conversations with dogs in your pack. However, when you send a pack invite, you can attach a single introductory message. That message gets delivered with the invite and becomes the first message in the conversation if the invite is accepted.

**Non-pack-member sees:** "Invite to Your Pack" button on the dog profile sheet.
**Pack member sees:** "Say Hi to [Dog]" button on the dog profile sheet.
**Pending invite sees:** "Pack Invite Pending" button (disabled).
**Declined invite sees:** "Maybe they're just not that into you" (disabled, permanent).

### Pack Invite Rules

- **Pending:** Stays pending until the recipient acts on it. No cancel, no resend needed. The recipient gets a pop-up on app open so invites don't get buried.
- **Declined:** Permanent. No resend ever. Button shows "Maybe they're just not that into you."
- **Accepted:** Pack members, full messaging unlocked.

### Invite Message UX

When tapping "Invite to Your Pack," a text field appears with placeholder text: "Wanna sniff butts sometime?" (optional). The message is delivered with the pack request. The recipient's pop-up shows: "[Dog name] wants to join your pack!" with the message displayed below if one was attached. Accept / Decline buttons.

### Conversation Lifecycle

- **Pack membership ends (either side removes):** Conversation and all messages are fully deleted from Firestore. Disappears from both users' chat lists immediately. If they reconnect later, fresh start.
- **Intro message on acceptance:** The message attached to the pack invite becomes the first message in the new conversation, giving it immediate context.

### Message Retention

- Messages are deleted 24 hours after being read by the recipient.
- Unread messages persist indefinitely until the recipient opens the conversation.
- A `readAt` timestamp field on each message document tracks when the recipient read it.
- A nightly Firebase Cloud Function sweeps messages where `readAt` is more than 24 hours ago. This function also handles stale check-in sweeps (same scheduled job, two cleanup tasks).

### Message Limits

- 1000 character limit per message.
- No empty/whitespace-only messages.
- Subtle character count appears in the UI past 800 characters.
- Send button grays out at 1000 characters.

### Mute Toggles (Two Separate Toggles)

Check-in notifications and message notifications are independent:

- **Mute check-in notifications** (per dog, bell icon in My Pack list): Suppresses "Biscuit just checked in" push notifications and whistle sound.
- **Mute message notifications** (per dog, bell icon in ChatView header): Suppresses push notifications and squeaky toy sound for messages from that dog.
- In-app badges and dots always show regardless of mute status. Muting only controls push notifications and sounds.
- Muting is invisible to the other person. They have no idea they're muted.

**Data model:** Two arrays on the human document:
```
humans/
  {uid}
    - mutedCheckInDogIds: [dogId1, dogId2, ...]
    - mutedMessageDogIds: [dogId1, dogId2, ...]
```

### Notification Sounds

Two distinct in-app sounds (files go in `public/sounds/`):

- **message-notification.mp3** — Squeaky dog toy sound. Plays when a new message arrives and the user is NOT currently viewing that conversation (unless muted).
- **checkin-notification.mp3** — Short whistle sound (like calling a dog over). Plays when a pack member checks in (unless muted).

Both sounds are already trimmed and ready. They are royalty-free, no attribution required (sourced from Pixabay/freesound_community).

---

## Firestore Schema

### Conversations Collection

```
conversations/
  {conversationId}  (deterministic: sorted dogId1_dogId2)
    - dogIds: [dogId1, dogId2]       (sorted alphabetically)
    - humanIds: [humanId1, humanId2] (sorted alphabetically)
    - lastMessage: string            (preview text)
    - lastMessageTime: timestamp
    - lastMessageFrom: dogId
```

**Why a deterministic conversation ID (sorted dogId1_dogId2)?**
When Biscuit wants to message Mochi, we need to check if a conversation already exists. If the ID is just `biscuit123_mochi456` (always sorted alphabetically), we can look it up directly without querying. No duplicates, no "which conversation is ours?" problem.

### Messages Subcollection

```
conversations/{conversationId}/messages/
  {messageId}  (auto-generated)
    - fromDogId: string
    - text: string
    - createdAt: timestamp
    - readAt: timestamp | null    (null = unread, set when recipient opens conversation)
```

**Why messages as a subcollection instead of an array?**
Arrays in Firestore have a 1MB document size limit. Subcollections scale infinitely and can be paginated.

### Unread Counts

```
humans/
  {uid}
    - (existing fields)
    - unreadCounts: { conversationId1: 3, conversationId2: 1, ... }
```

Store unread counts on the human document as a map. When a new message arrives, increment the count for that conversation. When the user opens the conversation, reset that conversation's count to 0. This avoids having to query every conversation's messages just to show a badge number.

---

## New Files

```
components/
  ChatList.js          (NEW - list of conversations with last message preview)
  ChatView.js          (NEW - single conversation, message bubbles, input)

lib/
  chat-context.js      (NEW - all messaging logic, separate from auth-context and pack-context)

public/sounds/
  message-notification.mp3   (NEW - squeaky toy)
  checkin-notification.mp3   (NEW - whistle)
```

---

## Entry Points (How You Get to a Conversation)

Three ways to start or open a conversation:

1. **From the dog profile sheet:** "Say Hi to [Dog]" button (only visible for pack members) opens or creates a conversation with that dog.
2. **From the My Pack list:** Each pack member has a message icon. Tap to open conversation.
3. **From a check-in notification:** "[Dog] just checked in at [Location]" notification includes a tap-to-message action.

---

## UI Specifications

### ChatView (Single Conversation Screen)

Simple, clean, mobile-first:

- **Header:** Other dog's photo (circular) and name, back button, mute bell icon (toggles message mute for this dog)
- **Message bubbles:** Your dog's messages on the right in teal (`var(--gs-teal)`), their dog's messages on the left in gray (`var(--gs-gray-100)`)
- **Each bubble:** Message text + relative timestamp
- **Text input:** At the bottom with send button. Character count appears past 800 characters. Send button grays out at 1000 characters. Empty/whitespace-only sends prevented.
- **Auto-scroll:** Scrolls to newest message on load and when new messages arrive
- **Sound:** Plays `message-notification.mp3` when a new message arrives and the user is viewing a DIFFERENT conversation (not this one), unless this dog is in `mutedMessageDogIds`
- **No typing indicators, no "seen" receipts**

### ChatList (Inbox)

Accessible from the menu dropdown (new "Messages" item with unread badge):

- List of conversations sorted by most recent message
- Each row: dog photo (circular), dog name, last message preview (truncated), relative timestamp ("2m ago", "yesterday")
- Unread conversations: bold name + small teal dot indicator
- Tap a row to open ChatView for that conversation
- **Empty state:** Paw print icon, "[Dog's name]'s inbox is empty. Say hi to someone in your pack!" with a button linking to the My Pack list

### Pack Invite Pop-up (Recipient Side)

Shown on app open when the user has pending pack invites:

- "[Dog name] wants to join your pack!"
- If a message was attached: "[Dog name]: [their message]" shown below
- Accept / Decline buttons
- Multiple pending invites cycle through one at a time

### Dog Profile Sheet Button States

- **Pack member:** "Say Hi to [Dog]" (opens/creates conversation)
- **Not in pack, no pending invite:** "Invite to Your Pack" (opens invite flow with optional message field, placeholder: "Wanna sniff butts sometime?")
- **Pending invite sent:** "Pack Invite Pending" (disabled)
- **Previously declined:** "Maybe they're just not that into you" (disabled, permanent)

---

## Notification System

### In-App Notifications (Always Active)

- Unread count badge on "Messages" menu item
- Teal dot on unread conversations in ChatList
- Notification sounds (squeaky toy for messages, whistle for check-ins) unless muted

### Push Notifications (FCM)

- Firebase Cloud Messaging with service worker for background notifications
- **Pre-permission prompt** (shown at a natural moment, like after onboarding or first time opening Messages):
  - "GoSniff only notifies you about two things: when your dog friends are at the park, and when they message you. That's it. No ads, no spam."
  - "Turn On Notifications" button
  - "Not now" link (small, low-pressure)
- **"Not now" follow-up** (shown when they send their first message):
  - "Heads up: [Dog name] won't know you messaged until they open GoSniff. Turn on notifications so your dog friends can respond faster."
- **Push content:**
  - Messages: "[Dog name]: [message preview]"
  - Check-ins: "[Dog name] just checked in at [location]!"
- Respects both mute toggles (mutedCheckInDogIds and mutedMessageDogIds)

---

## chat-context.js Functions

```
getOrCreateConversation(myDogId, theirDogId)
  - Computes deterministic conversation ID (sorted dogId1_dogId2)
  - Checks if conversation document exists
  - Creates it if not (with dogIds and humanIds arrays)
  - Returns conversation data

sendMessage(conversationId, fromDogId, text)
  - Validates 1000 character limit
  - Validates non-empty (trims whitespace)
  - Writes to messages subcollection (fromDogId, text, createdAt, readAt: null)
  - Updates conversation document (lastMessage, lastMessageTime, lastMessageFrom)
  - Increments unread count on recipient's human document

subscribeToMessages(conversationId, callback)
  - Real-time Firestore listener on messages subcollection
  - Ordered by createdAt ascending (newest at bottom)

subscribeToConversations(humanId, callback)
  - Real-time listener on all conversations where humanId is in humanIds
  - Ordered by lastMessageTime descending

markConversationRead(conversationId, humanId)
  - Resets unread count for that conversation to 0 on the human document
  - Sets readAt timestamp on all unread messages in the conversation where fromDogId is NOT the current user's dog

deleteConversation(dogId1, dogId2)
  - Called when a pack link is removed
  - Deletes the conversation document and all messages in its subcollection

getTotalUnreadCount(humanId)
  - Sums all values in the unreadCounts map on the human document
  - Used for the badge number on the Messages menu item
```

---

## Firestore Security Rules

```
conversations:
  - Users can only READ conversations where their humanId is in humanIds
  - Conversations are only CREATED when both parties have an active pack link
  - Users cannot DELETE conversations directly (handled by pack removal logic)

messages (subcollection):
  - Users can only CREATE messages in conversations they belong to
  - fromDogId must match a dog owned by the authenticated user
  - Users can only READ messages in conversations they belong to
  - Messages cannot be edited or deleted by users (only by the nightly cleanup function and pack removal)
```

---

## Build Order

### Step 1: chat-context.js
The foundation. All messaging logic lives here. Create the context provider, all functions listed above, and the Firestore listeners.

### Step 2: ChatView.js
The single conversation screen. Message bubbles, text input, auto-scroll, character count, send validation.

### Step 3: ChatList.js
The inbox. Conversation list sorted by recency, unread indicators, empty state with paw print and link to pack list.

### Step 4: Menu integration + unread badge
Add "Messages" item to menu dropdown. Show total unread count as badge number. No badge if count is 0.

### Step 5: Entry points wired up
- Dog profile sheet: conditional button (Say Hi / Invite to Your Pack / Pack Invite Pending / Maybe they're just not that into you)
- My Pack list: message icon per pack member
- Pack invite flow: optional message field with "Wanna sniff butts sometime?" placeholder
- Pack invite pop-up on app open for recipients with pending invites
- Intro message carries over as first message in conversation on acceptance

### Step 6: Pack removal cleanup
When a pack link is removed (either side), call deleteConversation to remove the conversation document and all messages. Conversation disappears from both users' chat lists immediately.

### Step 7: Mute toggles
- Add mutedCheckInDogIds and mutedMessageDogIds arrays to human document
- Message mute toggle: bell icon in ChatView header
- Check-in mute toggle: bell icon in My Pack list
- In-app sounds respect message mute
- Badges/dots always show regardless of mute

### Step 8: In-app notification sounds
- Add message-notification.mp3 and checkin-notification.mp3 to public/sounds/
- Play squeaky toy on new message (if not viewing that conversation, if not muted)
- Play whistle on pack member check-in (if not muted)

### Step 9: FCM push notifications + pre-permission prompt
- Set up Firebase Cloud Messaging
- Create service worker for background notifications
- Build pre-permission prompt screen
- Build "Not now" follow-up nudge on first message send
- Push content formatting for messages and check-ins
- Respect both mute toggles

### Step 10: Message retention + Firestore security rules
- Nightly Cloud Function: delete messages where readAt is older than 24 hours
- Same function handles stale check-in sweeps
- Deploy Firestore security rules for conversations and messages collections

---

## What This Does NOT Include (Intentionally Deferred)

- Group chats
- Media attachments (photos, voice messages)
- Read receipts
- Typing indicators
- Message editing or deleting by users
- Twilio SMS fallback (add later if FCM adoption is low)
- Custom push notification sounds (requires native app, not possible in web app)
