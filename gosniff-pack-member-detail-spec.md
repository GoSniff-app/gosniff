# GoSniff: Pack Member Detail View

## Architecture Spec for Claude Code

This replaces the current "Remove from pack" button on the MyPackList row. The delete action (and all per-dog pack actions) move into a detail sheet that opens when you tap a pack member.

---

## What's Changing

### Current Flow (MyPackList.js)

```
My Pack list
  -> Each row: dog photo, name, breed, chat icon, tiny Remove button
  -> Tap Remove -> confirmation dialog -> removes pack link
```

### New Flow

```
My Pack list
  -> Each row: dog photo, name, breed, chat icon (NO delete button)
  -> Tap anywhere on the row (except chat icon) -> opens PackMemberDetail sheet
    -> Shows full dog info + relationship info + actions
    -> "Say Hi to [Dog]" message button
    -> Mute toggle
    -> "Remove from Pack" at the bottom (with confirmation)
```

---

## MyPackList.js Changes

Remove the "Remove from pack" button and its confirmation dialog from each pack member row. The row becomes a simple tappable card:

```
[ dog photo ]  Dog Name              [ chat icon ]
               Breed
```

- Tapping the row (anywhere except the chat icon) opens the PackMemberDetail overlay/sheet.
- Tapping the chat icon still opens the conversation directly (existing behavior).
- Pending requests section (accept/decline, cancel) stays unchanged.

---

## New Component: PackMemberDetail

This is a slide-up sheet or modal (same pattern as the dog profile sheet on the map). It receives the pack member's dog data and the packLink document.

### Layout (top to bottom)

**1. Header area**

- Close button (X) in the top-right corner
- Dog photo (larger than the list row, around 80-100px, rounded)
- Dog name (Fredoka font, large)
- Breed, gender, age on one line below the name

**2. Personality chips**

- Size chip and energy label chips (same style as the map's dog profile sheet)

**3. Relationship info**

- "Friends since [date]" pulled from the packLink's `createdAt` timestamp
- Format as a friendly relative or absolute date (e.g., "Friends since March 2026" or "Friends since Mar 12, 2026")

**4. Last seen (conditional)**

- If the dog is currently checked in: show "Sniffing around at [locationName]" in green with a green dot indicator
- If the dog has a recent check-in (within the last 7 days) but is not currently checked in: show "Last seen at [locationName], [relative time]" in gray (e.g., "Last seen at McLaren Park, 2 days ago")
- If no recent check-in or no check-in data at all: don't show this section

**Note on "last seen" data:** The current Firestore schema stores `checkedInAt` (location name), `checkedInTime` (timestamp), and `checkedIn` (boolean) on the dog document. When a dog checks out, `checkedIn` flips to false but the other fields persist, so we already have last check-in data without adding new fields. If this feels too surveillance-y for the pilot, we can skip the "last seen" line and only show status when the dog is currently checked in. Ren's call.

**5. Action buttons**

- "Say Hi to [Dog]" button (teal, primary style). Opens or navigates to the conversation with this dog. Same behavior as the chat icon on the pack list row and the "Say Hi" button on the map profile sheet.
- Mute toggle row: bell icon with "Notifications" label and a toggle/switch. Controls whether check-in and message notifications are received for this dog. Reads from and writes to `mutedCheckInDogIds` and `mutedMessageDogIds` arrays on the human document. For the pilot, a single toggle that controls both arrays is fine. If muted, show the bell with a slash through it.

**6. Remove from Pack (danger zone, at the bottom)**

- Styled as a text button or subdued link, NOT a prominent colored button. Use a muted red or gray color. Something like:

```
Remove [Dog] from your pack
```

- Tapping triggers a confirmation dialog (same pattern as the current remove confirmation):

```
Remove [Dog] from your pack?

This will also delete your conversation history.

[ Cancel ]  [ Remove ]
```

- On confirm: calls `removeFromPack(linkId)` from pack-context, closes the detail sheet, and returns to the pack list.

---

## Data the Component Needs

The PackMemberDetail component needs:

- **Dog document data:** name, photoURL, breed, size, energy, gender, age, checkedIn, checkedInAt, checkedInTime
- **packLink document:** id (for removal), createdAt (for "friends since")
- **Human document (current user):** mutedCheckInDogIds, mutedMessageDogIds (for mute toggle state)

The dog data should already be available since the pack list fetches it to display names and photos. The packLink is already in the `myPack` array from pack-context. The muted arrays are on the current user's human document (already loaded in auth-context or pack-context).

### How to fetch the dog data

The MyPackList currently needs to fetch each pack member's dog document to display their name and photo. The same data gets passed to PackMemberDetail. If the pack list is already fetching full dog documents, no additional reads are needed. If it's only fetching partial data (name + photo), it may need to fetch the full document when the detail view opens (or just fetch full documents from the start since it's a small pilot group).

---

## Where This Component Lives

```
components/
  MyPackList.js          (MODIFIED - remove inline delete, add tap handler to open detail)
  PackMemberDetail.js    (NEW - the detail sheet)
```

PackMemberDetail can be rendered inside MyPackList.js as a conditional overlay (when a pack member is selected), or it can be a standalone component that MyPackList renders. Either approach works. Keep it consistent with how the dog profile sheet works on the map (the `selectedDog` pattern in MapView.js).

---

## Consistency with Map Dog Profile Sheet

The map's dog profile sheet (the bottom sheet that opens when you tap a pin) shows similar info: photo, name, breed, size, energy chips, check-in location, and pack relationship status. The PackMemberDetail sheet shows the same base info plus relationship-specific content (friends since, mute toggle, remove).

To keep things DRY, consider extracting a shared `DogInfoCard` component that both sheets use for the photo/name/breed/chips section. But for the pilot, duplicating the layout is fine. Refactor later if it becomes a maintenance issue.

---

## Messaging Entry Points (Updated)

With this change, there are now three entry points to start or open a conversation with a pack member:

1. **Map dog profile sheet:** "Say Hi to [Dog]" button (existing)
2. **My Pack list row:** Chat bubble icon (existing)
3. **Pack Member Detail sheet:** "Say Hi to [Dog]" button (new, this spec)

All three should use the same logic: check if a conversation exists (deterministic ID from sorted dog IDs), open it if it does, create it if it doesn't.

---

## Build Notes for Claude Code

- Match the existing visual style: Fredoka font for dog names, the `gs-chip` class for personality tags, the teal/forest/cream color palette from globals.css (CSS variables: `--gs-teal`, `--gs-forest`, `--gs-cream`, `--gs-green`, `--gs-text-light`, etc.)
- The slide-up sheet pattern already exists in MapView.js (the dog profile sheet and check-in panel). Reuse that animation and positioning approach.
- The confirmation dialog for removal already exists in MyPackList.js (or MapView.js). Reuse that pattern.
- The mute toggle writes to the human document. Use `updateDoc` with `arrayUnion`/`arrayRemove` (same pattern as the frenemy list in pack-context.js).
- "Friends since" date formatting: use `toLocaleDateString` or a simple formatter. No need for a date library.
