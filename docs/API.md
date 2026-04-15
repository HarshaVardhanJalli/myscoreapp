# My Cricket Score — REST API Documentation

## Base URL

| Environment | URL |
|-------------|-----|
| Development | `http://localhost:3000/api` |
| Staging | `https://staging-api.myscoreapp.com/api` |
| Production | `https://api.myscoreapp.com/api` |

---

## Authentication

The API uses **JWT Bearer tokens**. Include the access token in every authenticated request:

```
Authorization: Bearer <access_token>
```

Access tokens expire after **15 minutes**. Use the refresh endpoint to obtain a new one. Refresh tokens expire after **7 days** and are stored server-side in Redis (one active refresh token per user).

### Token Structure (decoded)

```typescript
interface JWTPayload {
  sub: string;        // User ID (UUID)
  email: string;
  role: 'USER' | 'ADMIN';
  plan: 'FREE' | 'PRO' | 'ELITE';
  iat: number;        // Issued at (Unix timestamp)
  exp: number;        // Expiry (Unix timestamp)
}
```

---

## Rate Limiting

| Tier | Requests per minute |
|------|-------------------|
| Unauthenticated | 30 |
| Free users | 60 |
| Pro users | 200 |
| Elite users | 600 |
| Admin | Unlimited |

Rate limit headers returned on every response:
```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1704067200
```

When exceeded, the API returns `429 Too Many Requests`.

---

## Standard Error Response

```typescript
interface ErrorResponse {
  success: false;
  error: {
    code: string;       // Machine-readable error code
    message: string;    // Human-readable description
    details?: object;   // Validation errors or additional context
  };
}
```

### Common Error Codes

| HTTP Status | Code | Description |
|-------------|------|-------------|
| 400 | VALIDATION_ERROR | Request body/params failed validation |
| 401 | UNAUTHORIZED | Missing or invalid access token |
| 401 | TOKEN_EXPIRED | Access token has expired |
| 403 | FORBIDDEN | Authenticated but insufficient permissions |
| 403 | PLAN_LIMIT_REACHED | Operation exceeds subscription plan limits |
| 404 | NOT_FOUND | Resource does not exist |
| 409 | CONFLICT | Resource already exists (duplicate) |
| 429 | RATE_LIMIT_EXCEEDED | Too many requests |
| 500 | INTERNAL_ERROR | Unexpected server error |

---

## Standard Success Response

```typescript
interface SuccessResponse<T> {
  success: true;
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}
```

---

## Endpoints

---

### Auth

#### POST /auth/register

Register a new user account.

**Request Body:**
```typescript
interface RegisterRequest {
  name: string;           // 2–60 characters
  email: string;          // Valid email
  password: string;       // Min 8 chars, 1 uppercase, 1 digit
}
```

**Response:**
```typescript
interface RegisterResponse {
  user: {
    id: string;
    name: string;
    email: string;
    plan: 'FREE';
    createdAt: string;    // ISO 8601
  };
  accessToken: string;
  refreshToken: string;
}
```

**Example:**
```bash
curl -X POST https://api.myscoreapp.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Rahul Sharma",
    "email": "rahul@example.com",
    "password": "Cricket@2024"
  }'
```

**Error Codes:** `VALIDATION_ERROR`, `CONFLICT` (email already registered)

---

#### POST /auth/login

Login with email and password.

**Request Body:**
```typescript
interface LoginRequest {
  email: string;
  password: string;
}
```

**Response:** Same as `RegisterResponse`.

**Example:**
```bash
curl -X POST https://api.myscoreapp.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "rahul@example.com", "password": "Cricket@2024"}'
```

**Error Codes:** `VALIDATION_ERROR`, `UNAUTHORIZED` (invalid credentials)

---

#### POST /auth/google

Authenticate using a Google ID token (from Firebase Auth or Google Sign-In SDK).

**Request Body:**
```typescript
interface GoogleAuthRequest {
  idToken: string;        // Google ID token from client SDK
}
```

