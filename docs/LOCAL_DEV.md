# Local Dev Cheatsheet

Quick reference for running everything locally without Docker. Read top-to-bottom the first time; use as a lookup after that.

> **This is an Expo SDK 50 (managed workflow) project.**
> There is no `gradlew`, no `android/build.gradle`, no `pod install`.
> Expo handles all of that. You just need `expo start`.

---

## One-Time Setup

### 1. Install system deps

```bash
# macOS
brew install node@18 postgresql@15 redis
brew services start postgresql@15
brew services start redis

# Add to ~/.zshrc
export PATH="/opt/homebrew/opt/postgresql@15/bin:$PATH"
export PATH="/opt/homebrew/opt/node@18/bin:$PATH"
source ~/.zshrc
```

```bash
# Linux (Ubuntu/Debian)
sudo apt update && sudo apt install -y nodejs npm postgresql-15 redis-server
sudo systemctl enable --now postgresql redis-server
```

### 2. Install Expo CLI and EAS CLI

```bash
npm install -g expo-cli eas-cli
```

### 3. Install mobile deps (one-time, and after any `npm install`)

```bash
cd mobile
npm install
```

No `pod install`. No `gradlew`. Expo manages native deps.

### 4. Create the PostgreSQL database

```bash
psql -U postgres -c "CREATE DATABASE myscoreapp;"
```

---

## Firebase Setup (One-Time)

Firebase provides **Google Sign-In** and **push notifications (FCM)**.
You need: `google-services.json` for Android, `GoogleService-Info.plist` for iOS, and Admin SDK credentials for the backend.

### Step 1 — Create a Firebase project

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. **Add project** → name it `myscoreapp` → **Create project**

### Step 2 — Enable Google Sign-In

1. **Authentication → Sign-in method → Google → Enable → Save**
2. Note the **Web client ID** shown on that page — needed for `GOOGLE_CLIENT_ID` in backend

### Step 3 — Add the Android app

1. **Project settings → Add app → Android**
2. Package name: `com.myscoreapp.cricket` (matches `app.json → android.package`)
3. Download `google-services.json` → place at `mobile/android/app/google-services.json` ✅ (already done)

> **To enable Google Sign-In on Android**, Firebase also needs your app's SHA-1 fingerprint.
> Since this is Expo, get the debug SHA-1 from the Android debug keystore:
>
> ```bash
> keytool -list -v \
>   -keystore ~/.android/debug.keystore \
>   -alias androiddebugkey \
>   -storepass android -keypass android | grep SHA1
> ```
>
> In Firebase Console → your Android app → **Add fingerprint** → paste the SHA-1 → Save.
> Then **re-download `google-services.json`** and replace the existing file — it will now have `oauth_client` populated.

### Step 4 — Add the iOS app

1. **Project settings → Add app → iOS**
2. Bundle ID: `com.myscoreapp.cricket` (matches `app.json → ios.bundleIdentifier`)
3. Download `GoogleService-Info.plist` → place at `mobile/ios/MyCricketScore/GoogleService-Info.plist` ✅ (already done)

### Step 5 — Get Admin SDK key (backend push notifications)

1. **Project settings → Service accounts → Generate new private key**
2. Download the JSON. It contains:
   ```json
   {
     "project_id": "myscoreapp-xxxxx",
     "private_key": "-----BEGIN PRIVATE KEY-----\nMII...\n-----END PRIVATE KEY-----\n",
     "client_email": "firebase-adminsdk-xxx@myscoreapp-xxxxx.iam.gserviceaccount.com"
   }
   ```
3. Fill these into `backend/.env`:
   - `FIREBASE_PROJECT_ID` = `project_id`
   - `FIREBASE_PRIVATE_KEY` = `private_key` (keep `\n` as-is, wrap in double quotes)
   - `FIREBASE_CLIENT_EMAIL` = `client_email`

### Step 6 — Get Google OAuth credentials (backend login)

