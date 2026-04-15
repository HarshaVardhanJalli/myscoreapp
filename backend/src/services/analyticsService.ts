/**
 * Analytics Service — player stats, team analytics, form guides
 * created_by: MyCricketScoreEngine_v1
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class AnalyticsService {
  // Player career stats across all matches
  async getPlayerStats(playerId: string) {
    const battingRows = await prisma.inningsPlayer.findMany({
      where: { playerId, role: 'BATSMAN' },
      include: { innings: { include: { match: true } } },
    });

    const bowlingRows = await prisma.inningsPlayer.findMany({
      where: { playerId, role: 'BOWLER' },
    });

    const totalRuns = battingRows.reduce((s, r) => s + r.runs, 0);
    const totalBalls = battingRows.reduce((s, r) => s + r.balls, 0);
    const totalFours = battingRows.reduce((s, r) => s + r.fours, 0);
    const totalSixes = battingRows.reduce((s, r) => s + r.sixes, 0);
    const innings = battingRows.filter((r) => r.balls > 0).length;
    const notOuts = battingRows.filter((r) => !r.isOut && r.balls > 0).length;
    const outs = innings - notOuts;
    const average = outs > 0 ? totalRuns / outs : totalRuns;
    const strikeRate = totalBalls > 0 ? (totalRuns / totalBalls) * 100 : 0;
    const hundreds = battingRows.filter((r) => r.runs >= 100).length;
    const fifties = battingRows.filter((r) => r.runs >= 50 && r.runs < 100).length;
    const highScore = Math.max(0, ...battingRows.map((r) => r.runs));

    const bowlRuns = bowlingRows.reduce((s, r) => s + r.runsGiven, 0);
    const bowlBalls = bowlingRows.reduce((s, r) => s + r.legalBalls, 0);
    const bowlWickets = bowlingRows.reduce((s, r) => s + r.wicketsTaken, 0);
    const bowlOvers = Math.floor(bowlBalls / 6) + (bowlBalls % 6) / 10;
    const economy = bowlBalls > 0 ? (bowlRuns / bowlBalls) * 6 : 0;
    const bowlingAvg = bowlWickets > 0 ? bowlRuns / bowlWickets : 0;
    const maidens = bowlingRows.reduce((s, r) => s + r.maidens, 0);
    const fiveWickets = bowlingRows.filter((r) => r.wicketsTaken >= 5).length;

    return {
      playerId,
      batting: {
        innings,
        notOuts,
        runs: totalRuns,
        balls: totalBalls,
        fours: totalFours,
        sixes: totalSixes,
        average: Math.round(average * 100) / 100,
        strikeRate: Math.round(strikeRate * 100) / 100,
        highScore,
        hundreds,
        fifties,
      },
      bowling: {
        innings: bowlingRows.filter((r) => r.legalBalls > 0).length,
        overs: Math.round(bowlOvers * 10) / 10,
        maidens,
        runs: bowlRuns,
        wickets: bowlWickets,
        economy: Math.round(economy * 100) / 100,
        average: Math.round(bowlingAvg * 100) / 100,
        fiveWickets,
      },
    };
  }

  // Recent form: last N innings
  async getPlayerForm(playerId: string, lastN = 5) {
    const recentBatting = await prisma.inningsPlayer.findMany({
      where: { playerId, role: 'BATSMAN', balls: { gt: 0 } },
      orderBy: { innings: { createdAt: 'desc' } },
      take: lastN,
      include: {
        innings: {
          select: {
            matchId: true,
            createdAt: true,
            battingTeam: { select: { name: true } },
          },
        },
      },
    });

    return recentBatting.map((r) => ({
      matchId: r.innings.matchId,
      date: r.innings.createdAt,
      team: r.innings.battingTeam.name,
      runs: r.runs,
      balls: r.balls,
      strikeRate: r.balls > 0 ? Math.round((r.runs / r.balls) * 10000) / 100 : 0,
      fours: r.fours,
      sixes: r.sixes,
      isOut: r.isOut,
    }));
  }

  // Team batting/bowling stats
  async getTeamStats(teamId: string) {
    const battingInnings = await prisma.innings.findMany({
      where: { battingTeamId: teamId },
      select: {
        totalRuns: true,
        wickets: true,
        currentOver: true,
        legalBallsInOver: true,
        state: true,
        match: { select: { winnerTeamId: true } },
      },
    });

    const totalRuns = battingInnings.reduce((s, i) => s + i.totalRuns, 0);
    const totalOvers = battingInnings.reduce((s, i) => {
      return s + i.currentOver + i.legalBallsInOver / 6;
    }, 0);
    const highestTotal = Math.max(0, ...battingInnings.map((i) => i.totalRuns));
    const lowestTotal = Math.min(9999, ...battingInnings.map((i) => i.totalRuns));

    return {
      teamId,
      batting: {
        innings: battingInnings.length,
        totalRuns,
        average: battingInnings.length > 0 ? Math.round((totalRuns / battingInnings.length) * 10) / 10 : 0,
        highestTotal,
        lowestTotal: lowestTotal === 9999 ? 0 : lowestTotal,
        runRate: totalOvers > 0 ? Math.round((totalRuns / totalOvers) * 100) / 100 : 0,
      },
    };
  }

  // Match-specific batting analytics
  async getInningsBattingAnalytics(inningsId: string) {
    const players = await prisma.inningsPlayer.findMany({
      where: { inningsId, role: 'BATSMAN' },
      include: { player: { select: { name: true } } },
      orderBy: { battingOrder: 'asc' },
    });

    const balls = await prisma.ball.findMany({
      where: { inningsId },
      orderBy: [{ overNumber: 'asc' }, { ballNumber: 'asc' }],
    });

    // Phase analysis
    const powerplay = balls.filter((b) => b.overNumber < 6);
    const middle = balls.filter((b) => b.overNumber >= 6 && b.overNumber < 16);
    const death = balls.filter((b) => b.overNumber >= 16);

    const phaseRuns = (bs: typeof balls) => bs.reduce((s, b) => s + b.totalRuns, 0);
    const phaseWickets = (bs: typeof balls) => bs.filter((b) => b.isWicket).length;

    return {
      batsmen: players.map((p) => ({
        playerId: p.playerId,
        name: p.player.name,
        runs: p.runs,
        balls: p.balls,
        fours: p.fours,
        sixes: p.sixes,
        strikeRate: p.balls > 0 ? Math.round((p.runs / p.balls) * 10000) / 100 : 0,
        isOut: p.isOut,
        dismissalInfo: p.dismissalInfo,
        dotPercentage: p.balls > 0 ? 0 : 0, // calculated below if needed
      })),
      phases: {
        powerplay: {
          overs: '1-6',
          runs: phaseRuns(powerplay),
          wickets: phaseWickets(powerplay),
          balls: powerplay.filter((b) => b.isLegalBall).length,
        },
        middle: {
          overs: '7-16',
          runs: phaseRuns(middle),
          wickets: phaseWickets(middle),
          balls: middle.filter((b) => b.isLegalBall).length,
        },
        death: {
          overs: '17-20',
          runs: phaseRuns(death),
          wickets: phaseWickets(death),
          balls: death.filter((b) => b.isLegalBall).length,
        },
      },
    };
  }

  // Wagon wheel data for an innings / specific batsman
  async getWagonWheel(inningsId: string, batsmanId?: string) {
    const where: any = { inningsId, wagonWheelAngle: { not: null } };
    if (batsmanId) where.batsmanId = batsmanId;

    const balls = await prisma.ball.findMany({ where });

    const shots = balls.map((b) => ({
      ballId: b.id,
      angle: b.wagonWheelAngle!,
      length: b.wagonWheelLength ?? 0.8,
      runs: b.runs,
      isWicket: b.isWicket,
      isBoundary: b.runs >= 4,
    }));

    return { inningsId, batsmanId, shots };
  }

  // Manhattan chart data
  async getManhattan(matchId: string) {
    const innings = await prisma.innings.findMany({
      where: { matchId },
      orderBy: { inningsNumber: 'asc' },
      include: {
        battingTeam: { select: { name: true } },
        balls: { orderBy: [{ overNumber: 'asc' }, { ballNumber: 'asc' }] },
      },
    });

    return innings.map((inn) => {
      const overMap = new Map<number, { runs: number; wickets: number }>();
      for (const ball of inn.balls) {
        if (!overMap.has(ball.overNumber)) {
          overMap.set(ball.overNumber, { runs: 0, wickets: 0 });
        }
        const ov = overMap.get(ball.overNumber)!;
        ov.runs += ball.totalRuns;
        if (ball.isWicket) ov.wickets++;
      }

      const overs = Array.from(overMap.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([overNumber, data]) => ({
          overNumber: overNumber + 1,
          runs: data.runs,
          wickets: data.wickets,
          maidenOver: data.runs === 0,
        }));

      return {
        inningsNumber: inn.inningsNumber,
        teamName: inn.battingTeam.name,
        overs,
        totalRuns: inn.totalRuns,
        totalWickets: inn.wickets,
      };
    });
  }

  // Win probability (simple model)
  async getWinProbability(matchId: string) {
    const match = await prisma.match.findUniqueOrThrow({
      where: { id: matchId },
      include: {
        innings: { orderBy: { inningsNumber: 'asc' } },
        team1: { select: { id: true, name: true } },
        team2: { select: { id: true, name: true } },
      },
    });

    if (match.innings.length < 2) {
      return {
        matchId,
        team1Probability: 50,
        team2Probability: 50,
        tieProbability: 0,
        factors: null,
      };
    }

    const firstInnings = match.innings[0];
    const secondInnings = match.innings[1];
    const target = (firstInnings.totalRuns as number) + 1;
    const current = secondInnings.totalRuns as number;
    const wicketsDown = secondInnings.wickets as number;
    const oversRemaining =
      (match.oversPerInnings - secondInnings.currentOver) -
      (secondInnings.legalBallsInOver as number) / 6;

    const runsNeeded = target - current;
    const wicketsInHand = 10 - wicketsDown;
    const rrrNeeded = oversRemaining > 0 ? runsNeeded / oversRemaining : 999;
    const currentRR = secondInnings.currentOver > 0
      ? current / (secondInnings.currentOver + (secondInnings.legalBallsInOver as number) / 6)
      : 0;

    // Logistic-style probability
    const rrRatio = currentRR > 0 ? rrrNeeded / currentRR : 2;
    const wicketFactor = wicketsInHand / 10;
    const resourceFactor = oversRemaining / match.oversPerInnings;

    let chaseProbability = 50;
    if (runsNeeded <= 0) chaseProbability = 100;
    else if (oversRemaining <= 0) chaseProbability = 0;
    else {
      const raw = 50 / rrRatio * wicketFactor * (1 + resourceFactor);
      chaseProbability = Math.min(95, Math.max(5, raw * 100));
    }

    const battingTeamIsTeam2 = secondInnings.battingTeamId === match.team2Id;
    return {
      matchId,
      team1Probability: battingTeamIsTeam2 ? Math.round(100 - chaseProbability) : Math.round(chaseProbability),
      team2Probability: battingTeamIsTeam2 ? Math.round(chaseProbability) : Math.round(100 - chaseProbability),
      tieProbability: 0,
      factors: {
        currentRunRate: Math.round(currentRR * 100) / 100,
        requiredRunRate: Math.round(rrrNeeded * 100) / 100,
        wicketsInHand,
        oversRemaining: Math.round(oversRemaining * 10) / 10,
        runsNeeded,
        resourcesRemaining: Math.round(resourceFactor * 100),
      },
    };
  }

  // Tournament leaderboard
  async getTournamentLeaderboard(tournamentId: string) {
    return prisma.tournamentTeam.findMany({
      where: { tournamentId },
      orderBy: [{ points: 'desc' }, { nrr: 'desc' }],
      include: {
        team: { select: { id: true, name: true, shortName: true, logoUrl: true } },
      },
    });
  }
}

export const analyticsService = new AnalyticsService();
export default analyticsService;
