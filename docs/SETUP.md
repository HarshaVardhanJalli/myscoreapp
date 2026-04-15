# Development Setup Guide

This guide walks you through getting the My Cricket Score development environment running on your local machine.

---

## Prerequisites

Ensure the following are installed before proceeding:

| Tool | Minimum Version | Purpose |
|------|----------------|---------|
| Node.js | 18.x LTS | Backend runtime and mobile build tooling |
| npm | 9.x | Package management |
| PostgreSQL | 15.x | Primary database |
| Redis | 7.x | Caching and WebSocket pub/sub |
| Expo CLI | latest | Mobile dev server and build tooling |
| EAS CLI | latest | Cloud builds for Android and iOS |
| Git | 2.30+ | Version control |
| Docker (optional) | 24.x | Containerized local services |

### Check versions

```bash
node -v         # Should print v18.x.x or higher
npm -v          # Should print 9.x.x or higher
psql --version  # Should print PostgreSQL 15.x
redis-cli ping  # Should print PONG
java -version   # Should print openjdk 17.x.x
```

### Install Node.js 18 (if not installed)

Using nvm (recommended):
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc   # or ~/.zshrc
nvm install 18
nvm use 18
nvm alias default 18
```

### Install PostgreSQL 15

**macOS (Homebrew):**
```bash
brew install postgresql@15
brew services start postgresql@15
echo 'export PATH="/opt/homebrew/opt/postgresql@15/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install -y postgresql-15 postgresql-client-15
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### Install Redis 7

**macOS:**
```bash
brew install redis
brew services start redis
```

**Ubuntu/Debian:**
```bash
sudo apt install -y redis-server
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

### Expo Mobile Environment

This is an **Expo managed workflow** project. No Android Studio, no `gradlew`, no `pod install` needed.

```bash
npm install -g expo-cli eas-cli
```

To run on a physical device, install **Expo Go** on your phone:
- Android: Play Store → search "Expo Go"
- iOS: App Store → search "Expo Go"

To run on an emulator/simulator (optional), see `docs/LOCAL_DEV.md`.

---

## Step 1: Clone the Repository

```bash
git clone https://github.com/yourusername/myscoreapp.git
cd myscoreapp
```

---

## Step 2: Set Up Environment Variables

### Backend

```bash
cd backend
cp .env.example .env
```

Open `.env` and fill in all required values. The key ones are:

```bash
# Database (PostgreSQL)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/myscoreapp"

# Redis
REDIS_URL="redis://localhost:6379"

# JWT secrets — generate secure random strings
JWT_SECRET="your-super-secret-jwt-key-min-32-chars"
JWT_REFRESH_SECRET="your-super-secret-refresh-key-min-32-chars"

# Google OAuth (from Firebase Console)
GOOGLE_CLIENT_ID="your-firebase-web-client-id.apps.googleusercontent.com"

# Firebase Admin SDK (for push notifications)
FIREBASE_PROJECT_ID="your-firebase-project-id"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
FIREBASE_CLIENT_EMAIL="firebase-adminsdk-xxx@your-project.iam.gserviceaccount.com"

# Google Play (for subscription verification)
GOOGLE_PLAY_PACKAGE_NAME="com.myscoreapp"
GOOGLE_PLAY_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'
```

Generate secure JWT secrets:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Mobile

```bash
cd ../mobile
cp .env.example .env
```

Edit `.env`:
```bash
API_URL=http://10.0.2.2:3000/api     # Android emulator to localhost
SOCKET_URL=http://10.0.2.2:3000
```

> **Note for physical device:** Replace `10.0.2.2` with your machine's local IP address (e.g., `192.168.1.105`). Find it with `ipconfig` (Windows) or `ifconfig | grep inet` (macOS/Linux).

---

## Step 3: Set Up PostgreSQL Database

### Create the database

```bash
# Connect to PostgreSQL as superuser
psql -U postgres