**Response:** Same as `RegisterResponse`. Creates account on first sign-in.

**Example:**
```bash
curl -X POST https://api.myscoreapp.com/api/auth/google \
  -H "Content-Type: application/json" \
  -d '{"idToken": "eyJhbGciOiJSUzI1NiIsImtpZCI6..."}'
```

---

#### POST /auth/refresh

Exchange a refresh token for a new access token.

**Request Body:**
```typescript
interface RefreshRequest {
  refreshToken: string;
}
```

**Response:**
```typescript
interface RefreshResponse {
  accessToken: string;
  refreshToken: string;   // New rotated refresh token
}
```

**Example:**
```bash
curl -X POST https://api.myscoreapp.com/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "eyJhbGciOiJIUzI1NiJ9..."}'
```

**Error Codes:** `UNAUTHORIZED` (invalid/expired/reused refresh token)

---

#### POST /auth/logout

Invalidate the current refresh token.

**Auth:** Required

**Request Body:**
```typescript
interface LogoutRequest {
  refreshToken: string;
}
```

**Response:** `{ success: true, data: { message: "Logged out successfully" } }`

---

### Users

#### GET /users/me

Get the authenticated user's profile.

**Auth:** Required

**Response:**
```typescript
interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  bio: string | null;
  plan: 'FREE' | 'PRO' | 'ELITE';
  planExpiresAt: string | null;
  followersCount: number;
  followingCount: number;
  matchesScored: number;
  createdAt: string;
}
```

**Example:**
```bash
curl https://api.myscoreapp.com/api/users/me \
  -H "Authorization: Bearer <token>"
```

---

#### PATCH /users/me

Update the authenticated user's profile.

**Auth:** Required

**Request Body:**
```typescript
interface UpdateProfileRequest {
  name?: string;          // 2–60 characters
  bio?: string;           // Max 160 characters
  avatarUrl?: string;     // Valid URL (use upload endpoint first)
}
```

**Example:**
```bash
curl -X PATCH https://api.myscoreapp.com/api/users/me \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"bio": "Club cricketer | Scorer | Mumbai"}'
```

---

#### GET /users/:userId

Get a public user profile.

**Response:**
```typescript
interface PublicUserProfile {
  id: string;
  name: string;
  avatarUrl: string | null;
  bio: string | null;
  followersCount: number;
  followingCount: number;
  matchesScored: number;
  isFollowing: boolean;   // Only present if authenticated
}
```

---

#### POST /users/:userId/follow

Follow a user.

**Auth:** Required

**Response:** `{ success: true, data: { followersCount: 42 } }`

**Error Codes:** `NOT_FOUND`, `CONFLICT` (already following)

---

#### DELETE /users/:userId/follow

Unfollow a user.

**Auth:** Required

**Response:** `{ success: true, data: { followersCount: 41 } }`

---

#### GET /users/:userId/followers

Get a user's followers list (paginated).

**Query Params:** `page` (default: 1), `limit` (default: 20, max: 50)

**Response:** `SuccessResponse<PublicUserProfile[]>` with pagination meta.

---

#### GET /users/:userId/following

Get accounts a user is following (paginated).

**Query Params:** `page`, `limit`

**Response:** `SuccessResponse<PublicUserProfile[]>` with pagination meta.

---

### Players

#### GET /players

Search and list players.

**Query Params:**
```
q          string   Search term (name)
teamId     string   Filter by team UUID
page       number   Default: 1
limit      number   Default: 20, max: 50
```

**Response:**
```typescript
interface PlayerListItem {
  id: string;
  name: string;
  jerseyNumber: number | null;
  battingStyle: 'RIGHT_HAND' | 'LEFT_HAND' | null;
  bowlingStyle: string | null;   // e.g. "Right Arm Fast", "Left Arm Spin"
  role: 'BATSMAN' | 'BOWLER' | 'ALL_ROUNDER' | 'WICKET_KEEPER';
  avatarUrl: string | null;
  teamId: string | null;
}
```

