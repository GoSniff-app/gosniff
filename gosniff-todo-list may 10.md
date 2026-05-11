# GoSniff: Master To-Do List
## Updated: May 9, 2026

---

## PHASE 1: PROTECT (Do This Week)

These are time-sensitive. Do them before anything else.

- [ ] Buy gosniff.com domain
- [ ] Buy gosniff.app domain (if available)
- [ ] Grab social handles: @gosniff on Instagram, TikTok, X, Facebook
- [ ] Do NOT post anything publicly yet (no announcements, no teasers, nothing)

---

## PHASE 2: TRADEMARK (Do Within 30 Days)

- [ ] Search USPTO trademark database for "GoSniff" to confirm availability (https://tess2.uspto.gov)
- [ ] Decide: file trademark yourself ($250-350) or hire a trademark attorney ($1,000-1,500)
- [ ] File trademark application for "GoSniff" (Class 9: mobile app software, Class 42: software as a service)
- [ ] Consider filing for the tagline "It's a Dog Meet Dog World" as well

---

## PHASE 3: LEGAL BASICS (Do Within 60 Days)

- [ ] Form an LLC (can be simple single-member LLC in California for now)
- [ ] Decide: Does GoSniff live under GoDogPro's entity or is it a separate LLC?
- [ ] Get a basic privacy policy drafted (especially important since you're handling location data)
- [ ] Get basic terms of service drafted
- [ ] Look into business insurance considerations

---

## PHASE 4: BUILD THE WEB APP MVP (Do With Claude)

This is what we build together. A functional web app your friend group can use immediately.

### Round 1: Core Features
- [ ] Dog profile creation ("Join the Pack" onboarding flow)
- [ ] Map view showing checked-in dogs at nearby locations
- [ ] Manual check-in system ("We're here!" button)
- [ ] Three privacy zones (checked in / browsing / invisible)
- [ ] Basic dog profiles (photo, name, breed, age, size, energy level)

### Round 2: Social Features
- [ ] Dog-to-dog messaging (conversations show dog names and photos)
- [ ] Group messaging for playdate coordination
- [ ] Friend/favorite dogs list
- [ ] Notifications when favorite dogs check in

### Round 3: Safety Features
- [ ] Community alerts (lost dogs, aggressive dogs, hazards, park closures)
- [ ] Blocking functionality (blocks the human behind the dog)
- [ ] Location fuzzing (pins attach to named locations, not exact GPS)
- [ ] Radius controls (user-controlled visibility range)

### Round 4: Polish
- [ ] Auto-checkout after configurable time
- [ ] "On my way!" status
- [ ] Multiple dogs per human account
- [ ] Multiple humans per dog account

### Technical Setup Required (Claude will walk you through each step)
- [ ] Create free Firebase account (database and authentication)
- [ ] Create free Vercel or Netlify account (hosting)
- [ ] Set up Google Maps or Mapbox API key
- [ ] Deploy web app to your gosniff.com domain

---

## PHASE 5: PILOT WITH FRIEND GROUP (After MVP is Live)

- [ ] Invite your existing group text crew to use GoSniff
- [ ] Set a pilot period (suggest 8-12 weeks minimum)
- [ ] Track key metrics during pilot:
  - How many people use it weekly?
  - How many check-ins per week?
  - How many messages/playdates organized?
  - What features do people ask for?
  - What frustrations come up?
- [ ] Collect testimonials and screenshots (with permission)
- [ ] Document everything (this becomes your pitch deck evidence)

---

## PHASE 6: PITCH DECK (Build During or After Pilot)

- [ ] Build pitch deck (we can do this together in Claude) covering:
  - Problem (dog owners want spontaneous social connections for their dogs)
  - Solution (GoSniff: real-time, location-based, dog-as-identity social network)
  - Key differentiator (nobody else does real-time map check-ins with community alerts)
  - The Waze comparison
  - Founder-market fit (your background, GoDogPro, 30+ years in the dog world)
  - GoDogPro ecosystem play
  - Pilot data and metrics
  - Market size (pet industry stats)
  - Monetization paths
  - Acquisition angle (Tractive and others)
  - Ask (what you need: funding, technical co-founder, etc.)

---

## PHASE 7: GROW AND FUNDRAISE

- [ ] Expand beyond friend group to wider neighborhood
- [ ] Leverage GoDogPro network and Bay Woof writing for organic growth
- [ ] Decide: seek funding, find a technical co-founder, or bootstrap?
- [ ] Begin conversations with potential investors or acquirers (only with NDA and leverage from real user data)

---

## BACKLOG: Bugs, UX Improvements, and Small Features

Items discovered during development and pilot testing. Roughly grouped by area.

### Map and Location

- [ ] Add satellite view option to Google Maps (currently only default map view available)
- [ ] Geo-filter pack check-in notifications: don't notify when a pack member checks in 300+ miles away. Decide on a radius threshold (maybe 25-50 miles?) or let the user set it. No point getting a notification that Biscuit is at a park in Portland when you're in Stockton.

### Search

- [ ] Improve dog name search to support partial and fuzzy matching. Currently an exact match, so searching "George" won't find "Dr. George." Options: search against a lowercase version of the name, split on spaces and match any word, or use a simple "contains" check instead of "starts with" or "equals."

### Pack Member Detail

- [ ] "Last seen" feature: Show last check-in location and time on the Pack Member Detail sheet. Requires changing checkOut() in auth-context.js to stop nulling out checkedInAt, checkedInTime, and checkedInLocation on checkout (only flip checkedIn to false). Then PackMemberDetail can read those fields and display "Last seen at McLaren Park, 2 days ago" for dogs not currently checked in. Only show if the last check-in was within the past 7 days.

### Notifications and Muting

- [ ] Timed mute options for check-in notifications. Instead of a simple on/off toggle, give the user choices: mute for 1 hour, mute for 1 day, mute for 1 week, or mute permanently (until manually unmuted). Requires changing the muted arrays from simple dogId lists to objects with expiration timestamps, plus a check on notification send that compares current time against the mute expiration.

### Footer Bar (Checked-In Status Bar)

- [ ] Remove the dog's name from the checked-in footer bar. Currently shows "Dr. George · Sunnybrook Dr, Sonora" — should just show the location name. The user already knows their own dog's name; it's wasting space and pushing the buttons to the right.
- [ ] Change "Refresh" button label to "Update Location" (or just "Update"). "Refresh" is vague — update makes it clear you're changing your spot on the map.
- [ ] Change "Update Spot" button text (in the Refresh/Update Location panel) to "Update Location" for consistency.
- [ ] Make sure the footer bar doesn't overlap Google Maps zoom controls. Zoom controls are currently positioned at RIGHT_BOTTOM (position: 6). The footer bar is position: fixed, bottom: 0 with padding: 16px. On shorter screens or when the check-in panel opens, the zoom +/- buttons can get covered. Either move the zoom controls higher (position: RIGHT_CENTER or add bottom padding to the map) or add enough margin above the footer.

### Loading and Branding

- [ ] Make the loading logo animation more obvious. Current pulsing is too subtle. Make it bigger and more clearly animated (stronger pulse, or a bounce, or a spin) so users know the app is loading and not frozen.

---

## PARKING LOT (Future Considerations, Not Urgent)

- GoDogPro integration into GoSniff
- Dog-friendly place directory with reviews
- Events and meetups feature
- Walk tracking and stats
- GPS collar company integration (Tractive, Fi)
- Premium subscription features
- Business listings and promoted pins
- Native mobile app (iOS/Android) once web app is validated

---

## NOTES

- The web app MVP is the priority. Everything else (pitch deck, fundraising, growth) depends on having a working product with real usage data.
- Don't announce anything publicly until trademark is filed.
- Keep the pilot group small and tight (10-20 people) to work out kinks before expanding.
- Document EVERYTHING. Screenshots, user feedback, usage stats, testimonials. This is all pitch deck material.

---

*This list will be updated as we progress.*