1. Go to [console.cloud.google.com](https://console.cloud.google.com) → select your Firebase project
2. **APIs & Services → Credentials → OAuth 2.0 Client IDs → Web client (auto created by Google Service)**
3. Copy **Client ID** → `GOOGLE_CLIENT_ID` in `backend/.env`
4. Copy **Client Secret** → `GOOGLE_CLIENT_SECRET` in `backend/.env`
5. Under **Authorized redirect URIs** add: `http://localhost:3000/api/auth/google/callback`

---

## Environment Variables

### backend/.env — full reference

```bash
# ── App ───────────────────────────────────────────────────────
NODE_ENV=development
PORT=3000

# ── Database ──────────────────────────────────────────────────
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/myscoreapp"
# Format: postgresql://USER:PASSWORD@HOST:PORT/DB_NAME

# ── Redis ─────────────────────────────────────────────────────
REDIS_URL="redis://localhost:6379"

# ── JWT secrets ───────────────────────────────────────────────
JWT_ACCESS_SECRET="<64-char hex>"
JWT_REFRESH_SECRET="<64-char hex>"
# Generate: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# ── Google OAuth (from Google Cloud Console) ──────────────────
GOOGLE_CLIENT_ID="123456789-abc.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-xxxxxxxxxxxxxxxx"
GOOGLE_CALLBACK_URL="http://localhost:3000/api/auth/google/callback"

# ── Firebase Admin SDK (from service account JSON) ────────────
FIREBASE_PROJECT_ID="myscoreapp-xxxxx"
FIREBASE_CLIENT_EMAIL="firebase-adminsdk-xxx@myscoreapp-xxxxx.iam.gserviceaccount.com"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMII...\n-----END PRIVATE KEY-----\n"
# ⚠ Paste private_key exactly as-is (with literal \n), inside double quotes

# ── CORS ──────────────────────────────────────────────────────
CORS_ORIGIN="http://localhost:3000,http://localhost:8081"
```

### mobile/.env — full reference

```bash
# Expo Go on physical device or simulator — use your machine's LAN IP
API_BASE_URL=http://192.168.x.x:3000/api
SOCKET_URL=http://192.168.x.x:3000

# Find your LAN IP:
#   macOS:  ipconfig getifaddr en0
#   Linux:  ip route get 1 | awk '{print $7}'

# ⚠ Do NOT use localhost or 127.0.0.1 — Expo Go runs on your phone,
#   which can't reach your laptop's localhost. Use the LAN IP instead.
```

---

## First-Time DB Setup

```bash
cd backend
npm install
npx prisma migrate dev    # creates all tables
npx prisma db seed        # loads sample data
```

Sample accounts loaded by seed:

| Email | Password | Role |
|-------|----------|------|
| `admin@myscoreapp.com` | `Password123!` | ADMIN |
| `rohit@myscoreapp.com` | `Password123!` | SCORER (Pro plan) |
| `priya@myscoreapp.com` | `Password123!` | USER |
| `arjun@myscoreapp.com` | `Password123!` | USER |

---

## Running Everything — Terminal Map

You need **2 terminals**. That's it.

```
┌─────────────────────────────────────────────────────────────┐
│  Terminal 1 — Backend API                                    │
│  cd backend && npm run dev                                   │
│                                                             │
│  Stays running. Hot-reloads on .ts changes.                 │
│  Listens on: http://localhost:3000                          │
│  Verify: curl http://localhost:3000/api/health              │
├─────────────────────────────────────────────────────────────┤
│  Terminal 2 — Expo (Metro bundler + dev server)             │
│  cd mobile && npx expo start                                │
│                                                             │
│  Shows a QR code and menu. Stays running.                   │
│  After it starts, press:                                    │
│    a  → open on Android emulator (if one is running)        │
│    i  → open on iOS simulator (macOS only)                  │
│    w  → open in browser                                     │
│    or scan QR code with Expo Go app on your phone           │
└─────────────────────────────────────────────────────────────┘

Optional Terminal 3 — Prisma Studio (DB viewer)
  cd backend && npx prisma studio
  Opens browser GUI at http://localhost:5555
```

**Start order:** Terminal 1 first, then Terminal 2.

---

## Running on a Physical Device (Recommended)

1. Install **Expo Go** on your phone:
   - Android: [Play Store — Expo Go](https://play.google.com/store/apps/details?id=host.exp.exponent)
   - iOS: [App Store — Expo Go](https://apps.apple.com/app/expo-go/id982107779)

2. Make sure your phone and laptop are on the **same Wi-Fi network**

3. Set `API_BASE_URL` in `mobile/.env` to your laptop's LAN IP (not localhost):
   ```bash
   ipconfig getifaddr en0   # macOS — gives something like 192.168.1.42
   ```

4. Run `npx expo start` in Terminal 2 → scan the QR code with Expo Go

---

## Running on an Emulator / Simulator

**Android emulator** (needs Android SDK + emulator installed):
```bash
# Install emulator and a system image (one-time)
brew install android-commandlinetools
sdkmanager "emulator" "system-images;android-34;google_apis;x86_64"
avdmanager create avd -n Pixel6 -k "system-images;android-34;google_apis;x86_64" --device "pixel_6"

# Start emulator
emulator -avd Pixel6 &

# Then in the expo start terminal, press 'a'
```

**iOS simulator** (macOS only, needs Xcode):
```bash
xcode-select --install
# Then in the expo start terminal, press 'i'
```

---

## Day-to-Day Commands

### Backend

```bash
npm run dev                              # start with hot reload
npx prisma studio                        # browse DB in browser
npx prisma migrate dev --name <desc>     # after editing schema.prisma
npx prisma db seed                       # re-load sample data
npm test                                 # run tests
npm run typecheck                        # TypeScript check
```

### Mobile

```bash
npx expo start             # start dev server + show QR
npx expo start --clear     # start with cleared Metro cache
npx expo start --android   # start and immediately open Android emulator
npx expo start --ios       # start and immediately open iOS simulator
eas build --platform android   # production build (cloud, via EAS)
eas build --platform ios       # production build (cloud, via EAS)
```

### Database

```bash
npx prisma migrate dev       # apply schema changes
npx prisma migrate reset     # wipe DB and re-run all migrations + seed
npx prisma db seed           # re-seed without wiping
npx prisma generate          # regenerate Prisma client after schema change
```

---

## Quick Sanity Checks

```bash
# Backend up?
curl http://localhost:3000/api/health

# PostgreSQL up?
pg_isready -h localhost -p 5432

# Redis up?
redis-cli ping    # → PONG

# Expo server up?
# Check Terminal 2 — should show QR code and "Metro waiting on..."
```

---

## Common Fixes

| Problem | Fix |
|---------|-----|
| `ECONNREFUSED 5432` | `brew services start postgresql@15` (macOS) or `sudo systemctl start postgresql` (Linux) |
| `ECONNREFUSED 6379` | `brew services start redis` or `sudo systemctl start redis-server` |
| App can't reach backend | Use your LAN IP (not `localhost`) in `mobile/.env` — your phone can't reach your laptop's localhost |
| `google-services.json` has empty `oauth_client` | Add SHA-1 fingerprint in Firebase Console, re-download the file (see Firebase Setup Step 3) |
| Expo "Something went wrong" on module | `npx expo start --clear` |
| iOS simulator not showing | Xcode not installed — run `xcode-select --install` |
| Android emulator not showing | No emulator running — start one with `emulator -avd Pixel6 &` |
| `prisma migrate dev` fails | `npx prisma migrate reset` to wipe and start fresh (dev only) |
| JWT errors on API calls | Check `JWT_ACCESS_SECRET` is set in `backend/.env` |
| Push notifications not working | Check `FIREBASE_PRIVATE_KEY` in `.env` has literal `\n` (not real newlines), wrapped in double quotes |
