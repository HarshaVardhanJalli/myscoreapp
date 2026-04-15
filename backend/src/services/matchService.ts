/**
 * Match Service - Business logic for match management
 * created_by: MyCricketScoreEngine_v1
 */

import { PrismaClient } from '@prisma/client';
import { MatchState, InningsState } from './scoringEngine';

const prisma = new PrismaClient();

export interface CreateMatchInput {
  title: string;
  description?: string;
  matchType: 'T20' | 'ODI' | 'TEST' | 'T10' | 'CUSTOM';
  oversPerInnings: number;
  team1Id: string;
  team2Id: string;
  venueId?: string;
  venueName?: string;
  scheduledAt?: Date;
  tournamentId?: string;
  createdBy: string;
  latitude?: number;
  longitude?: number;
  isPublic?: boolean;
}

export interface UpdateMatchInput {
  title?: string;
  description?: string;
  venueId?: string;
  venueName?: string;
  scheduledAt?: Date;
  dlsTarget?: number;
  isPublic?: boolean;
}

export interface TossInput {
  winnerTeamId: string;
  decision: 'BAT' | 'BOWL';
}

export interface PlayingXIInput {
  teamId: string;
  playerIds: string[];  // ordered by batting position
}

export interface StartInningsInput {
  battingTeamId: string;
  bowlingTeamId: string;
  openingBatsmanIds: [string, string];
  openingBowlerId: string;
}

export interface MatchFilter {
  status?: MatchState;
  teamId?: string;
  userId?: string;
  tournamentId?: string;
  page?: number;
  limit?: number;
}

export interface NearbyMatchFilter {
  latitude: number;
  longitude: number;
  radiusKm?: number;
  status?: MatchState;
}

const CREATED_BY_TAG = 'MyCricketScoreEngine_v1';

export class MatchService {

  async createMatch(input: CreateMatchInput) {
    const oversMap: Record<string, number> = {
      T20: 20, ODI: 50, TEST: 0, T10: 10, CUSTOM: input.oversPerInnings,
    };

    const overs = input.matchType === 'CUSTOM'
      ? input.oversPerInnings
      : (oversMap[input.matchType] ?? input.oversPerInnings);

    return prisma.match.create({
      data: {
        title: input.title,
        description: input.description,
        matchType: input.matchType,
        oversPerInnings: overs,
        team1Id: input.team1Id,
        team2Id: input.team2Id,
        venueId: input.venueId,
        venueName: input.venueName,
        scheduledAt: input.scheduledAt,
        tournamentId: input.tournamentId,
        createdById: input.createdBy,
        status: MatchState.SETUP,
        createdByTag: CREATED_BY_TAG,
        isPublic: input.isPublic ?? true,
        latitude: input.latitude,
        longitude: input.longitude,
      },
      include: {
        team1: true,
        team2: true,
        venue: true,
        tournament: true,
      },
    });
  }

  async getMatch(matchId: string) {
    return prisma.match.findUniqueOrThrow({
      where: { id: matchId },
      include: {
        team1: { include: { players: { include: { player: true } } } },
        team2: { include: { players: { include: { player: true } } } },
        toss: true,
        venue: true,
        tournament: true,
        innings: {
          orderBy: { inningsNumber: 'asc' },
          include: {
            battingTeam: true,
            bowlingTeam: true,
          },
        },
        createdByUser: {
          select: { id: true, name: true, username: true },
        },
      },
    });
  }

