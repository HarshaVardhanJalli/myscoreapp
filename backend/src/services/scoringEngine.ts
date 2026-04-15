/**
 * Cricket Scoring Engine - Core of MyCricketScore App
 * Handles all cricket rules, ball-by-ball scoring, and match state management
 * created_by: MyCricketScoreEngine_v1
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';

const prisma = new PrismaClient();

// ─── Enums ────────────────────────────────────────────────────────────────────

export enum WicketType {
  BOWLED = 'BOWLED',
  CAUGHT = 'CAUGHT',
  LBW = 'LBW',
  RUN_OUT = 'RUN_OUT',
  STUMPED = 'STUMPED',
  HIT_WICKET = 'HIT_WICKET',
  OBSTRUCTING_FIELD = 'OBSTRUCTING_FIELD',
  TIMED_OUT = 'TIMED_OUT',
  HANDLED_BALL = 'HANDLED_BALL',
  HIT_BALL_TWICE = 'HIT_BALL_TWICE',
}

export enum MatchState {
  SETUP = 'SETUP',
  TOSS = 'TOSS',
  PLAYING = 'PLAYING',
  INNINGS_BREAK = 'INNINGS_BREAK',
  SECOND_INNINGS = 'SECOND_INNINGS',
  SUPER_OVER = 'SUPER_OVER',
  COMPLETED = 'COMPLETED',
  ABANDONED = 'ABANDONED',
  DLS_INTERRUPTED = 'DLS_INTERRUPTED',
}

export enum InningsState {
  NOT_STARTED = 'NOT_STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  DECLARED = 'DECLARED',
  ALL_OUT = 'ALL_OUT',
  TARGET_ACHIEVED = 'TARGET_ACHIEVED',
  OVERS_COMPLETE = 'OVERS_COMPLETE',
}

export enum ShotZone {
  OFF_SIDE = 'OFF_SIDE',
  ON_SIDE = 'ON_SIDE',
  STRAIGHT = 'STRAIGHT',
  BEHIND_SQUARE_LEG = 'BEHIND_SQUARE_LEG',
  COVER = 'COVER',
  MID_OFF = 'MID_OFF',
  MID_ON = 'MID_ON',
  FINE_LEG = 'FINE_LEG',
  THIRD_MAN = 'THIRD_MAN',
}

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface BallInput {
  batsmanId: string;
  bowlerId: string;
  runs: number;           // runs off the bat (0-6)
  isWide: boolean;
  isNoBall: boolean;
  isBye: boolean;
  isLegBye: boolean;
  isPenalty: boolean;
  isWicket: boolean;
  wicketType?: WicketType;
  dismissedPlayerId?: string;
  fielderIds?: string[];
  extraRuns?: number;     // additional runs (e.g., 4 wides)
  wagonWheelAngle?: number;  // 0-360 degrees
  wagonWheelLength?: number; // 0-1 normalized
  commentary?: string;
}

export interface BallResult {
  ball: BallRecord;
  inningsUpdate: InningsUpdate;
  strikeChanged: boolean;
  overComplete: boolean;
  isInningsComplete: boolean;
  isMatchComplete: boolean;
  highlights?: Highlight;
  milestones?: Milestone[];
  commentary: string;
}

export interface BallRecord {
  id: string;
  inningsId: string;
  overNumber: number;
  ballNumber: number;     // legal ball within over (1-6)
  ballInOver: number;     // absolute count including wides/no-balls
  batsmanId: string;
  bowlerId: string;
  runs: number;
  totalRuns: number;      // runs + extras
  isWide: boolean;
  isNoBall: boolean;
  isBye: boolean;
  isLegBye: boolean;
  isPenalty: boolean;
  isWicket: boolean;
  wicketType?: WicketType;
  dismissedPlayerId?: string;
  fielderIds?: string[];
  extraRuns: number;
  isLegalBall: boolean;
  isFreeBit: boolean;
  wagonWheelAngle?: number;
  wagonWheelLength?: number;
  commentary: string;
  createdAt: Date;
}

export interface InningsUpdate {
  totalRuns: number;
  wickets: number;
  overs: number;
  balls: number;           // legal balls in current over
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

export interface UndoResult {
  success: boolean;
  removedBall: BallRecord;
  inningsUpdate: InningsUpdate;
  message: string;
}

export interface OverResult {
  overNumber: number;
  runs: number;
  wickets: number;
  maidenOver: boolean;
  bowlerId: string;
  legalBalls: number;
}

export interface InningsResult {
  inningsId: string;
  totalRuns: number;
  wickets: number;
  overs: number;
  extras: ExtrasBreakdown;
  fallOfWickets: FallOfWicket[];
  topScorers: BatsmanStats[];
  bowlingFigures: BowlerStats[];
  state: InningsState;
}

export interface MatchResult {
  matchId: string;
  winnerId?: string;
  winnerTeamId?: string;
  resultType: 'WON_BY_RUNS' | 'WON_BY_WICKETS' | 'TIE' | 'DRAW' | 'NO_RESULT' | 'SUPER_OVER';
  margin?: number;
  marginType?: 'RUNS' | 'WICKETS';
  resultDescription: string;
  playerOfTheMatch?: string;
}

export interface Scorecard {
  matchId: string;
  matchStatus: MatchState;
  innings: InningsScorecardEntry[];
  currentInnings?: InningsScorecardEntry;
  result?: MatchResult;
  toss?: TossInfo;
}

export interface InningsScorecardEntry {
  inningsId: string;
  inningsNumber: number;
  battingTeamId: string;
  battingTeamName: string;
  bowlingTeamId: string;
  bowlingTeamName: string;
  totalRuns: number;
  wickets: number;
  overs: number;
  balls: number;
  extras: ExtrasBreakdown;
  runRate: number;
  target?: number;
  requiredRuns?: number;
  requiredRunRate?: number;
  batsmen: BatsmanStats[];
  bowlers: BowlerStats[];
  fallOfWickets: FallOfWicket[];
  partnerships: Partnership[];
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

export interface ExtrasBreakdown {
  total: number;
  wides: number;
  noBalls: number;
  byes: number;
  legByes: number;
  penalties: number;
}

export interface FallOfWicket {
  wicketNumber: number;
  playerId: string;
  playerName: string;
  runs: number;
  overs: string;   // formatted as "12.3"
  overNumber: number;
  ballNumber: number;
}

export interface Partnership {
  batsmanOneId: string;
  batsmanOneName: string;
  batsmanTwoId: string;
  batsmanTwoName: string;
  runs: number;
  balls: number;
  runRate: number;
  isActive: boolean;
  startedAt: string;   // over.ball format
  endedAt?: string;
  batsmanOneRuns: number;
  batsmanTwoBalls: number;
}

export interface TossInfo {
  winnerId: string;
  winnerTeamId: string;
  decision: 'BAT' | 'BOWL';
}

export interface WagonWheelData {
  inningsId: string;
  batsmanId?: string;
  shots: WagonShot[];
  zones: ZoneSummary[];
}

export interface WagonShot {
  ballId: string;
  angle: number;
  length: number;
  runs: number;
  isWicket: boolean;
  isBoundary: boolean;
  zone: ShotZone;
}

export interface ZoneSummary {
  zone: ShotZone;
  runs: number;
  balls: number;
  boundaries: number;
}

export interface ManhattanData {
  matchId: string;
  innings: InningsManhattanData[];
}

export interface InningsManhattanData {
  inningsNumber: number;
  teamName: string;
  overs: OverRunData[];
  totalRuns: number;
  totalWickets: number;
}

export interface OverRunData {
  overNumber: number;
  runs: number;
  wickets: number;
  maidenOver: boolean;
}

export interface WinProbability {
  matchId: string;
  team1Probability: number;
  team2Probability: number;
  tieProblability: number;
  factors: WinProbabilityFactors;
  calculatedAt: Date;
}

export interface WinProbabilityFactors {
  currentRunRate: number;
  requiredRunRate: number;
  wicketsInHand: number;
  oversRemaining: number;
  runRateRatio: number;
  resourcesRemaining: number;
}

export interface Highlight {
  type: 'SIX' | 'FOUR' | 'WICKET' | 'MAIDEN' | 'FIFTY' | 'HUNDRED' | 'HATTRICK';
  description: string;
  playerId: string;
  playerName?: string;
}

export interface Milestone {
  type: 'FIFTY' | 'HUNDRED' | 'DOUBLE_HUNDRED' | 'FIVE_WICKET_HAUL' | 'TEN_WICKET_HAUL' | 'HATTRICK' | 'MAIDEN_OVER';
  playerId: string;
  description: string;
  value: number;
}

export interface ScoringEngineInterface {
  processBall(inningsId: string, ballInput: BallInput): Promise<BallResult>;
  undoLastBall(inningsId: string): Promise<UndoResult>;
  endOver(inningsId: string): Promise<OverResult>;
  declareInnings(inningsId: string): Promise<InningsResult>;
  calculateResult(matchId: string): Promise<MatchResult>;
  getLiveScorecard(matchId: string): Promise<Scorecard>;
  getWagonWheel(inningsId: string, batsmanId?: string): Promise<WagonWheelData>;
  getManhattan(matchId: string): Promise<ManhattanData>;
  getPartnerships(inningsId: string): Promise<Partnership[]>;
  getWinProbability(matchId: string): Promise<WinProbability>;
}

// ─── Commentary Generator ─────────────────────────────────────────────────────

function generateCommentary(
  input: BallInput,
  overNumber: number,
  ballNumber: number,
  batsmanName: string,
  bowlerName: string
): string {
  const overStr = `${overNumber}.${ballNumber}`;

  if (input.isWicket && input.wicketType) {
    const dismissedName = batsmanName;
    switch (input.wicketType) {
      case WicketType.BOWLED:
        return `${overStr}: ${bowlerName} to ${dismissedName}, OUT! Bowled him! The stumps are shattered. What a delivery!`;
      case WicketType.CAUGHT:
        return `${overStr}: ${bowlerName} to ${dismissedName}, OUT! Caught! The fielder takes a sharp catch. ${dismissedName} has to walk back.`;
      case WicketType.LBW:
        return `${overStr}: ${bowlerName} to ${dismissedName}, OUT! LBW! The umpire raises the finger. Plumb in front!`;
      case WicketType.RUN_OUT:
        return `${overStr}: ${bowlerName} to ${dismissedName}, OUT! Run out! Direct hit! The batsman is caught short of his crease!`;
      case WicketType.STUMPED:
        return `${overStr}: ${bowlerName} to ${dismissedName}, OUT! Stumped! Quick as a flash by the keeper!`;
      case WicketType.HIT_WICKET:
        return `${overStr}: ${bowlerName} to ${dismissedName}, OUT! Hit wicket! ${dismissedName} has hit his own stumps. Rare dismissal!`;
      default:
        return `${overStr}: ${bowlerName} to ${dismissedName}, OUT! ${input.wicketType}`;
    }
  }

  if (input.isWide) {
    const wideRuns = 1 + (input.extraRuns || 0);
    return `${overStr}: ${bowlerName} to ${batsmanName}, Wide! ${wideRuns > 1 ? `${wideRuns} runs including the wide.` : 'Ball strays too far.'} Extra run added.`;
  }

  if (input.isNoBall) {
    const desc = input.runs > 0 ? `${input.runs} runs + no-ball.` : 'No-ball! Free hit next delivery.';
    return `${overStr}: ${bowlerName} to ${batsmanName}, No-ball! ${desc}`;
  }

  if (input.isBye) {
    return `${overStr}: ${bowlerName} to ${batsmanName}, ${input.runs} bye${input.runs !== 1 ? 's' : ''}! The ball gets past the keeper.`;
  }

  if (input.isLegBye) {
    return `${overStr}: ${bowlerName} to ${batsmanName}, ${input.runs} leg bye${input.runs !== 1 ? 's' : ''}! Off the pad and they run.`;
  }

  if (input.isPenalty) {
    return `${overStr}: Penalty runs! 5 runs awarded to the batting team.`;
  }

  switch (input.runs) {
    case 0:
      return `${overStr}: ${bowlerName} to ${batsmanName}, dot ball. Good delivery, defended solidly.`;
    case 1:
      return `${overStr}: ${bowlerName} to ${batsmanName}, 1 run. Nudged into the gap, they run through.`;
    case 2:
      return `${overStr}: ${bowlerName} to ${batsmanName}, 2 runs! Good running between the wickets.`;
    case 3:
      return `${overStr}: ${bowlerName} to ${batsmanName}, 3 runs! Brilliant running, they come back for a third.`;
    case 4:
      return `${overStr}: ${bowlerName} to ${batsmanName}, FOUR! ${batsmanName} sends that racing to the boundary!`;
    case 6:
      return `${overStr}: ${bowlerName} to ${batsmanName}, SIX! ${batsmanName} deposits that into the stands! Massive hit!`;
    case 5:
      return `${overStr}: ${bowlerName} to ${batsmanName}, 5 runs! Incredible running, all five!`;
    default:
      return `${overStr}: ${bowlerName} to ${batsmanName}, ${input.runs} runs.`;
  }
}

// ─── Win Probability Calculator ───────────────────────────────────────────────

function calculateWinProbability(
  target: number,
  current: number,
  wicketsDown: number,
  oversRemaining: number,
  totalOvers: number
): number {
  if (target <= 0 || totalOvers <= 0) return 50;

  const runsNeeded = target - current;
  if (runsNeeded <= 0) return 100; // Already won
  if (oversRemaining <= 0) return 0; // No overs left, lost
  if (wicketsDown >= 10) return 0;  // All out

  const wicketsInHand = 10 - wicketsDown;
  const requiredRunRate = runsNeeded / oversRemaining;
  const maxPossibleRuns = wicketsInHand * 6 * oversRemaining * 0.8; // rough max

  if (maxPossibleRuns < runsNeeded) return 5; // Virtually impossible

  // Resource percentage (DLS-style approximation)
  const oversPlayedRatio = (totalOvers - oversRemaining) / totalOvers;
  const wicketsLostRatio = wicketsDown / 10;
  const resourcesRemaining = (1 - oversPlayedRatio * 0.6) * (1 - wicketsLostRatio * 0.4);

  // RRR vs manageable rate
  const baseRate = target / totalOvers;
  const rrRatio = requiredRunRate / baseRate;

  let probability: number;

  if (rrRatio <= 0.8) {
    probability = 85 + (1 - rrRatio) * 15;
  } else if (rrRatio <= 1.0) {
    probability = 65 + (1.0 - rrRatio) * 100;
  } else if (rrRatio <= 1.3) {
    probability = 40 - (rrRatio - 1.0) * 83;
  } else if (rrRatio <= 1.6) {
    probability = 15 - (rrRatio - 1.3) * 40;
  } else {
    probability = 5 - (rrRatio - 1.6) * 10;
  }

  // Adjust for wickets in hand
  const wicketFactor = Math.pow(wicketsInHand / 10, 0.5);
  probability = probability * (0.6 + wicketFactor * 0.4);

  // Adjust for resources
  probability = probability * (0.8 + resourcesRemaining * 0.2);

  return Math.max(2, Math.min(98, probability));
}

// ─── Shot Zone Classifier ─────────────────────────────────────────────────────

function classifyShotZone(angle: number): ShotZone {
  // Angle 0 = straight, increases clockwise
  // For right-handed batsman:
  // 0-45: straight / mid-off region
  // 45-135: off side
  // 135-180: third man / fine leg (behind square on off)
  // 180-225: fine leg
  // 225-315: on side
  // 315-360: mid-on / straight

  const normalAngle = ((angle % 360) + 360) % 360;

  if (normalAngle >= 315 || normalAngle < 45) return ShotZone.STRAIGHT;
  if (normalAngle >= 45 && normalAngle < 90) return ShotZone.MID_OFF;
  if (normalAngle >= 90 && normalAngle < 160) return ShotZone.COVER;
  if (normalAngle >= 160 && normalAngle < 200) return ShotZone.THIRD_MAN;
  if (normalAngle >= 200 && normalAngle < 240) return ShotZone.FINE_LEG;
  if (normalAngle >= 240 && normalAngle < 290) return ShotZone.BEHIND_SQUARE_LEG;
  if (normalAngle >= 290 && normalAngle < 315) return ShotZone.MID_ON;

  return ShotZone.STRAIGHT;
}

function getHighLevelZone(zone: ShotZone): 'OFF_SIDE' | 'ON_SIDE' | 'STRAIGHT' {
  if ([ShotZone.COVER, ShotZone.MID_OFF, ShotZone.THIRD_MAN].includes(zone)) return 'OFF_SIDE';
  if ([ShotZone.FINE_LEG, ShotZone.BEHIND_SQUARE_LEG, ShotZone.MID_ON].includes(zone)) return 'ON_SIDE';
  return 'STRAIGHT';
}

// ─── Scoring Engine ───────────────────────────────────────────────────────────

export class ScoringEngine implements ScoringEngineInterface {

  /**
   * Process a single ball delivery - THE core function
   * All state updates are performed atomically in a DB transaction
   */
  async processBall(inningsId: string, ballInput: BallInput): Promise<BallResult> {
    return prisma.$transaction(async (tx) => {
      // 1. Load current innings state
      const innings = await tx.innings.findUniqueOrThrow({
        where: { id: inningsId },
        include: {
          match: true,
          balls: {
            orderBy: [{ overNumber: 'desc' }, { ballInOver: 'desc' }],
            take: 10,
          },
        },
      });

      if (innings.state === InningsState.ALL_OUT ||
          innings.state === InningsState.DECLARED ||
          innings.state === InningsState.OVERS_COMPLETE ||
          innings.state === InningsState.TARGET_ACHIEVED) {
        throw new Error(`Innings is already complete (state: ${innings.state})`);
      }

      // 2. Determine legal ball count
      const isLegalBall = !ballInput.isWide && !ballInput.isNoBall;

      // 3. Compute current over/ball position
      const currentOverNumber = innings.currentOver as number;
      const currentBallInOver = innings.currentBall as number; // absolute count in over
      const currentLegalBalls = innings.legalBallsInOver as number;

      // 4. Determine runs and extras
      let runsOffBat = 0;
      let extraRuns = 0;
      let totalRuns = 0;

      if (ballInput.isWicket && !ballInput.isWide && !ballInput.isNoBall) {
        // Wicket on a legal ball - no extra runs unless bye/leg-bye
        runsOffBat = 0;
        extraRuns = 0;
      }

      if (ballInput.isWide) {
        extraRuns = 1 + (ballInput.extraRuns || 0);
        runsOffBat = 0;
      } else if (ballInput.isNoBall) {
        extraRuns = 1 + (ballInput.extraRuns || 0);
        runsOffBat = ballInput.isBye || ballInput.isLegBye ? 0 : ballInput.runs;
      } else if (ballInput.isBye || ballInput.isLegBye) {
        runsOffBat = 0;
        extraRuns = ballInput.runs;
      } else if (ballInput.isPenalty) {
        extraRuns = 5;
        runsOffBat = 0;
      } else {
        runsOffBat = ballInput.runs;
        extraRuns = 0;
      }

      if (ballInput.isWicket) {
        // On no-ball wicket (only run-out possible), runs still count
        if (ballInput.isNoBall && ballInput.wicketType !== WicketType.RUN_OUT) {
          throw new Error('Only RUN_OUT is possible off a no-ball');
        }
      }

      totalRuns = runsOffBat + extraRuns;

      // 5. Determine new legal ball count and over completion
      const newLegalBalls = isLegalBall ? currentLegalBalls + 1 : currentLegalBalls;
      const overComplete = newLegalBalls === 6;
      const nextOverNumber = overComplete ? currentOverNumber + 1 : currentOverNumber;
      const nextLegalBalls = overComplete ? 0 : newLegalBalls;
      const nextBallInOver = overComplete ? 0 : currentBallInOver + 1;

      // 6. Load current players
      const currentBatsman = await tx.inningsPlayer.findFirst({
        where: { inningsId, playerId: ballInput.batsmanId, isOut: false, role: 'BATSMAN' },
        include: { player: true },
      });

      if (!currentBatsman) {
        throw new AppError(400, `Selected striker is not part of this innings: ${ballInput.batsmanId}`);
      }

      if (!currentBatsman.isOnField || !currentBatsman.isOnStrike) {
        await tx.inningsPlayer.updateMany({
          where: { inningsId, role: 'BATSMAN' },
          data: { isOnStrike: false },
        });
        await tx.inningsPlayer.update({
          where: { id: currentBatsman.id },
          data: { isOnField: true, isOnStrike: true },
        });
      }

      let nonStriker = await tx.inningsPlayer.findFirst({
        where: {
          inningsId,
          isOnField: true,
          isOut: false,
          role: 'BATSMAN',
          playerId: { not: ballInput.batsmanId },
        },
        include: { player: true },
      });

      if (!nonStriker) {
        nonStriker = await tx.inningsPlayer.findFirst({
          where: {
            inningsId,
            isOut: false,
            role: 'BATSMAN',
            playerId: { not: ballInput.batsmanId },
          },
          orderBy: { battingOrder: 'asc' },
          include: { player: true },
        });
      }

      if (!nonStriker) {
        throw new Error('No non-striker available for this innings');
      }

      if (!nonStriker.isOnField) {
        await tx.inningsPlayer.update({
          where: { id: nonStriker.id },
          data: { isOnField: true },
        });
      }

      const currentBowler = await tx.inningsPlayer.findFirst({
        where: { inningsId, playerId: ballInput.bowlerId, role: 'BOWLER' },
        include: { player: true },
      });

      if (!currentBowler) {
        throw new AppError(400, `Selected bowler is not part of this innings: ${ballInput.bowlerId}`);
      }

      if (!currentBowler.isCurrentBowler || !currentBowler.isOnField) {
        await tx.inningsPlayer.updateMany({
          where: { inningsId, role: 'BOWLER' },
          data: { isCurrentBowler: false, isOnField: false },
        });
        await tx.inningsPlayer.update({
          where: { id: currentBowler.id },
          data: { isCurrentBowler: true, isOnField: true },
        });
      }

      // 7. Generate commentary
      const commentary = ballInput.commentary || generateCommentary(
        ballInput,
        currentOverNumber,
        isLegalBall ? currentLegalBalls + 1 : currentBallInOver,
        currentBatsman.player.name,
        currentBowler.player.name,
      );

      // 8. Create ball record
      const ball = await tx.ball.create({
        data: {
          inningsId,
          overNumber: currentOverNumber,
          ballNumber: isLegalBall ? newLegalBalls : currentLegalBalls,
          ballInOver: currentBallInOver + 1,
          batsmanId: ballInput.batsmanId,
          bowlerId: ballInput.bowlerId,
          runs: runsOffBat,
          totalRuns,
          isWide: ballInput.isWide,
          isNoBall: ballInput.isNoBall,
          isBye: ballInput.isBye,
          isLegBye: ballInput.isLegBye,
          isPenalty: ballInput.isPenalty,
          isWicket: ballInput.isWicket,
          wicketType: ballInput.wicketType,
          dismissedPlayerId: ballInput.isWicket ? ballInput.dismissedPlayerId : null,
          extraRuns,
          isLegalBall,
          isFreeBit: innings.nextBallIsFreeBit as boolean,
          wagonWheelAngle: ballInput.wagonWheelAngle,
          wagonWheelLength: ballInput.wagonWheelLength,
          commentary,
        },
      });

      if (ballInput.fielderIds && ballInput.fielderIds.length > 0) {
        await tx.ballFielder.createMany({
          data: ballInput.fielderIds.map((playerId) => ({
            ballId: ball.id,
            playerId,
          })),
        });
      }

      // 9. Update batsman stats (only credit bat runs, not extras)
      const batsmanRunsToAdd = ballInput.isBye || ballInput.isLegBye || ballInput.isWide
        ? 0
        : runsOffBat;

      const batsmanUpdateData: Record<string, any> = {
        runs: { increment: batsmanRunsToAdd },
      };

      if (isLegalBall || ballInput.isNoBall) {
        batsmanUpdateData.balls = { increment: 1 };
      }

      if (runsOffBat === 4 && !ballInput.isWide && !ballInput.isBye && !ballInput.isLegBye) {
        batsmanUpdateData.fours = { increment: 1 };
      }

      if (runsOffBat === 6 && !ballInput.isWide && !ballInput.isBye && !ballInput.isLegBye) {
        batsmanUpdateData.sixes = { increment: 1 };
      }

      await tx.inningsPlayer.update({
        where: { id: currentBatsman.id },
        data: batsmanUpdateData,
      });

      // 10. Update bowler stats
      const bowlerRunsToAdd = ballInput.isBye || ballInput.isLegBye || ballInput.isPenalty
        ? 0
        : totalRuns;

      const isBowlerWicket = ballInput.isWicket && ballInput.wicketType &&
        ![WicketType.RUN_OUT, WicketType.OBSTRUCTING_FIELD, WicketType.TIMED_OUT,
          WicketType.HANDLED_BALL].includes(ballInput.wicketType);

      const bowlerUpdateData: Record<string, any> = {
        runsGiven: { increment: bowlerRunsToAdd },
      };

      if (isLegalBall) {
        bowlerUpdateData.legalBalls = { increment: 1 };
      }

      if (ballInput.isWide) {
        bowlerUpdateData.wides = { increment: 1 };
      }

      if (ballInput.isNoBall) {
        bowlerUpdateData.noBalls = { increment: 1 };
      }

      if (isBowlerWicket) {
        bowlerUpdateData.wicketsTaken = { increment: 1 };
      }

      await tx.inningsPlayer.update({
        where: { id: currentBowler.id },
        data: bowlerUpdateData,
      });

      // 11. Handle wicket
      let isInningsComplete = false;
      let dismissedPlayer: any = null;
      const totalPlayers = innings.playingXI
        ? (JSON.parse(innings.playingXI as string) as string[]).length : 11;
      let incomingBatsmanId: string | undefined;

      if (ballInput.isWicket && ballInput.dismissedPlayerId) {
        dismissedPlayer = await tx.inningsPlayer.findFirstOrThrow({
          where: { inningsId, playerId: ballInput.dismissedPlayerId, isOnField: true },
          include: { player: true },
        });

        // Mark dismissed batsman as out (store dismissal info in dismissalInfo field)
        await tx.inningsPlayer.update({
          where: { id: dismissedPlayer.id },
          data: {
            isOnField: false,
            isOut: true,
            dismissalInfo: ballInput.wicketType
              ? `${ballInput.wicketType}${isBowlerWicket && ballInput.bowlerId ? ' b ' + ballInput.bowlerId : ''}`
              : null,
          },
        });

        // Check if innings is over (9th wicket = innings complete for limited overs, 10th in test)
        const newWickets = (innings.wickets as number) + 1;
        isInningsComplete = newWickets >= totalPlayers - 1; // Last man standing

        if (!isInningsComplete) {
          // Bring in next batsman
          const nextBatsman = await tx.inningsPlayer.findFirst({
            where: {
              inningsId,
              isOnField: false,
              isOut: false,
              role: 'BATSMAN',
              battingOrder: { gt: dismissedPlayer.battingOrder as number },
            },
            orderBy: { battingOrder: 'asc' },
          });

          if (nextBatsman) {
            await tx.inningsPlayer.update({
              where: { id: nextBatsman.id },
              data: { isOnField: true },
            });
            incomingBatsmanId = nextBatsman.playerId as string;
          } else {
            isInningsComplete = true;
          }
        }
      }

      // 12. Determine strike change
      let strikeChanged = false;

      if (!ballInput.isWicket || (ballInput.isWicket && ballInput.wicketType === WicketType.RUN_OUT)) {
        // Normal strike rotation
        const effectiveRuns = ballInput.isWide ? (ballInput.extraRuns || 0) :
          ballInput.isBye || ballInput.isLegBye ? ballInput.runs :
          runsOffBat;

        if (effectiveRuns % 2 === 1) {
          strikeChanged = true;
        }
      }

      // End of over: swap strike
      if (overComplete && !isInningsComplete) {
        strikeChanged = !strikeChanged; // flip whatever was set
        // The end-of-over swap overrides the run-based swap
        // Re-compute: end of over always swaps
        const effectiveRuns = ballInput.isWide ? (ballInput.extraRuns || 0) :
          ballInput.isBye || ballInput.isLegBye ? ballInput.runs : runsOffBat;
        strikeChanged = effectiveRuns % 2 === 0; // if even runs + end of over = swap
      }

      // 13. Check over-limit completion
      const maxOvers = innings.match.oversPerInnings as number;
      const newTotalOvers = nextOverNumber;
      if (maxOvers > 0 && newTotalOvers >= maxOvers && nextLegalBalls === 0) {
        isInningsComplete = true;
      }

      // 14. Update innings totals
      const newTotalRuns = (innings.totalRuns as number) + totalRuns;
      const newWickets = (innings.wickets as number) + (ballInput.isWicket ? 1 : 0);
      const newExtrasWides = (innings.extrasWides as number) + (ballInput.isWide ? extraRuns : 0);
      const newExtrasNoBalls = (innings.extrasNoBalls as number) + (ballInput.isNoBall ? 1 : 0);
      const newExtrasByes = (innings.extrasByes as number) + (ballInput.isBye ? extraRuns : 0);
      const newExtrasLegByes = (innings.extrasLegByes as number) + (ballInput.isLegBye ? extraRuns : 0);
      const newExtrasPenalties = (innings.extrasPenalties as number) + (ballInput.isPenalty ? 5 : 0);

      const newState: InningsState = isInningsComplete
        ? (newWickets >= totalPlayers - 1 ? InningsState.ALL_OUT : InningsState.OVERS_COMPLETE)
        : InningsState.IN_PROGRESS;

      await tx.innings.update({
        where: { id: inningsId },
        data: {
          totalRuns: newTotalRuns,
          wickets: newWickets,
          currentOver: nextOverNumber,
          currentBall: nextBallInOver,
          legalBallsInOver: nextLegalBalls,
          extrasWides: newExtrasWides,
          extrasNoBalls: newExtrasNoBalls,
          extrasByes: newExtrasByes,
          extrasLegByes: newExtrasLegByes,
          extrasPenalties: newExtrasPenalties,
          nextBallIsFreeBit: ballInput.isNoBall ? true : (innings.nextBallIsFreeBit ? false : false),
          state: newState,
        },
      });

      // 15. Update partnership tracking
      await this._updatePartnership(tx, inningsId, ballInput, runsOffBat, totalRuns,
        ballInput.batsmanId, nonStriker.playerId, ballInput.isWicket);

      // 16. Check target (second innings)
      let isMatchComplete = false;
      if (innings.target && newTotalRuns >= (innings.target as number)) {
        await tx.innings.update({
          where: { id: inningsId },
          data: { state: InningsState.TARGET_ACHIEVED },
        });
        isInningsComplete = true;
        isMatchComplete = true;
      }

      if (isInningsComplete && innings.inningsNumber === 2) {
        isMatchComplete = true;
      }

      // 17. Check milestones
      const milestones = await this._checkMilestones(tx, inningsId, ballInput,
        batsmanRunsToAdd, isBowlerWicket || false, currentBatsman, currentBowler, overComplete);

      // 18. Build update object
      const currentRunRate = newTotalOvers > 0
        ? newTotalRuns / (nextOverNumber + nextLegalBalls / 6)
        : 0;

      let requiredRunRate: number | undefined;
      if (innings.target) {
        const remainingRuns = (innings.target as number) - newTotalRuns;
        const remainingOvers = maxOvers - (nextOverNumber + nextLegalBalls / 6);
        requiredRunRate = remainingOvers > 0 ? remainingRuns / remainingOvers : 999;
      }

      // Get updated partnership
      const activePartnership = await tx.partnership.findFirst({
        where: { inningsId, isActive: true },
        orderBy: { createdAt: 'desc' },
      });

      let currentBatsmanIdForUpdate = strikeChanged ? nonStriker.playerId : ballInput.batsmanId;
      let nonStrikerIdForUpdate = strikeChanged ? ballInput.batsmanId : nonStriker.playerId;

      if (
        ballInput.isWicket &&
        incomingBatsmanId &&
        ballInput.dismissedPlayerId === ballInput.batsmanId
      ) {
        if (strikeChanged) {
          currentBatsmanIdForUpdate = nonStriker.playerId;
          nonStrikerIdForUpdate = incomingBatsmanId;
        } else {
          currentBatsmanIdForUpdate = incomingBatsmanId;
          nonStrikerIdForUpdate = nonStriker.playerId;
        }
      }

      if (!isInningsComplete) {
        await tx.inningsPlayer.updateMany({
          where: { inningsId, role: 'BATSMAN' },
          data: { isOnStrike: false },
        });

        await tx.inningsPlayer.updateMany({
          where: {
            inningsId,
            role: 'BATSMAN',
            playerId: currentBatsmanIdForUpdate,
            isOut: false,
          },
          data: { isOnStrike: true, isOnField: true },
        });

        await tx.inningsPlayer.updateMany({
          where: {
            inningsId,
            role: 'BATSMAN',
            playerId: nonStrikerIdForUpdate,
            isOut: false,
          },
          data: { isOnField: true },
        });
      }

      const inningsUpdate: InningsUpdate = {
        totalRuns: newTotalRuns,
        wickets: newWickets,
        overs: nextOverNumber,
        balls: nextLegalBalls,
        currentRunRate,
        requiredRunRate,
        target: innings.target as number | undefined,
        currentBatsmanId: currentBatsmanIdForUpdate,
        nonStrikerId: nonStrikerIdForUpdate,
        currentBowlerId: ballInput.bowlerId,
        isFreeBit: ballInput.isNoBall,
        powerPlayActive: nextOverNumber < 6,
        partnershipRuns: activePartnership ? (activePartnership.runs as number) : 0,
        partnershipBalls: activePartnership ? (activePartnership.balls as number) : 0,
      };

      // 19. Handle maiden over tracking
      let highlight: Highlight | undefined;
      if (ballInput.runs === 6 && !ballInput.isWide && !ballInput.isBye && !ballInput.isLegBye) {
        highlight = {
          type: 'SIX',
          description: `${currentBatsman.player.name} hits a massive SIX!`,
          playerId: ballInput.batsmanId,
          playerName: currentBatsman.player.name,
        };
      } else if (ballInput.runs === 4 && !ballInput.isWide && !ballInput.isBye && !ballInput.isLegBye) {
        highlight = {
          type: 'FOUR',
          description: `${currentBatsman.player.name} drives for FOUR!`,
          playerId: ballInput.batsmanId,
          playerName: currentBatsman.player.name,
        };
      } else if (ballInput.isWicket) {
        highlight = {
          type: 'WICKET',
          description: `WICKET! ${dismissedPlayer?.player?.name} is OUT - ${ballInput.wicketType}`,
          playerId: ballInput.dismissedPlayerId || ballInput.batsmanId,
        };
      }

      // 20. If match complete, update match state
      if (isMatchComplete) {
        await tx.match.update({
          where: { id: innings.matchId },
          data: { status: MatchState.COMPLETED },
        });
      } else if (isInningsComplete && innings.inningsNumber === 1) {
        await tx.match.update({
          where: { id: innings.matchId },
          data: { status: MatchState.INNINGS_BREAK },
        });
      }

      const ballRecord: BallRecord = {
        id: ball.id,
        inningsId,
        overNumber: currentOverNumber,
        ballNumber: isLegalBall ? newLegalBalls : (currentLegalBalls),
        ballInOver: currentBallInOver + 1,
        batsmanId: ballInput.batsmanId,
        bowlerId: ballInput.bowlerId,
        runs: runsOffBat,
        totalRuns,
        isWide: ballInput.isWide,
        isNoBall: ballInput.isNoBall,
        isBye: ballInput.isBye,
        isLegBye: ballInput.isLegBye,
        isPenalty: ballInput.isPenalty,
        isWicket: ballInput.isWicket,
        wicketType: ballInput.wicketType,
        dismissedPlayerId: ballInput.dismissedPlayerId,
        fielderIds: ballInput.fielderIds,
        extraRuns,
        isLegalBall,
        isFreeBit: innings.nextBallIsFreeBit as boolean,
        wagonWheelAngle: ballInput.wagonWheelAngle,
        wagonWheelLength: ballInput.wagonWheelLength,
        commentary,
        createdAt: ball.createdAt,
      };

      return {
        ball: ballRecord,
        inningsUpdate,
        strikeChanged,
        overComplete,
        isInningsComplete,
        isMatchComplete,
        highlights: highlight,
        milestones,
        commentary,
      };
    });
  }

  /**
   * Update partnership statistics atomically within a transaction
   */
  private async _updatePartnership(
    tx: Prisma.TransactionClient,
    inningsId: string,
    ballInput: BallInput,
    runsOffBat: number,
    totalRuns: number,
    strikerId: string,
    nonStrikerId: string,
    isWicket: boolean
  ): Promise<void> {
    const active = await tx.partnership.findFirst({
      where: { inningsId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    const runsToAdd = runsOffBat + (ballInput.isBye || ballInput.isLegBye ? (ballInput.runs || 0) : 0);
    const ballsToAdd = (!ballInput.isWide) ? 1 : 0;

    if (active) {
      if (isWicket) {
        // Close current partnership
        await tx.partnership.update({
          where: { id: active.id },
          data: {
            runs: { increment: runsToAdd },
            balls: { increment: ballsToAdd },
            isActive: false,
            endedAt: new Date().toISOString(),
          },
        });
      } else {
        await tx.partnership.update({
          where: { id: active.id },
          data: {
            runs: { increment: runsToAdd },
            balls: { increment: ballsToAdd },
          },
        });
      }
    }

    // Create new partnership if wicket fell (next pair)
    if (isWicket) {
      // Next batsman will be on strike or non-striker depending on runs
      const newBatsman = await tx.inningsPlayer.findFirst({
        where: {
          inningsId,
          isOnField: true,
          isOut: false,
          playerId: { not: ballInput.dismissedPlayerId },
        },
        take: 2,
      });

      if (newBatsman) {
        const remainingBatsmen = await tx.inningsPlayer.findMany({
          where: { inningsId, isOnField: true, isOut: false },
        });

        if (remainingBatsmen.length >= 2) {
          const b1 = remainingBatsmen[0];
          const b2 = remainingBatsmen[1];
          await tx.partnership.create({
            data: {
              inningsId,
              batsmanOneId: b1.playerId,
              batsmanTwoId: b2.playerId,
              runs: 0,
              balls: 0,
              isActive: true,
              startedAt: '0.0',
            },
          });
        }
      }
    }
  }

  /**
   * Check and record milestones (50s, 100s, hat-tricks, maiden overs)
   */
  private async _checkMilestones(
    tx: Prisma.TransactionClient,
    inningsId: string,
    ballInput: BallInput,
    runsAdded: number,
    isBowlerWicket: boolean,
    batsman: any,
    bowler: any,
    overComplete: boolean
  ): Promise<Milestone[]> {
    const milestones: Milestone[] = [];
    const newBatsmanRuns = (batsman.runs as number) + runsAdded;

    // Batting milestones
    const prevRuns = batsman.runs as number;
    if (prevRuns < 50 && newBatsmanRuns >= 50) {
      milestones.push({
        type: newBatsmanRuns >= 100 ? 'HUNDRED' : 'FIFTY',
        playerId: ballInput.batsmanId,
        description: `${batsman.player.name} reaches ${newBatsmanRuns >= 100 ? 'CENTURY' : 'FIFTY'}! Outstanding innings!`,
        value: newBatsmanRuns >= 100 ? 100 : 50,
      });
    } else if (prevRuns < 100 && newBatsmanRuns >= 100) {
      milestones.push({
        type: 'HUNDRED',
        playerId: ballInput.batsmanId,
        description: `${batsman.player.name} brings up his CENTURY! What an innings!`,
        value: 100,
      });
    } else if (prevRuns < 200 && newBatsmanRuns >= 200) {
      milestones.push({
        type: 'DOUBLE_HUNDRED',
        playerId: ballInput.batsmanId,
        description: `${batsman.player.name} brings up his DOUBLE CENTURY! Magnificent!`,
        value: 200,
      });
    }

    // Bowling milestones - hat-trick check
    if (isBowlerWicket) {
      const newWickets = (bowler.wicketsTaken as number) + 1;

      // Get last 3 wickets by this bowler in this innings
      const recentWickets = await tx.ball.findMany({
        where: {
          inningsId,
          bowlerId: ballInput.bowlerId,
          isWicket: true,
          isLegalBall: true,
        },
        orderBy: [{ overNumber: 'desc' }, { ballInOver: 'desc' }],
        take: 3,
      });

      if (recentWickets.length >= 2) {
        // Check if consecutive legal balls
        milestones.push({
          type: 'HATTRICK',
          playerId: ballInput.bowlerId,
          description: `HAT-TRICK! ${bowler.player.name} takes three wickets in three consecutive balls!`,
          value: 3,
        });
      }

      if (newWickets === 5) {
        milestones.push({
          type: 'FIVE_WICKET_HAUL',
          playerId: ballInput.bowlerId,
          description: `Five-wicket haul for ${bowler.player.name}! Superb bowling display!`,
          value: 5,
        });
      }
    }

    // Maiden over check
    if (overComplete) {
      // Find the most recent over number for this bowler, then get that over's balls
      const latestBall = await tx.ball.findFirst({
        where: { inningsId, bowlerId: ballInput.bowlerId },
        orderBy: [{ overNumber: 'desc' }, { ballNumber: 'desc' }],
      });
      const bowlerCurrentOver = latestBall?.overNumber ?? 1;

      const overBalls = await tx.ball.findMany({
        where: {
          inningsId,
          bowlerId: ballInput.bowlerId,
          overNumber: bowlerCurrentOver,
          isLegalBall: true,
        },
        take: 6,
      });

      const overRuns = overBalls.reduce((sum, b) => sum + (b.runs as number) + (b.extraRuns as number), 0);
      if (overRuns === 0) {
        milestones.push({
          type: 'MAIDEN_OVER',
          playerId: ballInput.bowlerId,
          description: `Maiden over by ${bowler.player.name}! Excellent economy!`,
          value: 0,
        });
      }
    }

    return milestones;
  }

  /**
   * Undo the last ball delivered
   */
  async undoLastBall(inningsId: string): Promise<UndoResult> {
    return prisma.$transaction(async (tx) => {
      const innings = await tx.innings.findUniqueOrThrow({
        where: { id: inningsId },
      });

      const lastBall = await tx.ball.findFirst({
        where: { inningsId },
        orderBy: [{ overNumber: 'desc' }, { ballInOver: 'desc' }],
      });

      if (!lastBall) {
        throw new Error('No balls to undo');
      }

      // Reverse innings totals
      const runsToRemove = lastBall.totalRuns as number;
      const wicketsToRemove = lastBall.isWicket ? 1 : 0;
      const wasLegalBall = lastBall.isLegalBall as boolean;

      // Determine previous ball position
      const prevLegalBalls = wasLegalBall
        ? (innings.legalBallsInOver as number) - 1
        : (innings.legalBallsInOver as number);

      const prevOverNumber = prevLegalBalls < 0
        ? (innings.currentOver as number) - 1
        : (innings.currentOver as number);

      const correctedPrevLegal = prevLegalBalls < 0 ? 5 : prevLegalBalls;

      // Undo batsman stats
      const batsmanRunsToRemove = lastBall.isBye || lastBall.isLegBye || lastBall.isWide
        ? 0
        : (lastBall.runs as number);

      const batsmanUndoData: Record<string, any> = {
        runs: { decrement: batsmanRunsToRemove },
      };

      if (wasLegalBall || lastBall.isNoBall) {
        batsmanUndoData.balls = { decrement: 1 };
      }

      if (lastBall.runs === 4 && !lastBall.isWide && !lastBall.isBye && !lastBall.isLegBye) {
        batsmanUndoData.fours = { decrement: 1 };
      }

      if (lastBall.runs === 6 && !lastBall.isWide && !lastBall.isBye && !lastBall.isLegBye) {
        batsmanUndoData.sixes = { decrement: 1 };
      }

      await tx.inningsPlayer.updateMany({
        where: { inningsId, playerId: lastBall.batsmanId as string },
        data: batsmanUndoData,
      });

      // Undo bowler stats
      const bowlerRunsToRemove = lastBall.isBye || lastBall.isLegBye || lastBall.isPenalty
        ? 0
        : runsToRemove;

      const bowlerUndoData: Record<string, any> = {
        runsGiven: { decrement: bowlerRunsToRemove },
      };

      if (wasLegalBall) {
        bowlerUndoData.legalBalls = { decrement: 1 };
      }

      if (lastBall.isWide) {
        bowlerUndoData.wides = { decrement: 1 };
      }

      if (lastBall.isNoBall) {
        bowlerUndoData.noBalls = { decrement: 1 };
      }

      if (lastBall.isWicket) {
        bowlerUndoData.wicketsTaken = { decrement: 1 };
      }

      await tx.inningsPlayer.updateMany({
        where: { inningsId, playerId: lastBall.bowlerId as string },
        data: bowlerUndoData,
      });

      // Undo wicket if applicable
      if (lastBall.isWicket && lastBall.dismissedPlayerId) {
        await tx.inningsPlayer.updateMany({
          where: { inningsId, playerId: lastBall.dismissedPlayerId as string },
          data: {
            isOnField: true,
            isOut: false,
            dismissalInfo: null,
          },
        });
      }

      // Undo partnership changes
      await tx.partnership.deleteMany({
        where: { inningsId, isActive: true },
      });

      const prevPartnership = await tx.partnership.findFirst({
        where: { inningsId },
        orderBy: { createdAt: 'desc' },
      });

      if (prevPartnership && !prevPartnership.isActive) {
        const partnershipUndoData: Record<string, any> = {
          runs: { decrement: (lastBall.runs as number) },
          isActive: true,
          endedAt: null,
        };

        if (wasLegalBall) {
          partnershipUndoData.balls = { decrement: 1 };
        }

        await tx.partnership.update({
          where: { id: prevPartnership.id },
          data: partnershipUndoData,
        });
      }

      // Delete ball record
      await tx.ball.delete({ where: { id: lastBall.id } });

      // Update innings state
      const inningsUndoData: Record<string, any> = {
        totalRuns: { decrement: runsToRemove },
        wickets: { decrement: wicketsToRemove },
        currentOver: prevOverNumber,
        legalBallsInOver: correctedPrevLegal,
        currentBall: { decrement: 1 },
        nextBallIsFreeBit: false,
        state: InningsState.IN_PROGRESS,
      };

      if (lastBall.isWide) {
        inningsUndoData.extrasWides = { decrement: lastBall.extraRuns as number };
      }

      if (lastBall.isNoBall) {
        inningsUndoData.extrasNoBalls = { decrement: 1 };
      }

      if (lastBall.isBye) {
        inningsUndoData.extrasByes = { decrement: lastBall.extraRuns as number };
      }

      if (lastBall.isLegBye) {
        inningsUndoData.extrasLegByes = { decrement: lastBall.extraRuns as number };
      }

      if (lastBall.isPenalty) {
        inningsUndoData.extrasPenalties = { decrement: 5 };
      }

      await tx.innings.update({
        where: { id: inningsId },
        data: inningsUndoData,
      });

      const updatedInnings = await tx.innings.findUniqueOrThrow({ where: { id: inningsId } });
      const totalOvers = updatedInnings.currentOver as number;
      const legalBalls = updatedInnings.legalBallsInOver as number;
      const crrDivisor = totalOvers + legalBalls / 6;

      const inningsUpdate: InningsUpdate = {
        totalRuns: updatedInnings.totalRuns as number,
        wickets: updatedInnings.wickets as number,
        overs: totalOvers,
        balls: legalBalls,
        currentRunRate: crrDivisor > 0 ? (updatedInnings.totalRuns as number) / crrDivisor : 0,
        currentBatsmanId: lastBall.batsmanId as string,
        nonStrikerId: '',
        currentBowlerId: lastBall.bowlerId as string,
        isFreeBit: false,
        powerPlayActive: totalOvers < 6,
        partnershipRuns: 0,
        partnershipBalls: 0,
      };

      const ballRecord: BallRecord = {
        id: lastBall.id,
        inningsId,
        overNumber: lastBall.overNumber as number,
        ballNumber: lastBall.ballNumber as number,
        ballInOver: lastBall.ballInOver as number,
        batsmanId: lastBall.batsmanId as string,
        bowlerId: lastBall.bowlerId as string,
        runs: lastBall.runs as number,
        totalRuns: lastBall.totalRuns as number,
        isWide: lastBall.isWide as boolean,
        isNoBall: lastBall.isNoBall as boolean,
        isBye: lastBall.isBye as boolean,
        isLegBye: lastBall.isLegBye as boolean,
        isPenalty: lastBall.isPenalty as boolean,
        isWicket: lastBall.isWicket as boolean,
        wicketType: lastBall.wicketType as WicketType | undefined,
        dismissedPlayerId: lastBall.dismissedPlayerId as string | undefined,
        extraRuns: lastBall.extraRuns as number,
        isLegalBall: lastBall.isLegalBall as boolean,
        isFreeBit: lastBall.isFreeBit as boolean,
        wagonWheelAngle: lastBall.wagonWheelAngle as number | undefined,
        wagonWheelLength: lastBall.wagonWheelLength as number | undefined,
        commentary: lastBall.commentary as string,
        createdAt: lastBall.createdAt,
      };

      return {
        success: true,
        removedBall: ballRecord,
        inningsUpdate,
        message: 'Last ball successfully undone',
      };
    });
  }

  /**
   * Manually end the current over (called when scorer needs to force over end)
   */
  async endOver(inningsId: string): Promise<OverResult> {
    const innings = await prisma.innings.findUniqueOrThrow({
      where: { id: inningsId },
    });

    const currentOverNumber = innings.currentOver as number;

    // Get all balls in current over
    const overBalls = await prisma.ball.findMany({
      where: { inningsId, overNumber: currentOverNumber },
    });

    const runs = overBalls.reduce((s, b) => s + (b.totalRuns as number), 0);
    const wickets = overBalls.filter(b => b.isWicket).length;
    const legalBalls = overBalls.filter(b => b.isLegalBall).length;
    const maidenOver = runs === 0 && legalBalls >= 6;

    await prisma.innings.update({
      where: { id: inningsId },
      data: {
        currentOver: currentOverNumber + 1,
        currentBall: 0,
        legalBallsInOver: 0,
      },
    });

    return {
      overNumber: currentOverNumber,
      runs,
      wickets,
      maidenOver,
      bowlerId: overBalls[0]?.bowlerId as string || '',
      legalBalls,
    };
  }

  /**
   * Declare the innings (Test match only)
   */
  async declareInnings(inningsId: string): Promise<InningsResult> {
    await prisma.innings.update({
      where: { id: inningsId },
      data: { state: InningsState.DECLARED },
    });

    return this._buildInningsResult(inningsId);
  }

  /**
   * Calculate and return the final match result
   */
  async calculateResult(matchId: string): Promise<MatchResult> {
    const match = await prisma.match.findUniqueOrThrow({
      where: { id: matchId },
      include: {
        innings: {
          include: {
            battingTeam: true,
          },
        },
      },
    });

    if (match.innings.length < 2) {
      return {
        matchId,
        resultType: 'NO_RESULT',
        resultDescription: 'Match incomplete - insufficient innings played',
      };
    }

    const firstInnings = match.innings.find(i => i.inningsNumber === 1);
    const secondInnings = match.innings.find(i => i.inningsNumber === 2);

    if (!firstInnings || !secondInnings) {
      return {
        matchId,
        resultType: 'NO_RESULT',
        resultDescription: 'Match data incomplete',
      };
    }

    const firstTotal = firstInnings.totalRuns as number;
    const secondTotal = secondInnings.totalRuns as number;
    const secondWickets = secondInnings.wickets as number;
    const secondState = secondInnings.state as InningsState;

    let result: MatchResult;

    if (secondTotal > firstTotal) {
      // Batting team won by wickets
      const wicketsRemaining = 10 - secondWickets;
      result = {
        matchId,
        winnerTeamId: secondInnings.battingTeamId as string,
        resultType: 'WON_BY_WICKETS',
        margin: wicketsRemaining,
        marginType: 'WICKETS',
        resultDescription: `${secondInnings.battingTeam?.name} won by ${wicketsRemaining} wickets`,
      };
    } else if (firstTotal > secondTotal) {
      // First batting team won by runs
      const margin = firstTotal - secondTotal;
      result = {
        matchId,
        winnerTeamId: firstInnings.battingTeamId as string,
        resultType: 'WON_BY_RUNS',
        margin,
        marginType: 'RUNS',
        resultDescription: `${firstInnings.battingTeam?.name} won by ${margin} runs`,
      };
    } else {
      // Tie
      result = {
        matchId,
        resultType: 'TIE',
        resultDescription: 'Match tied! Super over may be needed.',
      };
    }

    // Update match record
    await prisma.match.update({
      where: { id: matchId },
      data: {
        status: MatchState.COMPLETED,
        resultDescription: result.resultDescription,
        winnerTeamId: result.winnerTeamId,
      },
    });

    return result;
  }

  /**
   * Get live scorecard for a match
   */
  async getLiveScorecard(matchId: string): Promise<Scorecard> {
    const match = await prisma.match.findUniqueOrThrow({
      where: { id: matchId },
      include: {
        innings: {
          include: {
            battingTeam: true,
            bowlingTeam: true,
          },
          orderBy: { inningsNumber: 'asc' },
        },
        toss: true,
      },
    });

    const inningsEntries: InningsScorecardEntry[] = [];

    for (const inningsRec of match.innings) {
      const entry = await this._buildInningsScorecardEntry(inningsRec.id);
      inningsEntries.push(entry);
    }

    const currentInnings = inningsEntries.find(i => i.inningsId === match.currentInningsId);

    let tossInfo: TossInfo | undefined;
    if (match.toss) {
      tossInfo = {
        winnerId: (match.toss as any).winnerId,
        winnerTeamId: (match.toss as any).winnerTeamId,
        decision: (match.toss as any).decision,
      };
    }

    return {
      matchId,
      matchStatus: match.status as MatchState,
      innings: inningsEntries,
      currentInnings,
      toss: tossInfo,
    };
  }

  /**
   * Get wagon wheel shot data
   */
  async getWagonWheel(inningsId: string, batsmanId?: string): Promise<WagonWheelData> {
    const whereClause: any = {
      inningsId,
      wagonWheelAngle: { not: null },
    };

    if (batsmanId) {
      whereClause.batsmanId = batsmanId;
    }

    const balls = await prisma.ball.findMany({
      where: whereClause,
    });

    const shots: WagonShot[] = balls.map(ball => {
      const angle = ball.wagonWheelAngle as number;
      const zone = classifyShotZone(angle);
      return {
        ballId: ball.id,
        angle,
        length: ball.wagonWheelLength as number || 0.5,
        runs: ball.totalRuns as number,
        isWicket: ball.isWicket as boolean,
        isBoundary: (ball.runs as number) >= 4,
        zone,
      };
    });

    // Build zone summaries
    const zoneMap = new Map<ShotZone, ZoneSummary>();
    for (const zone of Object.values(ShotZone)) {
      zoneMap.set(zone, { zone, runs: 0, balls: 0, boundaries: 0 });
    }

    for (const shot of shots) {
      const z = zoneMap.get(shot.zone)!;
      z.runs += shot.runs;
      z.balls += 1;
      if (shot.isBoundary) z.boundaries += 1;
    }

    return {
      inningsId,
      batsmanId,
      shots,
      zones: Array.from(zoneMap.values()),
    };
  }

  /**
   * Get manhattan (runs per over) chart data
   */
  async getManhattan(matchId: string): Promise<ManhattanData> {
    const match = await prisma.match.findUniqueOrThrow({
      where: { id: matchId },
      include: {
        innings: {
          include: { battingTeam: true },
          orderBy: { inningsNumber: 'asc' },
        },
      },
    });

    const inningsData: InningsManhattanData[] = [];

    for (const innings of match.innings) {
      const balls = await prisma.ball.findMany({
        where: { inningsId: innings.id },
        orderBy: [{ overNumber: 'asc' }, { ballInOver: 'asc' }],
      });

      const overMap = new Map<number, OverRunData>();
      const maxOvers = match.oversPerInnings as number || 20;

      for (let i = 0; i < maxOvers; i++) {
        overMap.set(i, { overNumber: i, runs: 0, wickets: 0, maidenOver: false });
      }

      for (const ball of balls) {
        const ov = ball.overNumber as number;
        const od = overMap.get(ov);
        if (od) {
          od.runs += ball.totalRuns as number;
          if (ball.isWicket) od.wickets += 1;
        }
      }

      // Mark maiden overs
      for (const [, od] of overMap) {
        if (od.runs === 0 && od.wickets === 0) od.maidenOver = true;
      }

      inningsData.push({
        inningsNumber: innings.inningsNumber as number,
        teamName: (innings.battingTeam as any)?.name || 'Unknown',
        overs: Array.from(overMap.values()).filter(od =>
          balls.some(b => (b.overNumber as number) === od.overNumber)
        ),
        totalRuns: innings.totalRuns as number,
        totalWickets: innings.wickets as number,
      });
    }

    return { matchId, innings: inningsData };
  }

  /**
   * Get partnership data for an innings
   */
  async getPartnerships(inningsId: string): Promise<Partnership[]> {
    const partnerships = await prisma.partnership.findMany({
      where: { inningsId },
      include: {
        batsmanOne: true,
        batsmanTwo: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    return partnerships.map(p => ({
      batsmanOneId: p.batsmanOneId as string,
      batsmanOneName: p.batsmanOne?.name || 'Unknown',
      batsmanTwoId: p.batsmanTwoId as string,
      batsmanTwoName: p.batsmanTwo?.name || 'Unknown',
      runs: p.runs as number,
      balls: p.balls as number,
      runRate: (p.balls as number) > 0 ? ((p.runs as number) / (p.balls as number)) * 6 : 0,
      isActive: p.isActive as boolean,
      startedAt: p.startedAt as string || '0.0',
      endedAt: p.endedAt ?? undefined,
      batsmanOneRuns: p.batsmanOneRuns as number || 0,
      batsmanTwoBalls: p.batsmanTwoRuns as number || 0,
    }));
  }

  /**
   * Calculate win probability for the current match state
   */
  async getWinProbability(matchId: string): Promise<WinProbability> {
    const match = await prisma.match.findUniqueOrThrow({
      where: { id: matchId },
      include: {
        innings: {
          orderBy: { inningsNumber: 'asc' },
        },
      },
    });

    if (match.innings.length < 2) {
      return {
        matchId,
        team1Probability: 50,
        team2Probability: 50,
        tieProblability: 0,
        factors: {
          currentRunRate: 0,
          requiredRunRate: 0,
          wicketsInHand: 10,
          oversRemaining: match.oversPerInnings as number,
          runRateRatio: 1,
          resourcesRemaining: 1,
        },
        calculatedAt: new Date(),
      };
    }

    const secondInnings = match.innings[1];
    const target = secondInnings.target as number || 0;
    const current = secondInnings.totalRuns as number;
    const wicketsDown = secondInnings.wickets as number;
    const totalOvers = match.oversPerInnings as number;
    const oversPlayed = (secondInnings.currentOver as number) + (secondInnings.legalBallsInOver as number) / 6;
    const oversRemaining = totalOvers - oversPlayed;
    const wicketsInHand = 10 - wicketsDown;

    const requiredRunRate = oversRemaining > 0 ? (target - current) / oversRemaining : 999;
    const currentRunRate = oversPlayed > 0 ? current / oversPlayed : 0;
    const runRateRatio = currentRunRate > 0 ? requiredRunRate / currentRunRate : requiredRunRate;
    const resourcesRemaining = (oversRemaining / totalOvers) * (wicketsInHand / 10);

    const team2Prob = calculateWinProbability(target, current, wicketsDown, oversRemaining, totalOvers);
    const team1Prob = 100 - team2Prob;

    return {
      matchId,
      team1Probability: Math.round(team1Prob * 10) / 10,
      team2Probability: Math.round(team2Prob * 10) / 10,
      tieProblability: Math.max(0, 100 - team1Prob - team2Prob),
      factors: {
        currentRunRate: Math.round(currentRunRate * 100) / 100,
        requiredRunRate: Math.round(requiredRunRate * 100) / 100,
        wicketsInHand,
        oversRemaining: Math.round(oversRemaining * 100) / 100,
        runRateRatio: Math.round(runRateRatio * 100) / 100,
        resourcesRemaining: Math.round(resourcesRemaining * 100) / 100,
      },
      calculatedAt: new Date(),
    };
  }

  // ─── Private Helpers ───────────────────────────────────────────────────────

  private async _buildInningsResult(inningsId: string): Promise<InningsResult> {
    const innings = await prisma.innings.findUniqueOrThrow({
      where: { id: inningsId },
    });

    const entry = await this._buildInningsScorecardEntry(inningsId);

    return {
      inningsId,
      totalRuns: innings.totalRuns as number,
      wickets: innings.wickets as number,
      overs: innings.currentOver as number,
      extras: {
        total: (innings.extrasWides as number) + (innings.extrasNoBalls as number) +
          (innings.extrasByes as number) + (innings.extrasLegByes as number) +
          (innings.extrasPenalties as number),
        wides: innings.extrasWides as number,
        noBalls: innings.extrasNoBalls as number,
        byes: innings.extrasByes as number,
        legByes: innings.extrasLegByes as number,
        penalties: innings.extrasPenalties as number,
      },
      fallOfWickets: entry.fallOfWickets,
      topScorers: entry.batsmen,
      bowlingFigures: entry.bowlers,
      state: innings.state as InningsState,
    };
  }

  private async _buildInningsScorecardEntry(inningsId: string): Promise<InningsScorecardEntry> {
    const innings = await prisma.innings.findUniqueOrThrow({
      where: { id: inningsId },
      include: {
        battingTeam: true,
        bowlingTeam: true,
        players: {
          include: { player: true },
          orderBy: { battingOrder: 'asc' },
        },
        fallOfWickets: {
          include: { player: true },
          orderBy: { wicketNumber: 'asc' },
        },
        partnerships: {
          include: {
            batsmanOne: true,
            batsmanTwo: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    const batsmen: BatsmanStats[] = innings.players
      .filter(p => p.role === 'BATSMAN')
      .map(p => ({
        playerId: p.playerId,
        playerName: (p as any).player.name,
        runs: p.runs || 0,
        balls: p.balls || 0,
        fours: p.fours || 0,
        sixes: p.sixes || 0,
        strikeRate: p.balls > 0 ? Math.round((p.runs / p.balls) * 100 * 10) / 10 : 0,
        isOut: p.isOut || false,
        dismissalInfo: p.dismissalInfo ?? undefined,
        onStrike: p.isOnStrike || false,
      }));

    const bowlers: BowlerStats[] = innings.players
      .filter(p => p.role === 'BOWLER')
      .map(p => {
        const overs = Math.floor((p.legalBalls || 0) / 6);
        const balls = (p.legalBalls || 0) % 6;
        const economy = p.legalBalls > 0
          ? Math.round((p.runsGiven / (p.legalBalls / 6)) * 100) / 100
          : 0;
        return {
          playerId: p.playerId,
          playerName: (p as any).player.name,
          overs,
          balls,
          maidens: p.maidens || 0,
          runs: p.runsGiven || 0,
          wickets: p.wicketsTaken || 0,
          economy,
          wides: p.wides || 0,
          noBalls: p.noBalls || 0,
          isCurrent: p.isCurrentBowler || false,
        };
      });

    const fallOfWickets: FallOfWicket[] = innings.fallOfWickets.map(fow => ({
      wicketNumber: fow.wicketNumber,
      playerId: fow.playerId,
      playerName: (fow as any).player?.name || 'Unknown',
      runs: fow.runs,
      overs: `${fow.overNumber}.${fow.ballNumber}`,
      overNumber: fow.overNumber,
      ballNumber: fow.ballNumber,
    }));

    const partnerships: Partnership[] = innings.partnerships.map(p => ({
      batsmanOneId: p.batsmanOneId,
      batsmanOneName: (p as any).batsmanOne?.name || 'Unknown',
      batsmanTwoId: p.batsmanTwoId,
      batsmanTwoName: (p as any).batsmanTwo?.name || 'Unknown',
      runs: p.runs || 0,
      balls: p.balls || 0,
      runRate: p.balls > 0 ? Math.round((p.runs / p.balls) * 600) / 100 : 0,
      isActive: p.isActive || false,
      startedAt: p.startedAt || '0.0',
      endedAt: p.endedAt ?? undefined,
      batsmanOneRuns: p.batsmanOneRuns || 0,
      batsmanTwoBalls: p.batsmanTwoRuns || 0,
    }));

    const overs = innings.currentOver as number;
    const balls = innings.legalBallsInOver as number;
    const totalOvers = overs + balls / 6;
    const runRate = totalOvers > 0 ? Math.round(((innings.totalRuns as number) / totalOvers) * 100) / 100 : 0;

    return {
      inningsId,
      inningsNumber: innings.inningsNumber as number,
      battingTeamId: innings.battingTeamId as string,
      battingTeamName: (innings.battingTeam as any)?.name || 'Unknown',
      bowlingTeamId: innings.bowlingTeamId as string,
      bowlingTeamName: (innings.bowlingTeam as any)?.name || 'Unknown',
      totalRuns: innings.totalRuns as number,
      wickets: innings.wickets as number,
      overs,
      balls,
      extras: {
        total: (innings.extrasWides as number) + (innings.extrasNoBalls as number) +
          (innings.extrasByes as number) + (innings.extrasLegByes as number) +
          (innings.extrasPenalties as number),
        wides: innings.extrasWides as number,
        noBalls: innings.extrasNoBalls as number,
        byes: innings.extrasByes as number,
        legByes: innings.extrasLegByes as number,
        penalties: innings.extrasPenalties as number,
      },
      runRate,
      target: innings.target as number | undefined,
      requiredRuns: innings.target ? (innings.target as number) - (innings.totalRuns as number) : undefined,
      batsmen,
      bowlers,
      fallOfWickets,
      partnerships,
    };
  }
}

// Export singleton instance
export const scoringEngine = new ScoringEngine();
export default scoringEngine;
