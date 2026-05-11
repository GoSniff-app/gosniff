I need you to build a new PackMemberDetail component and modify MyPackList to use it. Read these files before writing any code:

1. gosniff-pack-member-detail-spec.md (the full spec for what we're building)
2. gosniff-round3-architecture.md (overall architecture, Firestore schema, design patterns)
3. components/MyPackList.js (the current pack list, which you'll be modifying)
4. components/MapView.js (reference only, for the slide-up sheet pattern and dog profile sheet styling)
5. lib/pack-context.js (the pack system functions you'll be calling)
6. lib/auth-context.js (for human document data like muted dog arrays)
7. app/globals.css (for CSS variables and existing styles)

Here's what needs to happen:

STEP 1: Create components/PackMemberDetail.js
- A slide-up sheet (same pattern as the dog profile sheet in MapView.js) that shows when you tap a pack member in MyPackList.
- Contents (top to bottom): close button, large dog photo, name (Fredoka font), breed/gender/age, size and energy chips, "Friends since [date]" from packLink.createdAt, current check-in status or "last seen" info, "Say Hi to [Dog]" message button, mute notifications toggle, and "Remove from Pack" text button at the bottom.
- The remove button triggers a confirmation dialog before calling removeFromPack().
- Match the existing visual style exactly (CSS variables, chip classes, font choices, color palette).

STEP 2: Modify components/MyPackList.js
- Remove the inline "Remove from pack" button and its confirmation dialog from each pack member row.
- Make each pack member row tappable. Tapping the row (except the chat icon) opens the PackMemberDetail sheet for that dog.
- The chat icon on each row should still open the conversation directly (don't change that behavior).
- Pending requests sections (accept/decline for received, cancel for sent) stay unchanged.

STEP 3: Wire up the mute toggle
- The mute toggle in PackMemberDetail should read from and write to mutedCheckInDogIds and mutedMessageDogIds arrays on the human document.
- Use a single toggle that controls both arrays for now.
- Use updateDoc with arrayUnion/arrayRemove (same pattern as frenemyDogIds in pack-context.js).
- If those arrays don't exist on the human document yet, arrayUnion will create them.

STEP 4: Wire up the "Say Hi" button
- Same logic as the chat icon on the pack list row and the "Say Hi to [Dog]" button on the map profile sheet. Check if a conversation exists (deterministic ID from sorted dog IDs), open it if yes, create it if no.

Do NOT modify MapView.js, pack-context.js, or auth-context.js unless absolutely necessary to support this feature. Keep changes scoped to MyPackList.js and the new PackMemberDetail.js.

After building, walk me through what you created and any decisions you made.
