# Architecture Overview

This document describes the system architecture of My Cricket Score — how components fit together, how live scoring flows through the stack, and how the app handles offline use and premium gating.

---

## System Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                  Android / iOS Mobile App                    │
│                   (React Native 0.73+)                       │
│                                                              │
│  ┌──────────────┐  ┌───────────────┐  ┌──────────────────┐  │
│  │   Screens    │  │ Redux Toolkit │  │  React Query     │  │
│  │  (UI Layer)  │  │ (Auth, Match  │  │  (Server Cache + │  │
│  │              │  │  State, Prefs)│  │  Optimistic Upd.)│  │
│  └──────┬───────┘  └───────┬───────┘  └────────┬─────────┘  │
│         └──────────────────┴──────────────┬─────┘            │
│                                           │                  │
│                              ┌────────────▼──────────┐       │
│                              │     API Client        │       │
│                              │  (Axios + JWT         │       │
│                              │   interceptors)       │       │
│                              └────────────┬──────────┘       │
│                                           │                  │
│                              ┌────────────▼──────────┐       │
│                              │   Socket.IO Client    │       │
│                              │   (live scoring)      │       │
│                              └────────────┬──────────┘       │
└──────────────────────────────────────────┼──────────────────┘
                                           │ HTTPS / WSS
┌──────────────────────────────────────────┼──────────────────┐
│                  Backend (Node.js + Express)                 │
│                                          │                  │
│  ┌──────────────────────────────────────▼────────────────┐  │
│  │              Express App (app.ts)                      │  │
│  │                                                        │  │
│  │  ┌────────────┐  ┌───────────────┐  ┌──────────────┐  │  │
│  │  │  Auth MW   │  │  REST Routes  │  │  Socket.IO   │  │  │
│  │  │  (JWT +    │  │  /api/...     │  │  Namespace   │  │  │
│  │  │  Passport) │  │               │  │  /scoring    │  │  │
│  │  └─────┬──────┘  └───────┬───────┘  └──────┬───────┘  │  │
│  │        └─────────────────┴──────────────────┘          │  │
│  │                          │                             │  │
│  │              ┌───────────▼─────────────┐               │  │
│  │              │      Service Layer       │               │  │
│  │              │  scoringEngine.ts        │               │  │
│  │              │  matchService.ts         │               │  │
│  │              │  analyticsService.ts     │               │  │
│  │              │  authService.ts          │               │  │
│  │              │  notificationService.ts  │               │  │
│  │              └──────┬──────────┬────────┘               │  │
│  │                     │          │                        │  │
│  │            ┌────────▼──┐  ┌────▼───────┐               │  │
│  │            │  Prisma   │  │   Redis    │               │  │
│  │            │  ORM      │  │  (ioredis) │               │  │
│  │            └────────┬──┘  └────────────┘               │  │
│  └─────────────────────┼───────────────────────────────────┘  │
│                        │                                     │
│               ┌────────▼────────┐                            │
│               │  PostgreSQL 15  │                            │
│               │  (Primary DB)   │                            │
│               └─────────────────┘                            │
└──────────────────────────────────────────────────────────────┘
         │                          │
┌────────▼────────┐     ┌───────────▼──────────┐
│  Firebase Cloud  │     │   Google OAuth 2.0   │
│  Messaging (FCM) │     │   (Passport + JWT)   │
└──────────────────┘     └──────────────────────┘
```

---

## Component Responsibilities

| Component | File(s) | Responsibility |
|-----------|---------|----------------|
| Scoring Engine | `services/scoringEngine.ts` | Core cricket rules: ball legality, wicket types, extras, over progression, match state machine |
| Match Service | `services/matchService.ts` | CRUD for matches, innings orchestration, scorecard aggregation |
| Analytics Service | `services/analyticsService.ts` | Wagon wheel, Manhattan chart, worm graph, win probability, head-to-head stats |
| Auth Service | `services/authService.ts` | Registration, login, Google OAuth, JWT rotation, refresh token Redis storage |
| Notification Service | `services/notificationService.ts` | FCM push for wickets, milestones, match results |
| Subscription Service | `services/subscriptionService.ts` | Google Play billing verification, plan gating |
| Live Scoring Socket | `socket/liveScoring.ts` | Socket.IO rooms per match, broadcasts BALL_SCORED / INNINGS_UPDATE / MATCH_COMPLETE events |

---

## Scoring Engine Design

The scoring engine (`scoringEngine.ts`) is a pure state machine. Every call to `scoreBall()` passes through these stages:

```
Input: { inningsId, ballData }
         │
         ▼
┌─────────────────────┐
│  1. Validate Ball   │  — check innings is IN_PROGRESS, over limits, batsman on strike
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  2. Classify Ball   │  — LEGAL | WIDE | NO_BALL | BYE | LEG_BYE
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  3. Score Runs      │  — update batsman (runs, balls, 4s, 6s), update bowler, update innings totals
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  4. Handle Wicket   │  — record dismissal type, fielder, bowler; mark batsman out; check ALL_OUT
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  5. Advance State   │  — increment legal ball count; if 6 legal → end over; if max overs → OVERS_COMPLETE
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  6. Check Win       │  — innings 2: check target achieved (TARGET_ACHIEVED); check D/L if applicable
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  7. Persist to DB   │  — Prisma transaction: Ball record + BatsmanInnings + BowlerInnings + Innings aggregate
└─────────┬───────────┘
          │
          ▼
   Return: BallResult { inningsUpdate, batsmanUpdate, bowlerUpdate, events[] }