**Example:**
```bash
curl "https://api.myscoreapp.com/api/players?q=virat&limit=10" \
  -H "Authorization: Bearer <token>"
```

---

#### POST /players

Create a new player.

**Auth:** Required

**Request Body:**
```typescript
interface CreatePlayerRequest {
  name: string;
  jerseyNumber?: number;
  battingStyle?: 'RIGHT_HAND' | 'LEFT_HAND';
  bowlingStyle?: string;
  role: 'BATSMAN' | 'BOWLER' | 'ALL_ROUNDER' | 'WICKET_KEEPER';
  avatarUrl?: string;
  dateOfBirth?: string;  // ISO 8601 date
}
```

**Response:** Full `Player` object.

---

#### GET /players/:playerId

Get a player's full profile including career stats.

**Response:**
```typescript
interface PlayerDetail {
  id: string;
  name: string;
  jerseyNumber: number | null;
  battingStyle: string | null;
  bowlingStyle: string | null;
  role: string;
  avatarUrl: string | null;
  dateOfBirth: string | null;
  teams: { id: string; name: string }[];
  careerStats: {
    batting: {
      matches: number;
      innings: number;
      runs: number;
      balls: number;
      highScore: number;
      average: number;
      strikeRate: number;
      hundreds: number;
      fifties: number;
      fours: number;
      sixes: number;
    };
    bowling: {
      matches: number;
      innings: number;
      overs: number;
      runs: number;
      wickets: number;
      bestBowling: string;     // e.g. "5/23"
      average: number;
      economy: number;
      strikeRate: number;
      fiveWicketHauls: number;
    };
  };
}
```

**Example:**
```bash
curl "https://api.myscoreapp.com/api/players/a1b2c3d4-e5f6-7890-abcd-ef1234567890" \
  -H "Authorization: Bearer <token>"
```

---

#### PATCH /players/:playerId

Update a player's details.

**Auth:** Required (must be creator or admin)

**Request Body:** Partial `CreatePlayerRequest`

---

#### DELETE /players/:playerId

Delete a player record.

**Auth:** Required (must be creator or admin)

**Response:** `{ success: true, data: { message: "Player deleted" } }`

---

#### GET /players/compare

Compare two players' statistics.

**Query Params:**
```
playerA    string (UUID, required)
playerB    string (UUID, required)
format     'T20' | 'ODI' | 'TEST' | 'ALL'  (default: ALL)
```

**Response:**
```typescript
interface ComparisonResponse {
  playerA: PlayerDetail;
  playerB: PlayerDetail;
  comparison: {
    batting: Record<string, { playerA: number; playerB: number; winner: 'A' | 'B' | 'DRAW' }>;
    bowling: Record<string, { playerA: number; playerB: number; winner: 'A' | 'B' | 'DRAW' }>;
  };
}
```

---

### Teams

#### GET /teams

List teams owned by the authenticated user.

**Auth:** Required

**Response:** `SuccessResponse<Team[]>`

```typescript
interface Team {
  id: string;
  name: string;
  shortName: string;       // 2–4 characters, e.g. "RCB"
  logoUrl: string | null;
  homeGround: string | null;
  playersCount: number;
  createdAt: string;
}
```

---

#### POST /teams

Create a new team.

**Auth:** Required (Free: max 2 teams; Pro/Elite: unlimited)

**Request Body:**
```typescript
interface CreateTeamRequest {
  name: string;           // 2–60 characters
  shortName: string;      // 2–4 uppercase letters
  logoUrl?: string;
  homeGround?: string;
}
```

---

#### GET /teams/:teamId

Get team details with full player roster.

**Response:**
```typescript
interface TeamDetail extends Team {
  players: PlayerListItem[];
  stats: {
    matchesPlayed: number;
    wins: number;
    losses: number;
    ties: number;
    winPercentage: number;
    highestScore: number;
    lowestScore: number;
  };
}
```

