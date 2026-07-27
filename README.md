# GeoScope — Google Street View Multiplayer

GeoScope is a real multiplayer location-guessing application built around Google Street View, Firebase Authentication, Cloud Firestore and Cloud Functions.

## Implemented application features

- Google account sign-in and persistent player profiles
- Interactive Google Street View panorama gameplay
- Create private rooms and invite players with a six-character code or URL
- Join rooms, ready states, host controls and synchronized rounds
- Live player list and realtime leaderboard
- Distance calculation and server-side scoring up to 5,000 points per round
- Round results, revealed map, final standings and rematches
- Player rating, match count, wins and best score
- Friend requests and persistent friends lists
- Responsive desktop and mobile UI
- Firestore Security Rules that block direct writes to authoritative match state
- Cloud Functions that create rooms, control rounds, validate guesses and update scores

## Required Google services

GitHub cannot create Google Cloud credentials. Before the production site can sign users in or show Street View, create one Firebase/Google Cloud project and configure the items below.

### 1. Firebase project

1. Open Firebase Console and create a project.
2. Add a Web App.
3. Enable **Authentication → Sign-in method → Google**.
4. Create a **Cloud Firestore** database.
5. Upgrade the Firebase project to the Blaze plan because Cloud Functions and Google Maps require billing.
6. Add these authorized domains in Firebase Authentication:
   - `nkuchenov-hash.github.io`
   - `localhost`

### 2. Google Maps APIs

In the same Google Cloud project enable:

- Maps JavaScript API
- Street View Static API, used only by the backend metadata lookup

Create two API keys:

**Browser key**

- Restrict application type to Websites.
- Allow `https://nkuchenov-hash.github.io/desktop-tutorial/*`.
- Restrict the key to Maps JavaScript API.

**Server key**

- Restrict it to Street View Static API.
- Store it as the Firebase Functions secret `GOOGLE_MAPS_SERVER_KEY`.

### 3. GitHub repository variables

Open **Settings → Secrets and variables → Actions → Variables** and add:

- `FIREBASE_API_KEY`
- `FIREBASE_AUTH_DOMAIN`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_STORAGE_BUCKET`
- `FIREBASE_MESSAGING_SENDER_ID`
- `FIREBASE_APP_ID`
- `GOOGLE_MAPS_BROWSER_KEY`

These are web application configuration values. The browser Maps key must be protected by HTTP referrer restrictions.

### 4. Deploy the Firebase backend

Install Firebase CLI locally, sign in and select the project:

```bash
npm install -g firebase-tools
firebase login
firebase use --add
cd functions
npm install
cd ..
firebase functions:secrets:set GOOGLE_MAPS_SERVER_KEY
firebase deploy --only functions,firestore:rules
```

Alternatively, add a GitHub secret named `FIREBASE_SERVICE_ACCOUNT` containing a Firebase service-account JSON document, then run the **Deploy GeoScope Firebase backend** workflow. The Maps server key must still be added as a Firebase Functions secret.

### 5. Deploy the frontend

After adding the GitHub variables, run the **Deploy GeoScope frontend** workflow. The live URL is:

`https://nkuchenov-hash.github.io/desktop-tutorial/`

## Local development

Copy the Firebase web configuration and browser Maps key into `runtime-config.js`, then serve the repository through a local web server:

```bash
python -m http.server 8080
```

Use the Firebase Emulator Suite for backend development:

```bash
firebase emulators:start
```

## Data model

- `users/{uid}` — public profile and competitive statistics
- `users/{uid}/friends/{friendUid}` — accepted friends
- `users/{uid}/friendRequests/{requesterUid}` — incoming requests
- `rooms/{code}` — realtime public room state
- `rooms/{code}/players/{uid}` — room players and scores
- `rooms/{code}/rounds/{round}/guesses/{uid}` — validated round results
- `rooms/{code}/private/game` — server-only location sequence, denied by Firestore rules

## Security boundary

The frontend never writes scores or authoritative room state directly. Callable Cloud Functions validate membership, round timing, coordinates and duplicate submissions. Firestore rules deny client writes to rooms, player scores, guesses and private location data.
