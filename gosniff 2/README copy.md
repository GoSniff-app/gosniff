# GoSniff - Dogs on the Map

**"It's a Dog Meet Dog World"**

A real-time, location-powered social network for dogs. See which dogs are at the park RIGHT NOW, check in with one tap, and meet new dog friends.


## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment variables

Copy the example file and fill in your real keys:

```bash
cp .env.local.example .env.local
```

Then edit `.env.local` with your actual values from Firebase Console and Google Cloud Console.

### 3. Configure Firebase (one-time setup)

In the Firebase Console for your project:

1. Go to Authentication, then Sign-in method, then enable Email/Password
2. Go to Firestore Database, then Create database, then start in test mode
3. In Firestore Rules, paste:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /humans/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /dogs/{dogId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null
        && request.auth.uid in resource.data.humanIds;
    }
  }
}
```

### 4. Run the dev server

```bash
npm run dev
```

Open http://localhost:3000 in your browser.


## Deploy to Vercel

1. Push this code to your GitHub repo
2. Go to vercel.com, import your repo
3. Add all the environment variables from .env.local in Vercel's project settings
4. Deploy

Vercel will give you a URL. Later you can point your gosniff.app domain to it.


## Project Structure

```
src/
  app/
    layout.js        - Root layout (fonts, metadata)
    page.js          - Main page (routing between auth/map)
    globals.css      - Tailwind + GoSniff brand styles
  components/
    JoinThePack.js   - Multi-step onboarding ("Join the Pack")
    SignIn.js        - Returning user sign-in
    MapView.js       - The map with check-ins and dog pins
    PawLogo.js       - Paw print SVG logo
  lib/
    firebase.js      - Firebase config and initialization
    auth-context.js  - Auth state management + dog profile CRUD
```


## What's Built (MVP Round 1)

- Welcome / landing screen
- "Join the Pack" onboarding (dog name, photo, breed, details, account)
- Sign in for returning users
- Google Maps with custom GoSniff styling
- Real-time dog pins on the map (Firestore listener)
- "We're here!" check-in at named locations
- Check-out button
- Auto-checkout after 90 minutes
- Dog profile panel (tap a pin to see details)
- Three privacy zones (checked in / browsing / offline)
- Menu with sign out


## What's Next (Round 2)

- Dog-to-dog messaging
- Group messaging for playdate coordination
- Friend/favorite dogs list
- Notifications when favorite dogs check in


## Tech Stack

- Next.js 16 (React framework)
- Tailwind CSS v4 (styling)
- Firebase Auth (human accounts)
- Firestore (dog profiles, check-ins)
- Google Maps API (map display)
- Vercel (hosting)