# In the psql shell:
CREATE DATABASE myscoreapp;
CREATE USER myscoreapp_user WITH ENCRYPTED PASSWORD 'dev_password_123';
GRANT ALL PRIVILEGES ON DATABASE myscoreapp TO myscoreapp_user;
\q
```

> If you're using the default setup with `postgres` user and password `postgres`, the `.env.example` defaults will work without creating a separate user.

### Verify connection

```bash
psql -U postgres -d myscoreapp -c "SELECT version();"
```

---

## Step 4: Install Backend Dependencies

```bash
cd backend
npm install
```

---

## Step 5: Run Database Migrations

```bash
cd backend
npx prisma migrate dev
```

This command:
- Creates all tables, indexes, and foreign keys defined in `prisma/schema.prisma`
- Applies any pending migrations in `prisma/migrations/`
- Generates the Prisma Client with full TypeScript types

Expected output:
```
Applying migration `20240101000001_init`
Applying migration `20240115000002_add_tournaments`
...
Your database is now in sync with your schema.
Generated Prisma Client
```

### Inspect the database (optional)

```bash
npx prisma studio
# Opens a browser-based GUI at http://localhost:5555
```

---

## Step 6: Seed Sample Data

```bash
cd backend
npx prisma db seed
```

This creates:
- 2 test user accounts (see credentials below)
- 4 sample teams with 11 players each
- 1 completed T20 match with full ball-by-ball data
- 1 in-progress T20 match
- 1 sample tournament

### Test credentials

| Email | Password | Plan |
|-------|----------|------|
| `scorer@test.com` | `Test@1234` | Pro |
| `viewer@test.com` | `Test@1234` | Free |

---

## Step 7: Start the Backend Server

```bash
cd backend
npm run dev
```

The server starts with `nodemon` for hot reload. You should see:
```
[nodemon] starting `ts-node src/index.ts`
Server listening on http://localhost:3000
WebSocket server ready
Connected to PostgreSQL via Prisma
Connected to Redis at redis://localhost:6379
```

### Verify the backend is running

```bash
curl http://localhost:3000/api/health
# Expected: {"success":true,"data":{"status":"ok","version":"1.0.0","db":"connected","redis":"connected"}}
```

### Available npm scripts (backend)

| Script | Description |
|--------|-------------|
| `npm run dev` | Start with hot reload (nodemon + ts-node) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Start compiled production build |
| `npm test` | Run Jest unit tests |
| `npm run test:coverage` | Tests with coverage report |
| `npm run lint` | ESLint check |
| `npm run lint:fix` | ESLint auto-fix |
| `npm run type-check` | TypeScript type check (no emit) |

---

## Step 8: Start the Mobile App

```bash
cd mobile
npm install
npx expo start
```

Expo starts the Metro bundler and shows a QR code. Then:

| Action | How |
|--------|-----|
| **Physical device** | Install Expo Go on phone → scan the QR code (must be on same Wi-Fi) |
| **Android emulator** | Start emulator first (`emulator -avd Pixel6 &`), then press `a` in the Expo terminal |
| **iOS simulator** | macOS only — press `i` in the Expo terminal (Xcode required) |

### Available npm scripts (mobile)

| Script | Description |
|--------|-------------|
| `npm start` / `npx expo start` | Start Expo dev server |
| `npx expo start --clear` | Start with cleared Metro cache |
| `npx expo start --android` | Start and open Android emulator |
| `npx expo start --ios` | Start and open iOS simulator |
| `npm run build:android` | Cloud build via EAS (production) |
| `npm run build:ios` | Cloud build via EAS (production) |
| `npm test` | Run Jest tests |
| `npm run lint` | ESLint check |

---

## Using Docker Compose (Alternative to Steps 3–7)

If you prefer Docker for the backend infrastructure:

```bash
# From the repo root
docker-compose up -d

# Run migrations inside the container
docker-compose exec backend npx prisma migrate dev

# Seed data
docker-compose exec backend npx prisma db seed

# View logs
docker-compose logs -f backend

