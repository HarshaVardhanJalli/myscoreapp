/**
 * Shared TypeScript types for the mobile app
 * created_by: MyCricketScoreEngine_v1
 */

export type MatchType = 'T10' | 'T20' | 'ODI' | 'TEST' | 'CUSTOM';
export type MatchStatus =
  | 'SETUP' | 'TOSS' | 'PLAYING' | 'INNINGS_BREAK'
  | 'SECOND_INNINGS' | 'SUPER_OVER' | 'COMPLETED' | 'ABANDONED';
export type InningsStatus =
  | 'NOT_STARTED' | 'IN_PROGRESS' | 'DECLARED'
  | 'ALL_OUT' | 'TARGET_ACHIEVED' | 'OVERS_COMPLETE';
export type WicketType =
  | 'BOWLED' | 'CAUGHT' | 'LBW' | 'RUN_OUT' | 'STUMPED'
  | 'HIT_WICKET' | 'OBSTRUCTING_FIELD' | 'TIMED_OUT' | 'HANDLED_BALL' | 'HIT_BALL_TWICE';
export type Plan = 'FREE' | 'PRO' | 'ELITE';
export type UserRole = 'USER' | 'SCORER' | 'ADMIN';

export interface User {
  id: string;
  email: string;
  username: string;
  name: string;
  avatarUrl?: string;
  role: UserRole;
  plan: Plan;
  isVerified: boolean;
  createdAt: string;
  subscription?: {
    plan: Plan;
    currentPeriodEnd?: string;
    cancelAtPeriodEnd: boolean;
  };
}

export interface Team {
  id: string;
  name: string;
  shortName: string;
  logoUrl?: string;
  primaryColor?: string;
  createdBy: string;
  createdAt: string;
  players?: TeamPlayer[];
  _count?: { players: number };
}

export interface Player {
  id: string;
  name: string;
  shortName?: string;
  dateOfBirth?: string;
  nationality?: string;
  avatarUrl?: string;
  role: 'BATSMAN' | 'BOWLER' | 'ALL_ROUNDER' | 'WICKET_KEEPER';
  battingStyle?: string;
  bowlingStyle?: string;
  jerseyNumber?: number;
}

export interface TeamPlayer {
  id: string;
  teamId: string;
  playerId: string;
  isCaptain: boolean;
  isViceCaptain: boolean;
  player: Player;
}

export interface Toss {
  id: string;
  matchId: string;
  winnerTeamId: string;
  decision: 'BAT' | 'BOWL';
  battingFirstTeamId: string;
  createdAt: string;
}

export interface Match {
  id: string;
  title: string;
  description?: string;
  matchType: MatchType;
  oversPerInnings: number;
  status: MatchStatus;
  team1Id: string;
  team2Id: string;
  team1: Pick<Team, 'id' | 'name' | 'shortName'>;
  team2: Pick<Team, 'id' | 'name' | 'shortName'>;
  venueName?: string;
  scheduledAt?: string;
  startedAt?: string;
  completedAt?: string;
  tournamentId?: string;
  resultDescription?: string;
  winnerTeamId?: string;
  isPublic: boolean;
  createdBy: string;
  createdById?: string;
  createdByTag: string;
  createdByUser?: {
    id: string;
    name?: string;
    username?: string;
  };
  toss?: Toss;
  innings?: InningsSummary[];
  _count?: { likes: number; comments: number };
}

export interface InningsSummary {
  inningsNumber: number;
  totalRuns: number;
  wickets: number;
  currentOver: number;
  legalBallsInOver: number;
  state: InningsStatus;
  battingTeamId: string;
}

export interface Innings {
  id: string;
  matchId: string;
  inningsNumber: number;
  battingTeamId: string;
  bowlingTeamId: string;
  totalRuns: number;
  wickets: number;
  currentOver: number;
  legalBallsInOver: number;
  extrasWides: number;
  extrasNoBalls: number;
  extrasByes: number;
  extrasLegByes: number;
  target?: number;
  state: InningsStatus;
  nextBallIsFreeBit: boolean;
}

export interface BallInput {
  batsmanId: string;
  bowlerId: string;
  runs: number;
  isWide: boolean;
  isNoBall: boolean;
  isBye: boolean;
  isLegBye: boolean;
  isPenalty: boolean;
  isWicket: boolean;
  wicketType?: WicketType;
  dismissedPlayerId?: string;
  fielderIds?: string[];
  extraRuns?: number;
  wagonWheelAngle?: number;
  wagonWheelLength?: number;
  commentary?: string;
}

export interface BallResult {
  ball: Ball;
  inningsUpdate: InningsUpdate;
  strikeChanged: boolean;
  overComplete: boolean;
  isInningsComplete: boolean;
  isMatchComplete: boolean;
  highlights?: { type: string; description: string; playerId: string };
  milestones?: Array<{ type: string; playerId: string; description: string; value: number }>;
  commentary: string;
}

export interface Ball {
  id: string;
  inningsId: string;
  overNumber: number;
  ballNumber: number;
  batsmanId: string;
  bowlerId: string;
  runs: number;
  totalRuns: number;
  isWide: boolean;
  isNoBall: boolean;
  isBye: boolean;
  isLegBye: boolean;
  isWicket: boolean;
  wicketType?: WicketType;
  isLegalBall: boolean;
  isFreeBit: boolean;
  commentary: string;
  createdAt: string;
}

export interface InningsUpdate {
  totalRuns: number;
  wickets: number;
  overs: number;
  balls: number;
  currentRunRate: number;
  requiredRunRate?: number;
  target?: number;
  currentBatsmanId: string;
  nonStrikerId: string;
  currentBowlerId: string;
  isFreeBit: boolean;
  powerPlayActive: boolean;
  partnershipRuns: number;
  partnershipBalls: number;
}

export interface BatsmanStats {
  playerId: string;
  playerName: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  strikeRate: number;
  isOut: boolean;
  dismissalInfo?: string;
  onStrike: boolean;
}

export interface BowlerStats {
  playerId: string;
  playerName: string;
  overs: number;
  balls: number;
  maidens: number;
  runs: number;
  wickets: number;
  economy: number;
  wides: number;
  noBalls: number;
  isCurrent: boolean;
}

export interface Tournament {
  id: string;
  name: string;
  description?: string;
  format: string;
  status: string;
  startDate?: string;
  endDate?: string;
  matchType: MatchType;
  oversPerInnings: number;
  isPublic: boolean;
  createdBy: string;
  teams?: TournamentTeam[];
}

export interface TournamentTeam {
  id: string;
  teamId: string;
  points: number;
  matchesPlayed: number;
  won: number;
  lost: number;
  tied: number;
  nrr: number;
  team: Pick<Team, 'id' | 'name' | 'shortName' | 'logoUrl'>;
}

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: Pagination;
}