  async listMatches(filter: MatchFilter) {
    const { status, teamId, userId, tournamentId, page = 1, limit = 20 } = filter;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (status) where.status = status;
    if (userId) where.createdById = userId;
    if (tournamentId) where.tournamentId = tournamentId;
    if (teamId) {
      where.OR = [{ team1Id: teamId }, { team2Id: teamId }];
    }

    const [matches, total] = await Promise.all([
      prisma.match.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          team1: { select: { id: true, name: true, shortName: true } },
          team2: { select: { id: true, name: true, shortName: true } },
          venue: { select: { id: true, name: true, city: true } },
          innings: {
            select: {
              inningsNumber: true,
              totalRuns: true,
              wickets: true,
              currentOver: true,
              legalBallsInOver: true,
              state: true,
              battingTeamId: true,
            },
          },
          _count: { select: { likes: true, comments: true } },
        },
      }),
      prisma.match.count({ where }),
    ]);

    return {
      matches,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async updateMatch(matchId: string, input: UpdateMatchInput) {
    return prisma.match.update({
      where: { id: matchId },
      data: {
        ...input,
        updatedAt: new Date(),
      },
    });
  }

  async deleteMatch(matchId: string) {
    // Soft delete
    return prisma.match.update({
      where: { id: matchId },
      data: { deletedAt: new Date() },
    });
  }

  async recordToss(matchId: string, input: TossInput) {
    const match = await prisma.match.findUniqueOrThrow({
      where: { id: matchId },
    });

    if (match.status !== MatchState.SETUP && match.status !== MatchState.TOSS) {
      throw new Error(`Cannot record toss for match in state: ${match.status}`);
    }

    // Determine who bats first
    const battingFirst = input.decision === 'BAT' ? input.winnerTeamId :
      (input.winnerTeamId === match.team1Id ? match.team2Id : match.team1Id);

    const toss = await prisma.toss.create({
      data: {
        matchId,
        winnerTeamId: input.winnerTeamId,
        decision: input.decision,
        battingFirstTeamId: battingFirst,
      },
    });

    await prisma.match.update({
      where: { id: matchId },
      data: { status: MatchState.TOSS, tossId: toss.id },
    });

    return toss;
  }

  async setPlayingXI(matchId: string, input: PlayingXIInput) {
    const match = await prisma.match.findUniqueOrThrow({
      where: { id: matchId },
    });

    if (match.status === MatchState.COMPLETED || match.status === MatchState.ABANDONED) {
      throw new Error('Match is already complete');
    }

    if (input.playerIds.length < 2 || input.playerIds.length > 11) {
      throw new Error('Playing XI must have between 2 and 11 players');
    }

    // Upsert team-match playing XI
    await prisma.matchTeamPlayer.deleteMany({
      where: { matchId, teamId: input.teamId },
    });

    await prisma.matchTeamPlayer.createMany({
      data: input.playerIds.map((pid, idx) => ({
        matchId,
        teamId: input.teamId,
        playerId: pid,
        battingOrder: idx + 1,
      })),
    });

    return { success: true, teamId: input.teamId, players: input.playerIds };
  }

  async startInnings(matchId: string, input: StartInningsInput) {
    const match = await prisma.match.findUniqueOrThrow({
      where: { id: matchId },
      include: { innings: { orderBy: { inningsNumber: 'asc' } } },
    });

    const currentInningsNum = (match.innings.length || 0) + 1;

    if (currentInningsNum > 2 && match.matchType !== 'TEST') {
      throw new Error('Only 2 innings allowed in limited-overs matches');
    }

    // Get previous innings total for target calculation
    let target: number | undefined;
    if (currentInningsNum === 2) {
      const firstInnings = match.innings[0];
      if (firstInnings) {
        target = (firstInnings.totalRuns as number) + 1;
      }
    }

    const battingXI = await prisma.matchTeamPlayer.findMany({
      where: { matchId, teamId: input.battingTeamId },
      orderBy: { battingOrder: 'asc' },
    });

    const bowlingXI = await prisma.matchTeamPlayer.findMany({
      where: { matchId, teamId: input.bowlingTeamId },
      orderBy: { battingOrder: 'asc' },
    });

    const innings = await prisma.innings.create({
      data: {
        matchId,
        inningsNumber: currentInningsNum,
        battingTeamId: input.battingTeamId,
        bowlingTeamId: input.bowlingTeamId,
        totalRuns: 0,
        wickets: 0,
        currentOver: 0,
        currentBall: 0,
        legalBallsInOver: 0,
        extrasWides: 0,
        extrasNoBalls: 0,
        extrasByes: 0,
        extrasLegByes: 0,
        extrasPenalties: 0,
        target,
        state: InningsState.IN_PROGRESS,
        nextBallIsFreeBit: false,
        playingXI: JSON.stringify(battingXI.map((player) => player.playerId)),
      },
    });

    // Create batsmen innings players
    await prisma.inningsPlayer.createMany({
      data: battingXI.map((p, idx) => ({
        inningsId: innings.id,
        playerId: p.playerId,
        role: 'BATSMAN',
        battingOrder: idx + 1,
        isOnField: input.openingBatsmanIds.includes(p.playerId),
        isOnStrike: p.playerId === input.openingBatsmanIds[0],
        isOut: false,
        runs: 0,
        balls: 0,
        fours: 0,
        sixes: 0,
        runsGiven: 0,
        legalBalls: 0,
        wides: 0,
        noBalls: 0,
        wicketsTaken: 0,
        maidens: 0,
        isCurrentBowler: false,
      })),
    });

    // Create bowlers innings players
    await prisma.inningsPlayer.createMany({
      data: bowlingXI.map(p => ({
        inningsId: innings.id,
        playerId: p.playerId,
        role: 'BOWLER',
        battingOrder: 0,
        isOnField: p.playerId === input.openingBowlerId,
        isOnStrike: false,
        isOut: false,
        runs: 0,
        balls: 0,
        fours: 0,
        sixes: 0,
        runsGiven: 0,
        legalBalls: 0,
        wides: 0,
        noBalls: 0,
        wicketsTaken: 0,
        maidens: 0,
        isCurrentBowler: p.playerId === input.openingBowlerId,
      })),
    });

    // Create initial partnership
    await prisma.partnership.create({
      data: {
        inningsId: innings.id,
        batsmanOneId: input.openingBatsmanIds[0],
        batsmanTwoId: input.openingBatsmanIds[1],
        runs: 0,
        balls: 0,
        isActive: true,
        startedAt: '0.1',
      },
    });

    // Update match state and current innings
    await prisma.match.update({
      where: { id: matchId },
      data: {
        status: currentInningsNum === 1 ? MatchState.PLAYING : MatchState.SECOND_INNINGS,
        currentInningsId: innings.id,
      },
    });

    return innings;
  }

  async completeMatch(matchId: string) {
    const match = await prisma.match.findUniqueOrThrow({
      where: { id: matchId },
      include: {
        innings: {
          include: { battingTeam: true },
          orderBy: { inningsNumber: 'asc' },
        },
      },
    });

    // Import scoring engine dynamically to avoid circular
    const { scoringEngine } = await import('./scoringEngine');
    const result = await scoringEngine.calculateResult(matchId);

    return result;
  }

  async getNearbyMatches(filter: NearbyMatchFilter) {
    const { latitude, longitude, radiusKm = 50, status } = filter;

    // Haversine approximation: 1 degree lat ≈ 111km
    const latDelta = radiusKm / 111;
    const lngDelta = radiusKm / (111 * Math.cos((latitude * Math.PI) / 180));

    const where: any = {
      latitude: {
        gte: latitude - latDelta,
        lte: latitude + latDelta,
      },
      longitude: {
        gte: longitude - lngDelta,
        lte: longitude + lngDelta,
      },
      isPublic: true,
    };

    if (status) where.status = status;

    return prisma.match.findMany({
      where,
      include: {
        team1: { select: { id: true, name: true, shortName: true } },
        team2: { select: { id: true, name: true, shortName: true } },
        innings: {
          select: {
            inningsNumber: true,
            totalRuns: true,
            wickets: true,
            currentOver: true,
            state: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async getMatchFeed(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    // Get matches from followed teams/users + public matches
    const [matches, total] = await Promise.all([
      prisma.match.findMany({
        where: {
          isPublic: true,
          status: { in: [MatchState.PLAYING, MatchState.SECOND_INNINGS, MatchState.COMPLETED] },
        },
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          team1: { select: { id: true, name: true, shortName: true } },
          team2: { select: { id: true, name: true, shortName: true } },
          innings: {
            select: {
              inningsNumber: true,
              totalRuns: true,
              wickets: true,
              currentOver: true,
              legalBallsInOver: true,
              state: true,
            },
          },
          _count: { select: { likes: true, comments: true } },
          createdByUser: { select: { id: true, name: true, username: true } },
        },
      }),
      prisma.match.count({
        where: {
          isPublic: true,
          status: { in: [MatchState.PLAYING, MatchState.SECOND_INNINGS, MatchState.COMPLETED] },
        },
      }),
    ]);

    return { matches, pagination: { total, page, limit, pages: Math.ceil(total / limit) } };
  }

  async likeMatch(matchId: string, userId: string) {
    const existing = await prisma.matchLike.findFirst({
      where: { matchId, userId },
    });

    if (existing) {
      throw new Error('Already liked this match');
    }

    await prisma.matchLike.create({ data: { matchId, userId } });
    const count = await prisma.matchLike.count({ where: { matchId } });
    return { liked: true, count };
  }

  async unlikeMatch(matchId: string, userId: string) {
    await prisma.matchLike.deleteMany({ where: { matchId, userId } });
    const count = await prisma.matchLike.count({ where: { matchId } });
    return { liked: false, count };
  }

  async addComment(matchId: string, userId: string, content: string) {
    return prisma.matchComment.create({
      data: { matchId, userId, content },
      include: {
        user: { select: { id: true, name: true, username: true, avatarUrl: true } },
      },
    });
  }

  async getComments(matchId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [comments, total] = await Promise.all([
      prisma.matchComment.findMany({
        where: { matchId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, username: true, avatarUrl: true } },
        },
      }),
      prisma.matchComment.count({ where: { matchId } }),
    ]);

    return { comments, pagination: { total, page, limit, pages: Math.ceil(total / limit) } };
  }
}

export const matchService = new MatchService();
export default matchService;
