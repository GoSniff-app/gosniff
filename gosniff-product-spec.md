# GoSniff Product Specification
## "It's a Dog Meet Dog World"

**Version:** 1.3 (Draft)
**Date:** March 1, 2026

---

## 1. Product Overview

### Elevator Pitch
GoSniff is a real-time, location-powered social network for dogs. Think Grindr + Waze, but for dogs. Dogs are the identity. Humans are invisible. While other dog apps use swipe-to-match models or photo feeds to plan future meetups, GoSniff shows you which dogs are at the park RIGHT NOW and layers in community-reported alerts for lost dogs, hazards, and more. Waze didn't invent maps; it added the real-time, community-reported layer on top. GoSniff does the same thing for the dog world.

### The Name: GoSniff

"GoSniff" was chosen for several strategic reasons:

- Brand family: The "Go" prefix mirrors GoDogPro, creating an instant visual and linguistic connection between products. GoDogPro finds your dog's professionals. GoSniff finds your dog's friends.
- Real training cue: "Go sniff" is an actual positive reinforcement dog training command, taught by organizations like Karen Pryor Academy as a way to put sniffing on cue as a reward. This is deeply on-brand for a product built by a certified force-free trainer.
- Verb-ready: "GoSniff at the park." "Who's GoSniffing nearby?" The name works naturally as an action.
- Dog-native: Sniffing is how dogs say hello, explore their world, and gather information. It's the most fundamental dog behavior and maps perfectly to an app about discovering who and what is nearby.
- Clear air: No competing apps or consumer products use this name. Highly trademarkable.

### Core Value Proposition
Dogs on the map. See which dogs are out and about, receive notifications when favorite dog pals check in, make playdates easily, discover dog-friendly places, and never walk alone.

### Why It Matters
- Bring home a tired dog
- Make doggy playdates easily
- Get out of your boring dog walking routine
- Meet new dogs
- Never walk alone: team up to stay safe on late-night dog walks
- Avoid hazards
- Get lost dog alerts
- Find dog-friendly places when traveling

---

## 2. Founder and Founder-Market Fit

### Ren Volpe

GoSniff is founded by Ren Volpe, a Certified Behavior Consultant (CBCC-KA), Certified Separation Anxiety Trainer (CSAT), and Fear Free Certified Professional based in San Francisco. Ren has 30+ years of experience training, boarding, and rescuing dogs, and has fostered more than 100 dogs in her home.

Ren is also the Founder and CEO of GoDogPro.com, an online directory that matches dog owners with qualified, force-free dog professionals (trainers, walkers, groomers, boarders). She is a published writer on canine behavior and welfare, with articles in Bay Woof and on KQED, and an active voice in the force-free dog training community.

### Why This Matters

Founder-market fit is one of the strongest predictors of startup success. GoSniff isn't being built by a tech founder looking for a market. It's being built by someone who has spent three decades in the dog world, has an established reputation and audience, and identified this need from her own daily experience (GoSniff was born from a real group text chain Ren and her dog friends already use to coordinate walks and meetups).

Key advantages Ren brings to GoSniff:

- Deep domain expertise in dog behavior, which informs product decisions around safety features (aggressive dog alerts, temperament-based matching, etc.)
- An existing audience and platform through GoDogPro, Bay Woof, and professional networks
- Credibility with both dog owners and dog industry professionals
- Direct access to the target user base for pilot testing and early growth
- A published voice that can drive organic press and content marketing

### The GoDogPro + GoSniff Ecosystem

GoDogPro and GoSniff are complementary products serving the same audience with different needs:

- **GoDogPro** connects dog owners with professionals (trainers, walkers, groomers, boarders). It's a services marketplace.
- **GoSniff** connects dog owners with each other for social interaction, playdates, and community safety. It's a social network.

Together, they form a two-sided ecosystem for dog owners: find your dog's people on GoSniff, find your dog's professionals on GoDogPro.

Potential integration points:

- GoSniff users can discover and book GoDogPro professionals directly within the app
- GoDogPro professionals can promote events, group walks, or training sessions to nearby GoSniff users
- Shared user accounts across both platforms, reducing friction
- GoDogPro provides a vetted directory of force-free professionals, adding a trust and safety layer to GoSniff (for example, recommending certified trainers when a user reports a behavioral concern)
- Combined data across both platforms provides a more complete picture of the dog owner market for potential acquirers

This ecosystem play increases the value of both products individually and makes the combined offering significantly more attractive for acquisition.

---

## 3. Core Concept: The Dog IS the Identity

The fundamental design principle of GoSniff is that every public-facing interaction happens through the dog's identity, not the human's. This is not a gimmick. It is the product's core architecture and its primary privacy mechanism.

### What This Means in Practice

- Users log in AS their dog
- Other users see the dog's name, photo, breed, and personality (never the human's name, phone number, or personal details)
- Messaging between users appears as dog-to-dog conversation (Biscuit's profile photo and name in the chat bubble, not the owner's)
- The dog profile is what appears on the map, in search results, and in all social features

### Why This Works

- Privacy by design: Your public identity is "Biscuit, 3yr old Golden Retriever, high energy" not "Sarah Johnson, 34, lives on Elm Street"
- It's more fun: Nobody wants to build another human profile, but people will happily spend 45 minutes picking the perfect photo for their dog
- It's natural: Dog owners already speak on behalf of their dogs in real life ("Biscuit loves your dog!" or "Can Mochi come to the park Tuesday?")
- It's shareable: Screenshots of dogs "talking" to each other to set up playdates are inherently viral content

---

## 4. Account Architecture

### Two-Layer System

**Layer 1: Human Account (Private/Invisible)**
- Real name, email, phone number
- Login credentials
- Blocking and reporting controls
- Notification preferences
- Payment/subscription info (future)
- Never visible to other users

**Layer 2: Dog Profile(s) (Public)**
- Dog's name
- Photo or avatar
- Breed
- Age
- Gender
- Size
- Energy level
- Temperament notes (optional)
- Check-in status and location (when active)

### Many-to-Many Relationship

- One human account can manage multiple dog profiles (multi-dog households)
- One dog profile can have multiple authorized humans (couples, families, dog walkers, roommates)
- Each dog is an independent profile: if you have 3 dogs and take 2 to the park, only those 2 check in
- When a partner takes one dog to a different park, they can check in that dog from their phone

### Blocking Mechanics

- Blocking targets the human account behind the dog, not just the dog profile
- A blocked human cannot see any of your dogs, regardless of which dog profile they use
- Blocked users cannot create a new dog profile to circumvent the block

---

## 5. Onboarding Flow

The onboarding should feel like introducing your dog at the park, not filling out a registration form.

### Proposed Flow

1. **"Join the Pack"** (primary call to action, replaces traditional "Sign Up" or "Register")
2. **"What's your dog's name?"** (single name field, nothing else on screen)
3. **"Show us that face!"** (photo upload)
4. Quick taps for breed, age, size, energy level (formatted like a quiz, not a form)
5. Human account details collected minimally in the background (email, password)

### Adding More Dogs

- "Add another pup" or "Grow your pack"

---

## 6. Location System

### Core Principle: Manual Check-In Only

The app uses a deliberate, manual check-in model. The app never passively broadcasts a user's location. Every appearance on the map requires an intentional action. This is critical for three reasons:

1. **Privacy:** No one is trackable unless they actively choose to be, every single time
2. **Battery life:** Constant GPS tracking kills phone batteries; manual check-in does not
3. **Intentionality:** Differentiates GoSniff from "Find My Friends" style apps where people forget they're sharing

### Three Privacy Zones

**Zone 1: Checked In (Most Visible)**
- User taps "We're here!" at a location
- Dog's pin appears on the map attached to a named place (example: "Biscuit is at Dolores Park")
- Location is fuzzy by design: shows the park/location, NOT exact GPS coordinates (no "standing next to the third bench on the left")
- Visible to other users within their browsing radius

**Zone 2: Browsing (Not Visible)**
- User is browsing the map from home but has not checked in
- They can see dogs checked in at nearby locations
- They do NOT appear on the map (or optionally show as a neighborhood-level indicator like "Biscuit is nearby in the Mission" with no pin)
- Ghost browser mode: see others without being seen