---

#### PATCH /teams/:teamId

Update team details.

**Auth:** Required (team owner or admin)

---

#### DELETE /teams/:teamId

Delete a team.

**Auth:** Required (team owner or admin)

---

#### POST /teams/:teamId/players

Add a player to a team.

**Auth:** Required

**Request Body:**
```typescript
interface AddPlayerRequest {
  playerId: string;
  role?: string;
}
```

---

#### DELETE /teams/:teamId/players/:playerId

Remove a player from a team.

**Auth:** Required

---

#### GET /teams/:teamId/stats

Get aggregated team statistics.

**Query Params:** `format` ('T20' | 'ODI' | 'TEST' | 'ALL'), `season` (year)

---

### Tournaments

#### GET /tournaments

List tournaments (public + user's own).

**Query Params:** `q`, `status` ('UPCOMING' | 'ONGOING' | 'COMPLETED'), `page`, `limit`

**Response:**
```typescript
interface Tournament {
  id: string;
  name: string;
  format: 'T20' | 'ODI' | 'TEST' | 'CUSTOM';
  type: 'ROUND_ROBIN' | 'KNOCKOUT' | 'LEAGUE_KNOCKOUT';
  status: 'DRAFT' | 'UPCOMING' | 'ONGOING' | 'COMPLETED';
  startDate: string;
  endDate: string | null;
  teamsCount: number;
  matchesCount: number;
  createdBy: { id: string; name: string };
}
```

---

#### POST /tournaments

Create a tournament.

**Auth:** Required (Elite plan)

**Request Body:**
```typescript
interface CreateTournamentRequest {
  name: string;
  format: 'T20' | 'ODI' | 'TEST' | 'CUSTOM';
  type: 'ROUND_ROBIN' | 'KNOCKOUT' | 'LEAGUE_KNOCKOUT';
  startDate: string;      // ISO 8601
  teams: string[];        // Array of team UUIDs
  customOvers?: number;   // Required if format is CUSTOM
}
```

---

#### GET /tournaments/:tournamentId

Get full tournament details including teams.

---

#### GET /tournaments/:tournamentId/fixtures

Get all match fixtures for the tournament.

**Response:** `SuccessResponse<MatchSummary[]>` ordered by scheduled date.

---

#### GET /tournaments/:tournamentId/points-table

Get the points table (for round-robin/league stages).

**Response:**
```typescript
interface PointsTable {
  groups: Array<{
    name: string;
    entries: Array<{
      team: { id: string; name: string; shortName: string; logoUrl: string | null };
      played: number;
      won: number;
      lost: number;
      tied: number;
      noResult: number;
      points: number;
      nrr: number;           // Net Run Rate
      runsFor: number;
      oversFor: number;
      runsAgainst: number;
      oversAgainst: number;
    }>;
  }>;
}
```

---

#### GET /tournaments/:tournamentId/knockouts

Get the knockout bracket.

**Response:**
```typescript
interface KnockoutBracket {
  rounds: Array<{
    name: string;           // "Quarter Final", "Semi Final", "Final"
    matches: Array<{
      id: string;
      teamA: { id: string; name: string } | null;
      teamB: { id: string; name: string } | null;
      winner: { id: string; name: string } | null;
      scheduledAt: string | null;
      status: string;
    }>;
  }>;
}
```

---

### Matches

#### GET /matches

List matches (owned + public).

**Query Params:** `status` ('UPCOMING' | 'LIVE' | 'COMPLETED'), `teamId`, `tournamentId`, `page`, `limit`

**Response:**
```typescript
interface MatchSummary {
  id: string;
  title: string;
  format: 'T20' | 'ODI' | 'TEST' | 'CUSTOM';
  status: 'CREATED' | 'TOSS' | 'IN_PROGRESS' | 'INNINGS_BREAK' | 'COMPLETED';
  teamA: { id: string; name: string; shortName: string; logoUrl: string | null };
  teamB: { id: string; name: string; shortName: string; logoUrl: string | null };
  venue: string | null;
  scheduledAt: string | null;
  result: string | null;      // e.g. "Team A won by 23 runs"
  liveScore: {                // Only present for LIVE matches
    batting: string;
    score: string;            // e.g. "145/3"
    overs: string;            // e.g. "15.2"
    crr: number;
  } | null;
}
```

---

#### POST /matches

Create a new match.

**Auth:** Required

**Request Body:**
```typescript
interface CreateMatchRequest {
  teamAId: string;
  teamBId: string;
  format: 'T20' | 'ODI' | 'TEST' | 'CUSTOM';
  venue?: string;
  scheduledAt?: string;
  tournamentId?: string;
  customOvers?: number;
  customPlayersPerSide?: number;
}
```

---

#### GET /matches/:matchId

Get full match details.

**Response:**
```typescript
interface MatchDetail {
  id: string;
  title: string;
  format: string;
  status: string;
  overs: number;
  playersPerSide: number;
  venue: string | null;
  scheduledAt: string | null;
  teamA: TeamDetail;
  teamB: TeamDetail;
  toss: {
    winnerId: string;
    decision: 'BAT' | 'BOWL';
  } | null;
  innings: InningsSummary[];
  result: string | null;
  manOfTheMatch: PlayerListItem | null;
  tournamentId: string | null;
}
```

---

#### POST /matches/:matchId/toss

Record toss result.

**Auth:** Required (match scorer)

**Request Body:**
```typescript
interface TossRequest {
  winnerId: string;           // Team ID that won the toss
  decision: 'BAT' | 'BOWL';
}
```

---

#### POST /matches/:matchId/playing-xi

Set playing 11 for a team.

**Auth:** Required

**Request Body:**
```typescript
interface PlayingXIRequest {
  teamId: string;
  playerIds: string[];        // Exactly 11 (or customPlayersPerSide) player UUIDs
  captainId: string;
  wicketKeeperId: string;
}
```

---

#### POST /matches/:matchId/start-innings

Start a new innings.

**Auth:** Required

**Request Body:**
```typescript
interface StartInningsRequest {
  battingTeamId: string;
  openingBatsmen: [string, string];    // Two player UUIDs
  openingBowler: string;               // Player UUID
}
```

**Response:** Full `Innings` object with initial state.

---

#### GET /matches/:matchId/scorecard

Get the full scorecard for a completed or in-progress match.

**Response:**
```typescript
interface Scorecard {
  matchId: string;
  innings: Array<{
    inningsNumber: number;
    battingTeam: { id: string; name: string };
    bowlingTeam: { id: string; name: string };
    totalRuns: number;
    totalWickets: number;
    totalOvers: string;       // e.g. "19.3"
    extras: { wides: number; noBalls: number; byes: number; legByes: number; total: number };
    batting: Array<{
      player: PlayerListItem;
      dismissal: string;       // e.g. "c Kohli b Bumrah"
      runs: number;
      balls: number;
      fours: number;
      sixes: number;
      strikeRate: number;
      didNotBat: boolean;
    }>;
    bowling: Array<{
      player: PlayerListItem;
      overs: number;
      maidens: number;
      runs: number;
      wickets: number;
      economy: number;
      wides: number;
      noBalls: number;
    }>;
    fallOfWickets: Array<{ wicketNumber: number; runs: number; overs: string; player: string }>;
  }>;
  result: string | null;
  manOfTheMatch: PlayerListItem | null;
}
```

**Example:**
```bash
curl "https://api.myscoreapp.com/api/matches/abc123/scorecard" \
  -H "Authorization: Bearer <token>"
```

---

#### GET /matches/:matchId/live

Get live match state (polling-friendly, also available via WebSocket).

**Response:**
```typescript
interface LiveMatchState {
  matchId: string;
  status: string;
  currentInnings: number;
  batting: {
    teamId: string;
    teamName: string;
    score: number;
    wickets: number;
    overs: number;
    balls: number;
    runRate: number;
    requiredRate: number | null;
    target: number | null;
    striker: { player: PlayerListItem; runs: number; balls: number; fours: number; sixes: number };
    nonStriker: { player: PlayerListItem; runs: number; balls: number; fours: number; sixes: number };
  };
  currentOver: Array<{ ball: number; result: string; runs: number }>;
  currentBowler: { player: PlayerListItem; overs: number; runs: number; wickets: number; economy: number };
  recentOvers: Array<{ over: number; runs: number; balls: string[] }>;
  lastBallResult: string | null;
}
```

---

### Scoring

#### POST /matches/:matchId/innings/:inningsId/score-ball

Record a delivery. This is the core scoring endpoint.

**Auth:** Required (match scorer)

**Request Body:**
```typescript
interface ScoreBallRequest {
  // Delivery outcome (mutually exclusive primary outcomes)
  runs?: number;              // Runs scored off the bat (0-6), default 0
  isWide?: boolean;
  isNoBall?: boolean;
  isBye?: boolean;
  isLegBye?: boolean;
  extraRuns?: number;         // Runs from extras (e.g., overthrows on wide)

  // Wicket (optional, can occur on any ball including no-ball)
  wicket?: {
    type: 'BOWLED' | 'CAUGHT' | 'LBW' | 'RUN_OUT' | 'STUMPED' | 'HIT_WICKET' | 'OBSTRUCTING_FIELD';
    batsmanId: string;
    fielderId?: string;       // Fielder who took catch or effected run-out
    nextBatsmanId?: string;   // New batsman UUID (omit for last wicket)
  };

  // Batsmen (required if striker/non-striker swap due to odd runs)
  strikerId: string;
  nonStrikerId: string;
  bowlerId: string;
}
```

**Response:** Updated `LiveMatchState`

**Example:**
```bash
# Score a 4 off the bat
curl -X POST "https://api.myscoreapp.com/api/matches/abc123/innings/inn456/score-ball" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "runs": 4,
    "strikerId": "bat001",
    "nonStrikerId": "bat002",
    "bowlerId": "bowl001"
  }'

# Score a wide with 1 extra run
curl -X POST "https://api.myscoreapp.com/api/matches/abc123/innings/inn456/score-ball" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "isWide": true,
    "extraRuns": 1,
    "strikerId": "bat001",
    "nonStrikerId": "bat002",
    "bowlerId": "bowl001"
  }'

# Record a caught dismissal
curl -X POST "https://api.myscoreapp.com/api/matches/abc123/innings/inn456/score-ball" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "runs": 0,
    "wicket": {
      "type": "CAUGHT",
      "batsmanId": "bat001",
      "fielderId": "field003",
      "nextBatsmanId": "bat008"
    },
    "strikerId": "bat001",
    "nonStrikerId": "bat002",
    "bowlerId": "bowl001"
  }'
```

**Error Codes:** `FORBIDDEN` (not scorer), `VALIDATION_ERROR` (invalid ball), `CONFLICT` (innings already complete)

---

#### POST /matches/:matchId/innings/:inningsId/undo

Undo the last recorded delivery.

**Auth:** Required (match scorer)

**Response:** Updated `LiveMatchState`

**Limits:** Can undo up to 5 consecutive balls. Cannot undo across innings.

---

#### POST /matches/:matchId/innings/:inningsId/end-over

Manually end the current over (e.g., when changing bowler mid-over in an error correction).

**Auth:** Required

**Request Body:**
```typescript
interface EndOverRequest {
  nextBowlerId: string;
}
```

---

#### POST /matches/:matchId/innings/:inningsId/declare

Declare the batting innings (Test matches only).

**Auth:** Required (match scorer)

**Response:** Updated match state with innings marked as DECLARED.

---

#### POST /matches/:matchId/complete

Mark the match as complete and set the result.

**Auth:** Required (match scorer)

**Request Body:**
```typescript
interface CompleteMatchRequest {
  result: string;              // e.g. "Team A won by 23 runs"
  manOfTheMatchId?: string;    // Player UUID
  duckworthLewis?: boolean;    // Was D/L method applied?
}
```

---

### Analytics

#### GET /matches/:matchId/innings/:inningsId/wagon-wheel/:playerId

Get wagon wheel data for a batsman in a specific innings.

**Response:**
```typescript
interface WagonWheelData {
  playerId: string;
  playerName: string;
  shots: Array<{
    ballNumber: number;
    runs: number;
    angle: number;       // 0–359 degrees (0 = straight, 90 = square leg)
    region: 'FINE_LEG' | 'SQUARE_LEG' | 'MID_WICKET' | 'MID_ON' | 'MID_OFF' | 'COVER' | 'POINT' | 'THIRD_MAN';
    isBoundary: boolean;
  }>;
  summary: {
    runsOnside: number;
    runsOffside: number;
    runsStraight: number;
  };
}
```

---

#### GET /matches/:matchId/manhattan

Get the Manhattan chart data (runs and wickets per over).

**Response:**
```typescript
interface ManhattanData {
  innings: Array<{
    inningsNumber: number;
    teamName: string;
    overs: Array<{
      over: number;
      runs: number;
      wickets: number;
      balls: string[];    // e.g. ["1", "0", "4", "W", "2", "1"]
    }>;
  }>;
}
```

---

#### GET /matches/:matchId/partnerships

Get partnership data for all innings.

**Response:**
```typescript
interface PartnershipData {
  innings: Array<{
    inningsNumber: number;
    partnerships: Array<{
      wicket: number;
      batsman1: { id: string; name: string; runs: number };
      batsman2: { id: string; name: string; runs: number };
      totalRuns: number;
      totalBalls: number;
      runRate: number;
    }>;
  }>;
}
```

---

#### GET /matches/:matchId/win-probability

Get ball-by-ball win probability data for completed or in-progress matches.

**Response:**
```typescript
interface WinProbabilityData {
  teamA: { id: string; name: string };
  teamB: { id: string; name: string };
  dataPoints: Array<{
    inningsNumber: number;
    over: number;
    ball: number;
    teamAWinProbability: number;    // 0.0 – 1.0
    teamBWinProbability: number;
  }>;
  currentProbability: {
    teamA: number;
    teamB: number;
  };
}
```

---

#### GET /matches/:matchId/highlights

Get automatically generated match highlights (significant events).

**Response:**
```typescript
interface HighlightEvent {
  type: 'SIX' | 'FOUR' | 'WICKET' | 'MAIDEN' | 'FIFTY' | 'HUNDRED' | 'FIVE_WICKETS' | 'HAT_TRICK';
  description: string;
  over: string;
  player: PlayerListItem;
  timestamp: string;
}
```

---

### Social

#### GET /social/feed

Get the activity feed for the authenticated user (matches from followed users).

**Auth:** Required

**Query Params:** `page`, `limit`

**Response:**
```typescript
interface FeedItem {
  id: string;
  type: 'MATCH_COMPLETED' | 'MATCH_STARTED' | 'MILESTONE' | 'TOURNAMENT_CREATED';
  user: { id: string; name: string; avatarUrl: string | null };
  match?: MatchSummary;
  tournament?: Tournament;
  description: string;
  likesCount: number;
  commentsCount: number;
  isLiked: boolean;
  createdAt: string;
}
```

---

#### POST /social/feed/:itemId/like

Like a feed item.

**Auth:** Required

**Response:** `{ success: true, data: { likesCount: 15 } }`

---

#### DELETE /social/feed/:itemId/like

Unlike a feed item.

**Auth:** Required

---

#### GET /social/feed/:itemId/comments

Get comments on a feed item.

**Query Params:** `page`, `limit`

**Response:**
```typescript
interface Comment {
  id: string;
  user: { id: string; name: string; avatarUrl: string | null };
  text: string;
  createdAt: string;
}
```

---

#### POST /social/feed/:itemId/comments

Post a comment.

**Auth:** Required

**Request Body:**
```typescript
interface PostCommentRequest {
  text: string;   // 1–500 characters
}
```

---

#### POST /social/matches/:matchId/share

Generate a shareable public link for a match.

**Auth:** Required

**Response:**
```typescript
interface ShareResponse {
  shareUrl: string;           // e.g. "https://scores.myscoreapp.com/m/abc123"
  expiresAt: string | null;   // null = never expires
}
```

---

### Subscriptions

#### GET /subscriptions/plans

Get all available subscription plans.

**Response:**
```typescript
interface Plan {
  id: string;                 // e.g. "com.myscoreapp.pro_monthly"
  name: string;
  price: number;              // In INR paise (e.g. 14900 = ₹149)
  currency: 'INR';
  interval: 'MONTHLY' | 'YEARLY' | 'LIFETIME';
  features: string[];
  limits: {
    matchesPerMonth: number;  // -1 = unlimited
    playersPerTeam: number;
    teamsCount: number;
  };
}
```

---

#### POST /subscriptions/subscribe

Initiate a subscription purchase.

**Auth:** Required

**Request Body:**
```typescript
interface SubscribeRequest {
  planId: string;
  platform: 'ANDROID' | 'IOS';
}
```

**Response:**
```typescript
interface SubscribeResponse {
  orderId: string;            // Google Play order ID or internal order
  status: 'PENDING';
}
```

---

#### POST /subscriptions/verify

Verify and activate a subscription after Google Play purchase.

**Auth:** Required

**Request Body:**
```typescript
interface VerifySubscriptionRequest {
  platform: 'ANDROID';
  purchaseToken: string;      // From Google Play Billing Library
  productId: string;          // e.g. "com.myscoreapp.pro_monthly"
  orderId: string;
}
```

**Response:**
```typescript
interface VerifyResponse {
  plan: 'PRO' | 'ELITE';
  expiresAt: string;
  activated: boolean;
}
```

---

## WebSocket Events

Connect to the WebSocket server at `wss://api.myscoreapp.com` (or `ws://localhost:3000` in development).

### Connection

```javascript
// React Native example
import { io } from 'socket.io-client';

const socket = io('wss://api.myscoreapp.com', {
  auth: { token: accessToken },
  transports: ['websocket'],
});

// Join a live match room
socket.emit('join:match', { matchId: 'abc123' });

// Listen for ball-by-ball updates
socket.on('ball:scored', (data) => {
  console.log(data.liveState);  // LiveMatchState
});

// Leave room when done
socket.emit('leave:match', { matchId: 'abc123' });
```

### Client → Server Events

| Event | Payload | Description |
|-------|---------|-------------|
| `join:match` | `{ matchId: string }` | Subscribe to live match updates |
| `leave:match` | `{ matchId: string }` | Unsubscribe from match updates |
| `join:tournament` | `{ tournamentId: string }` | Subscribe to tournament fixture updates |

### Server → Client Events

| Event | Payload | Description |
|-------|---------|-------------|
| `ball:scored` | `LiveMatchState` | Emitted after every ball is scored |
| `wicket:fallen` | `{ matchId, player, dismissal, score }` | Wicket notification |
| `milestone:reached` | `{ matchId, type, player, value }` | 50, 100, 5-wicket haul, etc. |
| `innings:complete` | `{ matchId, inningsNumber, summary }` | Innings ended |
| `match:complete` | `{ matchId, result }` | Match result declared |
| `match:updated` | `{ matchId, field, value }` | Non-scoring match update |
| `error` | `{ code, message }` | Server-side error on action |

### WebSocket Error Codes

| Code | Description |
|------|-------------|
| `AUTH_REQUIRED` | No valid token provided |
| `MATCH_NOT_FOUND` | Invalid matchId in join request |
| `ACCESS_DENIED` | Match is private and user lacks permission |
