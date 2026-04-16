# My Cricket Score

A full-featured cricket scoring and analytics mobile application built with React Native and Node.js. Score matches ball-by-ball, track player statistics, manage tournaments, and share live scores with your community.

<img width="568" height="1084" alt="image" src="https://github.com/user-attachments/assets/dd7c1753-c323-44c8-b22a-bdc2491c789e" />
<img width="568" height="1084" alt="image" src="https://github.com/user-attachments/assets/bb1eb1ab-bf51-4277-882a-396f49245c0c" />
<img width="568" height="1084" alt="image" src="https://github.com/user-attachments/assets/85b8b94c-9c0f-4501-a15b-66cc1894b477" />
<img width="568" height="1084" alt="image" src="https://github.com/user-attachments/assets/7ea62e36-0590-4d2c-9fa4-cb93769fd909" />


---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Quick Start](#quick-start)
- [Screenshots](#screenshots)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

My Cricket Score is designed for amateur and semi-professional cricket enthusiasts who want a professional-grade scoring experience on their mobile devices. Whether you're scoring a backyard T20, a club league ODI, or a multi-day tournament, the app handles everything from toss to final scorecard.

The app is monetized via a freemium subscription model:
- **Free**: 5 matches/month, basic stats, ad-supported
- **Pro** (₹149/month): Unlimited matches, advanced analytics, ad-free, PDF export, live sharing
- **Elite** (₹999/year): Everything in Pro + tournament management, custom branding, API access

---

## Features

### Core Scoring
- Ball-by-ball scoring (runs, extras, wickets)
- All dismissal types: Bowled, Caught, LBW, Run Out, Stumped, Hit Wicket, Obstructing Field
- Extras: Wide, No Ball, Bye, Leg Bye
- Undo last ball
- Declare innings (for Test matches)
- Retire hurt / retired out
- Super Over support
- Powerplay tracking

### Match Formats
- T20 (20 overs, 6-over powerplay)
- ODI (50 overs, 10-over powerplay)
- Test (unlimited overs, multi-innings)
- Custom (configurable overs, powerplay, players per side)

### Live Sharing
- Real-time score updates via WebSocket
- Shareable match link (no app required to view)
- Ball-by-ball commentary feed
- Push notifications for wickets and milestones

### Analytics
- Wagon wheel (wagon wheel shot map per batsman)
- Manhattan chart (runs per over histogram)
- Worm graph (cumulative run comparison)
- Partnership tracker
- Win probability (Duckworth-Lewis-informed model)
- Economy rate, strike rate, and moving averages
- Head-to-head player comparison

### Tournament Management (Elite)
- Round-robin group stages
- Knockout brackets
- Points table with NRR
- Fixture generator
- Tournament dashboard

### Social
- Follow/unfollow other scorers
- Activity feed
- Like, comment, and share match highlights
- Player and team profiles

### User Management
- Email/password registration
- Google Sign-In (OAuth 2.0)
- JWT authentication with refresh tokens
- Role-based access (Scorer, Viewer, Admin)

### Other
- PDF scorecard export
- Offline scoring (sync when reconnected)
- Search for players, teams, tournaments
- Camera integration for player/team photos
- Location-based nearby match discovery

---

## Architecture

```
+---------------------------------------------------+
|                  Mobile App (React Native)         |
|  +------------+  +----------+  +--------------+   |
|  |  Screens   |  |  Redux   |  | React Query  |   |
|  | (UI Layer) |  | (State)  |  | (Server State)|  |
|  +------------+  +----------+  +--------------+   |
|         |              |              |            |
|         +------+-------+--------------+            |
|                |                                   |
|         +------v------+                            |
|         | API Client  | <-- Axios + Interceptors   |
|         +------+------+                            |
+----------------|---------------------------------+
                 | HTTPS / WSS
+----------------v---------------------------------+
|              Backend (Node.js / Express)          |
|                                                   |
|  +----------+  +---------+  +----------------+   |
|  |  Auth    |  | REST API|  | WebSocket (ws) |   |
|  | Middleware|  | Routes  |  |  Score Events  |   |
|  +----------+  +---------+  +----------------+   |
|       |             |               |             |
|  +----v-------------v---------------v----+        |
|  |           Service Layer               |        |
|  |  (Business Logic / Validation)        |        |
|  +----+---------------------------+------+        |
|       |                           |               |
|  +----v-----+              +------v-----+         |
|  | Prisma   |              |  Redis     |         |
|  |   ORM    |              | (Cache /   |         |
|  +----+-----+              |  Sessions) |         |
|       |                    +------------+         |
|  +----v-----------+                               |
|  |  PostgreSQL 15 |                               |
|  |  (Primary DB)  |                               |
|  +----------------+                               |
+---------------------------------------------------+
         |
+--------v--------+    +------------------+
| Firebase Cloud  |    | Google OAuth 2.0 |
| Messaging (FCM) |    | (Sign-In)        |
+-----------------+    +------------------+
```

**Data Flow for Live Scoring:**
```
Scorer App --> POST /api/scoring/score-ball
    --> Prisma writes to PostgreSQL
    --> Redis publishes "ball:scored" event
    --> WebSocket server broadcasts to all viewers
    --> FCM sends push notification (milestones/wickets)
    --> Viewer Apps receive real-time update
```

---

## Tech Stack

| Layer | Technology | Justification |
|-------|-----------|--------------|
| Mobile | React Native 0.73 | Cross-platform (Android focus), large ecosystem, TypeScript support |
| State Management | Redux Toolkit + React Query | Redux for auth/global state; React Query for server cache with optimistic updates |
| Navigation | React Navigation 6 | De-facto standard, well-maintained, supports deep links |
| Backend | Node.js + Express | Fast I/O for WebSocket-heavy scoring; team familiarity |
| ORM | Prisma | Type-safe DB access, excellent migration tooling, PostgreSQL dialect |
| Database | PostgreSQL 15 | ACID compliance for scoring integrity; JSONB for flexible match data |
| Cache | Redis 7 | Pub/sub for live scores; session storage; rate limiting |
| Authentication | JWT (access + refresh) | Stateless, scalable; refresh tokens stored in Redis |
| OAuth | Google Sign-In (Firebase Auth) | Reduces registration friction on Android |
| Push Notifications | Firebase Cloud Messaging | Native Android support, reliable delivery |
| Real-time | WebSockets (ws library) | Low-latency score broadcasting; lighter than Socket.IO for this use case |
| Payments | Google Play Billing | In-app subscriptions; handles billing, receipts, renewals |
| Containerization | Docker + Docker Compose | Consistent dev/prod environments |
| CI/CD | GitHub Actions | Free for open-source, tight GitHub integration |

---

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 15+
- Redis 7+
- React Native CLI (`npm install -g react-native-cli`)
- **Android:** JDK 17 + Android SDK command-line tools (no Android Studio needed)
- **iOS:** Xcode 15+ with Command Line Tools (macOS only)
- Docker (optional, for containerized backend)

### Option A: Docker Compose (Recommended)

```bash
# Clone the repository
git clone https://github.com/yourusername/myscoreapp.git
cd myscoreapp

# Start all services
docker-compose up -d

# Run database migrations
docker-compose exec backend npx prisma migrate dev

# Seed sample data
docker-compose exec backend npx prisma db seed

# Access the API
curl http://localhost:3000/api/health
```

### Option B: Manual Setup

```bash
# 1. Clone
git clone https://github.com/yourusername/myscoreapp.git
cd myscoreapp

# 2. Backend setup
cd backend
cp .env.example .env
# Edit .env with your database/Redis credentials
npm install
npx prisma migrate dev
npx prisma db seed
npm run dev

# 3. Mobile setup (new terminal)
cd ../mobile
cp .env.example .env
npm install
npx react-native run-android   # Android
npx react-native run-ios       # iOS (macOS only)
```

For full setup instructions, see [docs/SETUP.md](docs/SETUP.md).

---

## Screenshots

### Home & Dashboard
The home screen displays a summary of recent matches, upcoming fixtures (if part of a tournament), and a quick-start button to begin a new match. The dashboard uses cricket-green (#1B5E20) as the primary color with amber (#FF6F00) accents for highlights and milestones.

### Scoring Screen
The main scoring interface shows the current over balls (color-coded by outcome), live scorecard with run rate and required rate, batsmen at the crease with their current scores, and the current bowler's figures. Large tap targets make scoring easy even under pressure.

### Scorecard View
Full scorecard in the traditional cricket format: batting table (batsman, dismissal method, runs, balls, 4s, 6s, SR) followed by bowling table (bowler, overs, maidens, runs, wickets, economy). Fall of wickets shown below.

### Wagon Wheel
Interactive wagon wheel showing where a batsman hit the ball across the 360-degree field, color-coded by shot type (drive, pull, cut, etc.). Filterable by over range or ball type.

### Tournament Bracket
Visual knockout bracket and scrollable points table with NRR for group stage tournaments. Automatic fixture generation with match date scheduling.

### Analytics Dashboard
Manhattan bar chart, worm/run comparison graph, partnership waterfall chart, and win probability gauge all on a single scrollable analytics screen.

---

## Contributing

Contributions are welcome! Please follow these steps:

1. **Fork** the repository and create your branch from `develop`:
   ```bash
   git checkout -b feature/your-feature-name develop
   ```

2. **Install dependencies** and ensure tests pass:
   ```bash
   cd backend && npm install && npm test
   ```

3. **Follow the code style**: ESLint + Prettier are configured. Run `npm run lint` before committing.

4. **Write tests**: New features require unit tests (Jest). Aim for >80% coverage on new code.

5. **Commit messages**: Follow Conventional Commits:
   ```
   feat(scoring): add retire hurt dismissal type
   fix(auth): refresh token not rotating on reuse
   docs(api): document wagon wheel endpoint
   ```

6. **Open a Pull Request** against `develop` with:
   - Description of changes
   - Screenshots for UI changes
   - Link to related issue (if any)

7. **Code review**: At least one maintainer approval required before merge.

### Project Structure

```
myscoreapp/
├── backend/                # Node.js/Express API
│   ├── src/
│   │   ├── controllers/    # Request handlers
│   │   ├── services/       # Business logic
│   │   ├── middleware/      # Auth, rate limit, validation
│   │   ├── routes/         # Express router definitions
│   │   ├── prisma/         # Schema, migrations, seed
│   │   └── utils/          # Helpers (jwt, logger, etc.)
│   ├── Dockerfile
│   └── package.json
├── mobile/                 # React Native app
│   ├── src/
│   │   ├── screens/        # Screen components
│   │   ├── components/     # Reusable UI components
│   │   ├── navigation/     # React Navigation config
│   │   ├── store/          # Redux slices
│   │   ├── hooks/          # Custom React hooks
│   │   ├── api/            # API client + React Query hooks
│   │   └── utils/          # Constants, formatters, helpers
│   └── android/            # Android-specific configs
├── docs/                   # Documentation
├── docker-compose.yml
└── README.md
```

### Reporting Bugs

Use the [bug report template](.github/ISSUE_TEMPLATE/bug_report.md). Include:
- Device model and Android version
- App version
- Steps to reproduce
- Expected vs. actual behavior
- Logs or screenshots

---

## License

This project is licensed under the **MIT License**. See [LICENSE](LICENSE) for details.

```
MIT License

Copyright (c) 2024 My Cricket Score

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or other
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