# Stop everything
docker-compose down
```

The mobile app still runs natively (not in Docker). Use `http://10.0.2.2:3000/api` as `API_URL` in `mobile/.env` when using Docker.

---

## Common Issues and Solutions

### "Cannot connect to PostgreSQL"

**Symptoms:** `Error: connect ECONNREFUSED 127.0.0.1:5432`

**Solutions:**
- Check PostgreSQL is running: `brew services list | grep postgresql` (macOS) or `sudo systemctl status postgresql` (Linux)
- Verify the DATABASE_URL in `.env` matches your PostgreSQL configuration
- Check PostgreSQL is listening: `psql -U postgres -c "SELECT 1"`

---

### "Cannot connect to Redis"

**Symptoms:** `Error: connect ECONNREFUSED 127.0.0.1:6379`

**Solutions:**
- Check Redis is running: `redis-cli ping` (should return PONG)
- macOS: `brew services start redis`
- Linux: `sudo systemctl start redis-server`

---

### "prisma migrate dev" fails

**Symptoms:** `Migration failed to apply cleanly`

**Solutions:**
```bash
# Reset the database completely (WARNING: deletes all data)
npx prisma migrate reset

# If schema drift is the issue, create a new migration
npx prisma migrate dev --name fix_schema_drift
```

---

### Expo "Unable to resolve module"

**Symptoms:** Red screen with module resolution error

**Solutions:**
```bash
# Clear Metro cache
cd mobile
npx expo start --clear

# Delete node_modules and reinstall
rm -rf node_modules && npm install && npx expo start
```

---

### App can't connect to backend

**Symptoms:** Network error in app, but `curl localhost:3000/api/health` works on your laptop

**Solutions:**
- Expo Go runs on your **phone** — it cannot reach `localhost` on your laptop
- Set `API_BASE_URL` in `mobile/.env` to your laptop's LAN IP: `http://192.168.x.x:3000/api`
- Find your LAN IP: `ipconfig getifaddr en0` (macOS) or `hostname -I` (Linux)
- Make sure your phone and laptop are on the same Wi-Fi network

---

### Expo build errors

**Symptoms:** Red screen or "Something went wrong" in Expo Go

**Solutions:**
```bash
# Clear Metro cache
npx expo start --clear

# Reinstall dependencies
cd mobile && rm -rf node_modules && npm install && npx expo start
```

---

### "google-services.json not found"

**Symptoms:** Build error about missing google-services.json

**Solution:** You need to set up Firebase for your own development. See [docs/DEPLOYMENT.md](DEPLOYMENT.md#firebase-setup) for instructions, or use the mock config for development:

```bash
# For local development without Firebase features (push notifs won't work)
cp mobile/android/app/google-services.example.json mobile/android/app/google-services.json
```

---

## Development Tips

### Hot Reload
- Backend: `nodemon` auto-restarts on `.ts` file changes
- Mobile: React Native Fast Refresh updates components without losing state. Press `R` twice in Metro to do a full reload.

### Prisma Studio
Run `npx prisma studio` from the `backend/` directory for a web-based DB GUI. Useful for inspecting data during development.

### API Testing with Postman
Import the OpenAPI spec (available at `http://localhost:3000/api/docs` when running in dev mode) into Postman for a pre-built collection of all endpoints.

### WebSocket Testing
Use `wscat` to test WebSocket events:
```bash
npm install -g wscat
wscat -c ws://localhost:3000 -H "Authorization: Bearer <token>"
# Then: {"event":"join:match","data":{"matchId":"..."}}
```

### TypeScript Path Aliases
Both backend and mobile use path aliases. Backend uses `@/` → `src/`. Mobile uses `@components/` etc. Configured in `tsconfig.json`.

### Linting and Formatting
The project uses ESLint + Prettier. Set up your editor to auto-format on save:
- **VS Code**: Install "ESLint" and "Prettier" extensions, enable "Format On Save"
- Run manually: `npm run lint:fix`

### Running Tests in Watch Mode
```bash
cd backend
npm run test -- --watch

cd mobile
npm test -- --watchAll
```