```

**Key design decisions:**
- All DB writes happen inside a **single Prisma transaction** per ball to guarantee consistency.
- The engine returns an `events[]` array (e.g. `FIFTY`, `CENTURY`, `WICKET`, `OVER_COMPLETE`) which the socket layer broadcasts to viewers.
- Undo is implemented by deleting the last `Ball` record and recalculating the aggregate — no event sourcing, simple re-aggregate.

---

## Real-Time Scoring Flow

```
Scorer taps "4 runs" in mobile app
         │
         ▼
POST /api/scoring/score-ball
  { inningsId, runs: 4, isWide: false, ... }
         │
         ▼
scoringEngine.scoreBall()
  → Prisma transaction (Ball + aggregate update)
  → Returns BallResult { events: ['BOUNDARY'] }
         │
         ▼
Redis PUBLISH  match:<matchId>:ball  <BallResult JSON>
         │
         ▼
Socket.IO server receives Redis message
  → io.to(`match:${matchId}`).emit('ball_scored', ballResult)
         │
    ┌────┴──────────────┐
    ▼                   ▼
Viewer App A        Viewer App B
(WebSocket)         (WebSocket)
receives            receives
'ball_scored'       'ball_scored'
updates UI          updates UI

If events include WICKET or milestone:
         │
         ▼
notificationService.sendPush()
  → FCM push to followers of the match
```

Socket events emitted by the server:

| Event | Direction | Payload |
|-------|-----------|---------|
| `join_match` | Client → Server | `{ matchId }` |
| `leave_match` | Client → Server | `{ matchId }` |
| `ball_scored` | Server → Client | `BallResult` |
| `innings_update` | Server → Client | `InningsSummary` |
| `over_complete` | Server → Client | `{ overNumber, runs, wickets, bowler }` |
| `innings_complete` | Server → Client | `InningsSummary` |
| `match_complete` | Server → Client | `{ result, winnerTeamId }` |
| `win_probability_update` | Server → Client | `{ team1Prob, team2Prob }` |
| `milestone` | Server → Client | `{ type, playerId, description }` |
| `commentary` | Server → Client | `{ ball, text }` |

---

## Offline Sync Architecture

The mobile app can score matches without internet and sync when connectivity returns.

```
No network detected
         │
         ▼
Ball data written to AsyncStorage queue
  key: offline_queue_<matchId>
  value: BallData[]
         │
         │  (Network restored)
         ▼
Background sync worker reads queue
  → POST /api/scoring/score-ball for each queued ball
  → On success: remove from queue
  → On conflict (ball already exists): skip (idempotent)
         │
         ▼
WebSocket reconnects, requests latest state
  → socket.emit('join_match', { matchId })
  → Server sends full scorecard snapshot
```

**Conflict resolution:** Each ball has a client-generated UUID. The server uses upsert semantics, so replaying the same ball twice is safe.

**Limitation:** Offline scoring disables real-time broadcasting. Viewers see the scores only after sync completes.

---

## Premium Gating

Subscription tiers are enforced at the **service layer**, not the route layer.

```typescript
// Example: analytics endpoint
async getWagonWheel(matchId, userId) {
  const user = await getUser(userId);
  if (user.plan === 'FREE') {
    throw new PremiumRequiredError('Wagon wheel requires Pro plan');
  }
  // ... compute wagon wheel
}
```

Tier matrix:

| Feature | FREE | PRO | ELITE |
|---------|------|-----|-------|
| Matches per month | 5 | Unlimited | Unlimited |
| Basic scorecard | ✓ | ✓ | ✓ |
| Live sharing | ✗ | ✓ | ✓ |
| Advanced analytics (wagon wheel, worm, Manhattan) | ✗ | ✓ | ✓ |
| PDF export | ✗ | ✓ | ✓ |
| Tournament management | ✗ | ✗ | ✓ |
| Custom team branding | ✗ | ✗ | ✓ |
| API access | ✗ | ✗ | ✓ |
| Ads | Yes | No | No |

Subscription status is verified via **Google Play Billing** (`subscriptionService.ts`) and stored in the `Subscription` table. The JWT payload includes the user's current `plan` field so the mobile app can gate UI elements without an extra API call.

---

## Database Schema Overview

Key tables and their relationships:

```
User ──< Subscription
User ──< Match (createdBy)
Team ──< TeamPlayer >── Player
Match ──< Innings
Innings ──< Ball
Innings ──< BatsmanInnings >── Player
Innings ──< BowlerInnings >── Player
Innings ──< Highlight
Tournament ──< TournamentTeam >── Team
Tournament ──< Match
Player ── PlayerCareerStats
```

**Ball record** stores the ground truth for every delivery:
- `legalBallNumber` — position in innings (for undo/replay)
- `overNumber`, `ballInOver` — over/ball coordinates
- `runs`, `isWide`, `isNoBall`, `isBye`, `isLegBye` — ball type
- `isWicket`, `wicketType`, `dismissedPlayerId` — dismissal info
- `shotZone` — wagon wheel quadrant (OFF_SIDE, ON_SIDE, STRAIGHT, etc.)

---

## Key Architectural Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Real-time protocol | Socket.IO over WebSocket | Handles reconnection and room management better than raw `ws` for a mobile-first app |
| State management | Redux (auth/global) + React Query (server) | Redux for long-lived client state; React Query handles cache invalidation for frequently-changing match data |
| DB for scoring | PostgreSQL with Prisma transactions | ACID guarantees per ball — scoring is write-heavy but correctness is critical |
| Cache / pub-sub | Redis | Lightweight pub/sub for live broadcasting; refresh token storage; rate limit counters |
| Offline queue | AsyncStorage + retry worker | Simple FIFO queue; idempotent server writes make replay safe |
| Auth | JWT + refresh rotation | Stateless access token; refresh tokens revocable via Redis deletion |
| Monorepo vs polyrepo | Monorepo (backend + mobile in one repo) | Easier to keep schema, types, and API contracts in sync during active development |