**Zone 3: Offline/Invisible (Not Visible)**
- App closed or manually toggled to invisible
- User does not exist on the map at all

### Radius Controls

**User-controlled radius slider** that determines how far you can see and how far others can see you. Suggested default options: 1, 3, 5, 10 miles.

**Two radius contexts:**

- **Check-in radius:** When checked in at a park, nearby users (within ~1 mile) see your dog's pin attached to the named location
- **Browsing radius:** When browsing from home, you see a wider range of parks and dogs but with neighborhood-level precision (not exact locations)

**Travel mode:** When visiting a new city, users can temporarily widen their radius to explore the area. This setting should be easy to adjust on the fly (not buried in settings).

### Location Fuzzing

- Checked-in pins attach to named locations (parks, beaches, trails) not exact coordinates
- The system should maintain a database of known dog-friendly locations that pins snap to
- This prevents precise tracking while still being useful ("Mochi is at the dog park" is helpful; "Mochi is at 37.7694° N, 122.4862° W" is creepy)

---

## 7. Key Features (MVP)

### Real-Time Map
- Map view showing dogs currently checked in at nearby locations
- Dog pins show photo/avatar, name, and breed at a glance
- Tap a pin to see full dog profile
- Filter by size, energy level, or breed (future)

### Dog Profiles
- Photo or avatar, name, breed, age, gender, size, energy level
- Optional temperament notes
- Playdate history (future)

### Messaging (Dog-to-Dog)
- Conversations display under dog names and photos (not human identities)
- Group messaging for organizing playdates
- Messages are casual and human-written (not dogs literally typing in dog voice, unless the user wants to)

### Community Alerts
- Location-based, community-reported alerts:
  - Lost dogs
  - Aggressive dogs in the area
  - Park closures
  - Dog walking-related ticket/citation warnings
  - Hazard reports (broken glass, coyote sightings, etc.)

