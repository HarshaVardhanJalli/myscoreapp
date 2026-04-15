# Deployment Guide

This guide covers deploying the My Cricket Score backend to production and submitting the Android app to the Google Play Store.

---

## Table of Contents

- [Backend Deployment](#backend-deployment)
  - [Option A: Railway (Recommended for solo/small teams)](#option-a-railway-recommended)
  - [Option B: Render](#option-b-render)
  - [Option C: Docker on VPS](#option-c-docker-on-vps)
- [Database: PostgreSQL (Supabase/Neon)](#database-setup)
- [Redis: Upstash](#redis-setup)
- [Environment Variables Reference](#environment-variables-reference)
- [Google Play Submission](#google-play-submission)
- [Post-Deployment Checklist](#post-deployment-checklist)

---

## Backend Deployment

### Option A: Railway (Recommended)

Railway detects Node.js automatically and provisions PostgreSQL + Redis as add-ons.

1. **Create account** at [railway.app](https://railway.app) and connect your GitHub repo.

2. **Add services:**
   - Click **New Project → Deploy from GitHub repo** → select `myscoreapp`
   - Set **Root Directory** to `backend`
   - Click **Add Plugin** → PostgreSQL
   - Click **Add Plugin** → Redis

3. **Set environment variables** (in Railway dashboard → Variables):

   ```
   NODE_ENV=production
   PORT=3000
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   REDIS_URL=${{Redis.REDIS_URL}}
   JWT_ACCESS_SECRET=<generate with: openssl rand -hex 64>
   JWT_REFRESH_SECRET=<generate with: openssl rand -hex 64>
   GOOGLE_CLIENT_ID=<from Google Cloud Console>
   GOOGLE_CLIENT_SECRET=<from Google Cloud Console>
   FIREBASE_PROJECT_ID=<from Firebase Console>
   FIREBASE_PRIVATE_KEY=<from service account JSON>
   FIREBASE_CLIENT_EMAIL=<from service account JSON>
   FRONTEND_URL=https://myscoreapp.com
   ```

4. **Set start command** in Railway settings:
   ```
   npm run build && npx prisma migrate deploy && npm start
   ```

5. **Deploy** — Railway auto-deploys on every push to `main`.

6. **Verify:**
   ```bash
   curl https://your-service.railway.app/api/health
   # Expected: {"status":"ok","version":"1.0.0","tag":"MyCricketScoreEngine_v1"}
   ```

---

### Option B: Render

1. Go to [render.com](https://render.com) → **New Web Service** → connect GitHub.

2. Set:
   - **Root Directory:** `backend`
   - **Build Command:** `npm install && npm run build && npx prisma generate`
   - **Start Command:** `npx prisma migrate deploy && npm start`
   - **Environment:** Node

3. Add **PostgreSQL** database: New → PostgreSQL → copy the internal DB URL.

4. Add **Redis**: New → Redis → copy the internal Redis URL.

5. Set all environment variables (same as Railway list above).

6. Render auto-deploys on push to `main`.

---

### Option C: Docker on VPS

Requires a VPS (DigitalOcean Droplet, Hetzner, etc.) with Docker + Docker Compose installed.

#### 1. Install Docker on Ubuntu

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
sudo apt-get install -y docker-compose-plugin
```

#### 2. Clone and configure

```bash
git clone https://github.com/yourusername/myscoreapp.git
cd myscoreapp
cp backend/.env.example backend/.env
# Edit backend/.env with production values
nano backend/.env
```

#### 3. Build and start

```bash
docker compose up -d --build
```

The `docker-compose.yml` starts:
- `backend` — Node.js API on port 3000
- `postgres` — PostgreSQL 15
- `redis` — Redis 7

#### 4. Run migrations

```bash
docker compose exec backend npx prisma migrate deploy
docker compose exec backend npm run db:seed   # optional: seed sample data
```

#### 5. Set up Nginx reverse proxy (recommended)

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable HTTPS with Certbot:
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d api.yourdomain.com
```

#### 6. Updating

```bash
git pull origin main
docker compose up -d --build backend
docker compose exec backend npx prisma migrate deploy
```

---

## Database Setup

### Supabase (Free tier available)

1. Create project at [supabase.com](https://supabase.com).
2. Go to **Settings → Database → Connection string → URI**.
3. Copy the `postgres://...` connection string.
4. Set as `DATABASE_URL` in your deployment environment.
5. Run migrations:
   ```bash
   DATABASE_URL="postgres://..." npx prisma migrate deploy
   ```

### Neon (Serverless PostgreSQL)

1. Create project at [neon.tech](https://neon.tech).
2. Copy the connection string from the dashboard.
3. Set as `DATABASE_URL`.

> **Important:** Append `?sslmode=require` to the connection string for both Supabase and Neon.

---

## Redis Setup

### Upstash (Serverless Redis — free tier available)

1. Create account at [upstash.com](https://upstash.com).
2. Create a Redis database → select region closest to your backend.
3. Copy the **Redis URL** (format: `redis://default:password@host:port`).
4. Set as `REDIS_URL` in your deployment environment.

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `NODE_ENV` | Yes | `production` |
| `PORT` | Yes | HTTP port (default: 3000) |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `REDIS_URL` | Yes | Redis connection string |
| `JWT_ACCESS_SECRET` | Yes | Secret for signing access tokens (min 32 chars) |
| `JWT_REFRESH_SECRET` | Yes | Secret for signing refresh tokens (min 32 chars) |
| `JWT_ACCESS_EXPIRES_IN` | No | Access token TTL (default: `15m`) |
| `JWT_REFRESH_EXPIRES_IN` | No | Refresh token TTL (default: `7d`) |
| `GOOGLE_CLIENT_ID` | Yes | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Yes | Google OAuth client secret |
| `GOOGLE_CALLBACK_URL` | Yes | OAuth redirect URI (e.g. `https://api.yourdomain.com/api/auth/google/callback`) |
| `FIREBASE_PROJECT_ID` | Yes | Firebase project ID (for FCM) |
| `FIREBASE_PRIVATE_KEY` | Yes | Firebase service account private key |
| `FIREBASE_CLIENT_EMAIL` | Yes | Firebase service account email |
| `FRONTEND_URL` | Yes | Allowed CORS origin for the mobile deep-link domain |
| `RATE_LIMIT_WINDOW_MS` | No | Rate limit window in ms (default: 900000 = 15 min) |
| `RATE_LIMIT_MAX` | No | Max requests per window (default: 100) |
| `LOG_LEVEL` | No | Winston log level (default: `info`) |

---

## Mobile App Submission

### Prerequisites

- JDK 17 + Android SDK command-line tools (no Android Studio needed)
- Google Play Console account (one-time $25 fee)
- App bundle (`.aab`) built in release mode

### Android SDK setup (without Android Studio)

```bash
# macOS (Homebrew)
brew install --cask temurin@17        # JDK 17
brew install android-commandlinetools  # sdkmanager

# Accept licenses and install required SDK components
sdkmanager --licenses
sdkmanager "platform-tools" "platforms;android-34" "build-tools;34.0.0"

# Add to ~/.zshrc or ~/.bashrc
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator
```

On Linux, download the command-line tools zip from [developer.android.com/studio#command-line-tools-only](https://developer.android.com/studio#command-line-tools-only) — no need to install Android Studio.

---

## Google Play Submission

### Step 1: Generate a signing keystore

```bash
keytool -genkey -v \
  -keystore myscoreapp-release.keystore \
  -alias myscoreapp \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

Store the keystore and passwords securely — you cannot change it after publishing.

### Step 2: Configure signing in the mobile app

Edit `mobile/android/gradle.properties`:

```properties
MYAPP_RELEASE_STORE_FILE=myscoreapp-release.keystore
MYAPP_RELEASE_KEY_ALIAS=myscoreapp
MYAPP_RELEASE_STORE_PASSWORD=<your store password>
MYAPP_RELEASE_KEY_PASSWORD=<your key password>
```

Edit `mobile/android/app/build.gradle` — add under `android {}`:

```gradle
signingConfigs {
    release {
        storeFile file(MYAPP_RELEASE_STORE_FILE)
        storePassword MYAPP_RELEASE_STORE_PASSWORD
        keyAlias MYAPP_RELEASE_KEY_ALIAS
        keyPassword MYAPP_RELEASE_KEY_PASSWORD
    }
}
buildTypes {
    release {
        signingConfig signingConfigs.release
        minifyEnabled true
        proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
    }
}
```

### Step 3: Set production API URL

Edit `mobile/.env` (or `mobile/src/config.ts`):

```
API_BASE_URL=https://api.yourdomain.com/api
```

### Step 4: Build the release bundle

```bash
cd mobile/android
./gradlew bundleRelease
```

Output: `mobile/android/app/build/outputs/bundle/release/app-release.aab`

### Step 5: Create Play Console listing

1. Go to [play.google.com/console](https://play.google.com/console).
2. **Create app** → Android → App name: "My Cricket Score".
3. Fill in:
   - **Short description** (80 chars max)
   - **Full description** (4000 chars max)
   - **Screenshots** (minimum 2 per device type: phone, 7-inch tablet)
   - **Feature graphic** (1024×500 px)
   - **App icon** (512×512 px, PNG)
4. **Content rating**: Complete the questionnaire (select Sports → Cricket scoring app).
5. **Target audience**: All ages.

### Step 6: Upload and publish

1. **Production → Create new release** → Upload the `.aab` file.
2. Add release notes (what's new).
3. **Review release** → confirm signing.
4. **Submit for review** — first review takes 3–7 days; subsequent releases are faster.

### Step 7: Set up in-app billing (for subscriptions)

1. In Play Console → **Monetize → Products → Subscriptions**.
2. Create subscription products:
   - Product ID: `pro_monthly` — ₹149/month
   - Product ID: `elite_yearly` — ₹999/year
3. Add base plans, free trials (optional), and pricing.
4. Update `mobile/src/services/subscriptionService.ts` with these product IDs.

---

## iOS App Store Submission

iOS builds require macOS + Xcode (no Xcode is needed for Android development).

### Prerequisites

- macOS with Xcode 15+ installed (`xcode-select --install` for command-line tools)
- Apple Developer account ($99/year)
- CocoaPods (`sudo gem install cocoapods`)

### Step 1: Install iOS dependencies

```bash
cd mobile
npm install
cd ios && pod install && cd ..
```

### Step 2: Configure bundle identifier and signing

Open `mobile/ios/MyCricketScore.xcworkspace` in Xcode **or** edit `mobile/ios/MyCricketScore/Info.plist` directly:

```xml
<key>CFBundleIdentifier</key>
<string>com.yourname.myscoreapp</string>
```

In Xcode → Signing & Capabilities → set your Apple Developer Team and enable automatic signing.

### Step 3: Set production API URL

Edit `mobile/.env`:

```
API_BASE_URL=https://api.yourdomain.com/api
```

### Step 4: Build the archive from the command line

```bash
cd mobile/ios
xcodebuild -workspace MyCricketScore.xcworkspace \
  -scheme MyCricketScore \
  -configuration Release \
  -archivePath build/MyCricketScore.xcarchive \
  archive
```

### Step 5: Export the IPA

```bash
xcodebuild -exportArchive \
  -archivePath build/MyCricketScore.xcarchive \
  -exportOptionsPlist ExportOptions.plist \
  -exportPath build/ipa
```

`ExportOptions.plist` example:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>method</key>
  <string>app-store</string>
  <key>teamID</key>
  <string>YOUR_TEAM_ID</string>
</dict>
</plist>
```

### Step 6: Upload and submit

```bash
xcrun altool --upload-app \
  --type ios \
  --file build/ipa/MyCricketScore.ipa \
  --username your@apple.id \
  --password @keychain:AC_PASSWORD
```

Or use **Transporter** app (free on Mac App Store) to upload the IPA with a GUI.

Then in [App Store Connect](https://appstoreconnect.apple.com): select the build, fill in metadata, and submit for review (typically 1–3 days).

---

## Post-Deployment Checklist

- [ ] `GET /api/health` returns `200 OK`
- [ ] User registration and login work end-to-end
- [ ] Google OAuth redirect URI is whitelisted in Google Cloud Console
- [ ] Firebase FCM credentials are valid (test push notification)
- [ ] WebSocket connection works (`wss://api.yourdomain.com`)
- [ ] Database migrations ran successfully (`prisma migrate status`)
- [ ] Rate limiting is active (verify with repeated requests)
- [ ] HTTPS is enabled (TLS certificate valid)
- [ ] Redis connection is healthy (`PING` returns `PONG`)
- [ ] Logs are being collected (check Railway/Render dashboard or VPS stdout)
- [ ] Set up uptime monitoring (e.g. Better Uptime, UptimeRobot)