### Check-In System
- One-tap "We're here!" to appear on the map
- Select which dog(s) you're checking in with
- Auto-checkout after configurable time (or manual checkout)
- "On my way!" status (optional, to let friends know you're heading to the park)

---

## 8. Future Features (Post-MVP)

- Dog-friendly place directory (restaurants, hotels, stores) with reviews
- Events and meetups (breed-specific gatherings, group walks)
- Walk tracking and stats
- Integration with GPS collar companies (Tractive, Fi)
- Premium features (extended profile stats, playdate history, analytics)
- Business listings (groomers, pet stores, vets paying to be on the map)
- GoDogPro integration (find and book vetted, force-free dog professionals directly within GoSniff)

---

## 9. Business Strategy

### Monetization Paths

- Dog-friendly businesses pay to appear on the map (similar to Waze promoted pins)
- Premium subscription for advanced features
- Event promotion and sponsored meetups
- Partnerships with pet brands targeting an engaged, location-verified audience of active dog owners
- Potential data insights (anonymized, aggregated) on dog owner behavior patterns for pet industry

### Key Metrics to Track

- Number of active users (not just downloads)
- Daily active check-ins
- Retention rate (weekly and monthly)
- Geographic density (users per neighborhood)
- Messages sent / playdates organized
- Alert engagement

### Acquisition Angle

**Primary acquisition target: Tractive (or similar GPS collar company)**

The pitch: "You already have millions of dogs wearing GPS collars. You have the location data. What you don't have is a reason for those dog owners to interact with each other. GoSniff is that reason."

Why this is compelling for an acquirer:
- Hardware companies like Tractive have a churn problem (people stop using the collar, cancel the subscription). A social network gives dog owners a daily reason to open the app even when their dog isn't lost.
- Tractive integration could make check-in automatic: collar detects the dog is at a known park, prompts "Check Biscuit in?" (still requires intentional confirmation, maintaining the privacy model).
- GoSniff's social graph is the hard-to-replicate asset. The technology is reproducible. The community is not.

Other potential acquirers: Mars Petcare, Chewy, Bark, Embark.

Note: An acquisition of GoSniff would also bring the founder's domain expertise, industry credibility, and the potential to bundle or integrate GoDogPro's professional services marketplace. The acquirer wouldn't just be buying an app; they'd be buying an ecosystem and the person best positioned to grow it.

### Growth Strategy

- Launch with founder's existing dog walking group as proof of concept (the "Wizard of Oz" phase)
- Validate with real usage data: "15 dog owners, 85% weekly retention over 3 months"
- Leverage founder's existing platform (GoDogPro), published writing (Bay Woof, KQED), and professional network for organic early adoption
- Cross-promote through GoDogPro's user base and professional directory
- Grow neighborhood by neighborhood (same model as Nextdoor and early Facebook)
- Network effects: every new dog makes the app more valuable for everyone already on it
- Content marketing through founder's established voice in the dog training community

---

## 10. Competitive Landscape

### Existing Apps in the Space

Several apps serve dog owners looking to connect, but they all fall into two categories: swipe/match models (pre-planned meetups) or photo-sharing social feeds.

- **Pawmates:** Swipe-to-match dog meetup app. Tinder for dogs. Users match, chat, and plan meetups. No real-time location.
- **DogHood:** Free community app for finding playdates and planning meetups in your neighborhood. No live map.
- **Odd Circles:** Group-based dog meetup app. Focused on organized activities. No real-time location.
- **Dogspotting App:** Social feed for dog lovers to share photos and connect. No location features at all.
- **Tractive/Fi/Whistle:** GPS tracking for YOUR dog (utility, no social layer)
- **Rover/Wag:** Hiring dog walkers/sitters (marketplace, not social)
- **Nextdoor:** Has a lost pet feature but it's bolted on, not core

### The Critical Differentiator (Use in All Pitches)

None of the existing dog apps are doing what GoSniff does. Every single one is either a swipe/match model for pre-planned meetups or a photo-sharing social feed. Nobody is doing real-time, live map check-ins. Nobody is showing you which dogs are at the park RIGHT NOW. Nobody has the "Waze layer" of community-reported alerts for lost dogs, aggressive dogs, or hazards. And none of them use a dog-as-identity model.

The closest comparison is actually Waze, not other dog apps. Waze didn't invent maps or navigation (Google Maps already existed). Waze added the real-time, community-reported layer on top. That's what GoSniff is doing for the dog world.

Additionally, the founder's existing platform (GoDogPro) provides a built-in professional services layer that no competitor can easily replicate, creating a potential ecosystem play from day one.

---

## 11. Technical Considerations

### Platform
- To be determined (native mobile app vs. progressive web app vs. hybrid)
- MVP could launch as a web app accessible via phone browser to avoid app store approval delays

### Key Technical Requirements
- Real-time location services (with manual check-in triggers, not passive tracking)
- User authentication with two-layer identity system
- Real-time messaging
- Push notifications
- Map integration (Google Maps or Mapbox)
- Location fuzzing algorithm (snap to named locations)
- Scalable database for user profiles, dog profiles, and location data
- Privacy and security infrastructure (encryption, data protection, COPPA-adjacent considerations for location data)

### Battery and Performance
- Manual check-in model means no constant GPS polling
- Location services only active during check-in and map browsing
- Minimal background activity

---

## 12. Legal and Compliance Considerations (To Be Explored)

- Location data privacy (varies by state/country)
- Terms of service and liability (dog behavior incidents)
- Content moderation for messaging and alerts
- Trademark search and filing for "GoSniff" (mirrors GoDogPro brand family)
- LLC formation
- Privacy policy (especially regarding the two-layer identity system)

---

## 13. Next Steps

1. Finalize product spec (this document)
2. Build interactive prototype (map view, dog profiles, check-in flow, alerts feed)
3. Pilot with friend group to generate real usage data
4. Build pitch deck based on validated concept and pilot data
5. Explore technical build options (no-code MVP, developer hire, or technical co-founder)
6. Trademark and legal setup
7. Seek funding or acquisition conversations

---

*Document will be updated as product decisions evolve.*
