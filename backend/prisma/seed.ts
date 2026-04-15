/**
 * Database Seed — My Cricket Score
 * created_by: MyCricketScoreEngine_v1
 *
 * Real Indian cricket player data.
 * All field names match schema.prisma exactly.
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ── Users ──────────────────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash('Password123!', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@myscoreapp.com' },
    update: {},
    create: {
      email: 'admin@myscoreapp.com',
      username: 'admin',
      name: 'Admin User',
      passwordHash,
      role: 'ADMIN',
      isVerified: true,
      country: 'India',
      city: 'Mumbai',
    },
  });

  const user1 = await prisma.user.upsert({
    where: { email: 'scorer@myscoreapp.com' },
    update: {},
    create: {
      email: 'scorer@myscoreapp.com',
      username: 'harsha_scorer',
      name: 'Harsha Kumar',
      passwordHash,
      role: 'SCORER',
      isVerified: true,
      country: 'India',
      city: 'Bengaluru',
      bio: 'Passionate cricket scorer and analyst.',
    },
  });

  const user2 = await prisma.user.upsert({
    where: { email: 'priya@myscoreapp.com' },
    update: {},
    create: {
      email: 'priya@myscoreapp.com',
      username: 'priya_cricket',
      name: 'Priya Sharma',
      passwordHash,
      role: 'USER',
      isVerified: true,
      country: 'India',
      city: 'Delhi',
    },
  });

  await prisma.user.upsert({
    where: { email: 'arjun@myscoreapp.com' },
    update: {},
    create: {
      email: 'arjun@myscoreapp.com',
      username: 'arjun_plays',
      name: 'Arjun Patel',
      passwordHash,
      role: 'USER',
      isVerified: true,
      country: 'India',
      city: 'Ahmedabad',
    },
  });

  console.log('✅ Users created');

  // ── Players — Mumbai Thunder (11 players, indices 0–10) ────────────────────
  // Real Indian international players
  const playerData: Array<{
    id: string;
    name: string;
    nationality: string;
    role: 'BATSMAN' | 'BOWLER' | 'ALL_ROUNDER' | 'WICKET_KEEPER';
    battingStyle: 'RIGHT_HAND' | 'LEFT_HAND';
    bowlingStyle: 'RIGHT_ARM_FAST' | 'RIGHT_ARM_MEDIUM' | 'RIGHT_ARM_OFFBREAK' |
                  'RIGHT_ARM_LEGBREAK' | 'LEFT_ARM_FAST' | 'LEFT_ARM_MEDIUM' |
                  'LEFT_ARM_ORTHODOX' | 'LEFT_ARM_WRIST_SPIN' | null;
    jersey: number;
    // Career batting stats
    batMatches: number; batInnings: number; batRuns: number; batHS: number;
    batAvg: number; batSR: number; bat50s: number; bat100s: number;
    batFours: number; batSixes: number; batNO: number;
    // Career bowling stats
    bowWickets: number; bowBalls: number; bowRuns: number;
    bowAvg: number; bowEcon: number; bowBest: string | null;
    bowFiveW: number;
    // Fielding
    catches: number; stumpings: number; runOuts: number;
  }> = [
    // ── Mumbai Thunder ──────────────────────────────────────────────────────
    {
      id: 'player-virat-kohli',
      name: 'Virat Kohli', nationality: 'Indian',
      role: 'BATSMAN', battingStyle: 'RIGHT_HAND', bowlingStyle: 'RIGHT_ARM_MEDIUM', jersey: 18,
      batMatches: 102, batInnings: 99, batRuns: 4188, batHS: 122, batAvg: 52.35, batSR: 131.1,
      bat50s: 38, bat100s: 5, batFours: 380, batSixes: 99, batNO: 19,
      bowWickets: 4, bowBalls: 48, bowRuns: 72, bowAvg: 18.0, bowEcon: 9.0, bowBest: '1/13',
      bowFiveW: 0, catches: 62, stumpings: 0, runOuts: 0,
    },
    {
      id: 'player-rohit-sharma',
      name: 'Rohit Sharma', nationality: 'Indian',
      role: 'BATSMAN', battingStyle: 'RIGHT_HAND', bowlingStyle: 'RIGHT_ARM_OFFBREAK', jersey: 45,
      batMatches: 151, batInnings: 149, batRuns: 4231, batHS: 118, batAvg: 31.17, batSR: 130.3,
      bat50s: 26, bat100s: 5, batFours: 422, batSixes: 196, batNO: 14,
      bowWickets: 9, bowBalls: 108, bowRuns: 124, bowAvg: 13.8, bowEcon: 6.9, bowBest: '1/9',
      bowFiveW: 0, catches: 63, stumpings: 0, runOuts: 0,
    },
    {
      id: 'player-shubman-gill',
      name: 'Shubman Gill', nationality: 'Indian',
      role: 'BATSMAN', battingStyle: 'RIGHT_HAND', bowlingStyle: null, jersey: 77,
      batMatches: 69, batInnings: 67, batRuns: 2026, batHS: 129, batAvg: 35.5, batSR: 142.6,
      bat50s: 16, bat100s: 4, batFours: 185, batSixes: 72, batNO: 10,
      bowWickets: 0, bowBalls: 0, bowRuns: 0, bowAvg: 0, bowEcon: 0, bowBest: null,
      bowFiveW: 0, catches: 28, stumpings: 0, runOuts: 0,
    },
    {
      id: 'player-suryakumar-yadav',
      name: 'Suryakumar Yadav', nationality: 'Indian',
      role: 'BATSMAN', battingStyle: 'RIGHT_HAND', bowlingStyle: null, jersey: 63,
      batMatches: 64, batInnings: 60, batRuns: 2431, batHS: 117, batAvg: 46.75, batSR: 182.7,
      bat50s: 18, bat100s: 4, batFours: 214, batSixes: 152, batNO: 8,
      bowWickets: 0, bowBalls: 0, bowRuns: 0, bowAvg: 0, bowEcon: 0, bowBest: null,
      bowFiveW: 0, catches: 22, stumpings: 0, runOuts: 0,
    },
    {
      id: 'player-hardik-pandya',
      name: 'Hardik Pandya', nationality: 'Indian',
      role: 'ALL_ROUNDER', battingStyle: 'RIGHT_HAND', bowlingStyle: 'RIGHT_ARM_MEDIUM', jersey: 33,
      batMatches: 86, batInnings: 69, batRuns: 1429, batHS: 71, batAvg: 28.0, batSR: 147.3,
      bat50s: 7, bat100s: 0, batFours: 93, batSixes: 82, batNO: 18,
      bowWickets: 76, bowBalls: 1614, bowRuns: 2145, bowAvg: 28.2, bowEcon: 7.97, bowBest: '3/14',
      bowFiveW: 0, catches: 34, stumpings: 0, runOuts: 0,
    },
    {
      id: 'player-kl-rahul',
      name: 'KL Rahul', nationality: 'Indian',
      role: 'WICKET_KEEPER', battingStyle: 'RIGHT_HAND', bowlingStyle: null, jersey: 1,
      batMatches: 72, batInnings: 68, batRuns: 2265, batHS: 110, batAvg: 38.0, batSR: 136.8,
      bat50s: 21, bat100s: 2, batFours: 196, batSixes: 80, batNO: 8,
      bowWickets: 0, bowBalls: 0, bowRuns: 0, bowAvg: 0, bowEcon: 0, bowBest: null,
      bowFiveW: 0, catches: 58, stumpings: 26, runOuts: 0,
    },
    {
      id: 'player-ravindra-jadeja',
      name: 'Ravindra Jadeja', nationality: 'Indian',
      role: 'ALL_ROUNDER', battingStyle: 'LEFT_HAND', bowlingStyle: 'LEFT_ARM_ORTHODOX', jersey: 8,
      batMatches: 74, batInnings: 49, batRuns: 515, batHS: 46, batAvg: 18.0, batSR: 129.3,
      bat50s: 0, bat100s: 0, batFours: 40, batSixes: 20, batNO: 20,
      bowWickets: 56, bowBalls: 1416, bowRuns: 1628, bowAvg: 29.1, bowEcon: 6.9, bowBest: '5/16',
      bowFiveW: 1, catches: 38, stumpings: 0, runOuts: 0,
    },
    {
      id: 'player-axar-patel',
      name: 'Axar Patel', nationality: 'Indian',
      role: 'ALL_ROUNDER', battingStyle: 'LEFT_HAND', bowlingStyle: 'LEFT_ARM_ORTHODOX', jersey: 20,
      batMatches: 65, batInnings: 38, batRuns: 418, batHS: 42, batAvg: 16.0, batSR: 140.2,
      bat50s: 0, bat100s: 0, batFours: 32, batSixes: 22, batNO: 12,
      bowWickets: 88, bowBalls: 1356, bowRuns: 1542, bowAvg: 17.5, bowEcon: 6.82, bowBest: '4/21',
      bowFiveW: 0, catches: 20, stumpings: 0, runOuts: 0,
    },
    {
      id: 'player-jasprit-bumrah',
      name: 'Jasprit Bumrah', nationality: 'Indian',
      role: 'BOWLER', battingStyle: 'RIGHT_HAND', bowlingStyle: 'RIGHT_ARM_FAST', jersey: 93,
      batMatches: 64, batInnings: 20, batRuns: 60, batHS: 10, batAvg: 5.0, batSR: 90.0,
      bat50s: 0, bat100s: 0, batFours: 5, batSixes: 2, batNO: 8,
      bowWickets: 89, bowBalls: 1342, bowRuns: 1484, bowAvg: 16.7, bowEcon: 6.63, bowBest: '5/10',
      bowFiveW: 2, catches: 15, stumpings: 0, runOuts: 0,
    },
    {
      id: 'player-mohammed-shami',
      name: 'Mohammed Shami', nationality: 'Indian',
      role: 'BOWLER', battingStyle: 'RIGHT_HAND', bowlingStyle: 'RIGHT_ARM_FAST', jersey: 11,
      batMatches: 55, batInnings: 19, batRuns: 48, batHS: 14, batAvg: 4.0, batSR: 80.0,
      bat50s: 0, bat100s: 0, batFours: 4, batSixes: 1, batNO: 7,
      bowWickets: 67, bowBalls: 1188, bowRuns: 1486, bowAvg: 22.2, bowEcon: 7.5, bowBest: '4/16',
      bowFiveW: 0, catches: 10, stumpings: 0, runOuts: 0,
    },
    {
      id: 'player-kuldeep-yadav',
      name: 'Kuldeep Yadav', nationality: 'Indian',
      role: 'BOWLER', battingStyle: 'LEFT_HAND', bowlingStyle: 'LEFT_ARM_WRIST_SPIN', jersey: 23,
      batMatches: 72, batInnings: 29, batRuns: 88, batHS: 22, batAvg: 6.0, batSR: 85.4,
      bat50s: 0, bat100s: 0, batFours: 6, batSixes: 3, batNO: 14,
      bowWickets: 97, bowBalls: 1524, bowRuns: 1862, bowAvg: 19.2, bowEcon: 7.33, bowBest: '5/24',
      bowFiveW: 2, catches: 12, stumpings: 0, runOuts: 0,
    },

    // ── Delhi Warriors (indices 11–21) ──────────────────────────────────────
    {
      id: 'player-prithvi-shaw',
      name: 'Prithvi Shaw', nationality: 'Indian',
      role: 'BATSMAN', battingStyle: 'RIGHT_HAND', bowlingStyle: null, jersey: 100,
      batMatches: 5, batInnings: 5, batRuns: 168, batHS: 72, batAvg: 33.6, batSR: 148.7,
      bat50s: 2, bat100s: 0, batFours: 22, batSixes: 6, batNO: 0,
      bowWickets: 0, bowBalls: 0, bowRuns: 0, bowAvg: 0, bowEcon: 0, bowBest: null,
      bowFiveW: 0, catches: 2, stumpings: 0, runOuts: 0,
    },
    {
      id: 'player-sanju-samson',
      name: 'Sanju Samson', nationality: 'Indian',
      role: 'WICKET_KEEPER', battingStyle: 'RIGHT_HAND', bowlingStyle: null, jersey: 9,
      batMatches: 33, batInnings: 29, batRuns: 850, batHS: 111, batAvg: 32.7, batSR: 158.5,
      bat50s: 6, bat100s: 2, batFours: 78, batSixes: 50, batNO: 3,
      bowWickets: 0, bowBalls: 0, bowRuns: 0, bowAvg: 0, bowEcon: 0, bowBest: null,
      bowFiveW: 0, catches: 26, stumpings: 10, runOuts: 0,
    },
    {
      id: 'player-shreyas-iyer',
      name: 'Shreyas Iyer', nationality: 'Indian',
      role: 'BATSMAN', battingStyle: 'RIGHT_HAND', bowlingStyle: null, jersey: 41,
      batMatches: 58, batInnings: 54, batRuns: 1677, batHS: 96, batAvg: 35.7, batSR: 134.4,
      bat50s: 13, bat100s: 0, batFours: 148, batSixes: 62, batNO: 7,
      bowWickets: 0, bowBalls: 0, bowRuns: 0, bowAvg: 0, bowEcon: 0, bowBest: null,
      bowFiveW: 0, catches: 28, stumpings: 0, runOuts: 0,
    },
    {
      id: 'player-rishabh-pant',
      name: 'Rishabh Pant', nationality: 'Indian',
      role: 'WICKET_KEEPER', battingStyle: 'LEFT_HAND', bowlingStyle: null, jersey: 17,
      batMatches: 66, batInnings: 61, batRuns: 1499, batHS: 128, batAvg: 35.7, batSR: 148.2,
      bat50s: 11, bat100s: 1, batFours: 137, batSixes: 70, batNO: 19,
      bowWickets: 0, bowBalls: 0, bowRuns: 0, bowAvg: 0, bowEcon: 0, bowBest: null,
      bowFiveW: 0, catches: 52, stumpings: 22, runOuts: 0,
    },
    {
      id: 'player-washington-sundar',
      name: 'Washington Sundar', nationality: 'Indian',
      role: 'ALL_ROUNDER', battingStyle: 'RIGHT_HAND', bowlingStyle: 'RIGHT_ARM_OFFBREAK', jersey: 50,
      batMatches: 30, batInnings: 22, batRuns: 330, batHS: 57, batAvg: 19.4, batSR: 131.5,
      bat50s: 1, bat100s: 0, batFours: 26, batSixes: 14, batNO: 5,
      bowWickets: 34, bowBalls: 618, bowRuns: 762, bowAvg: 22.4, bowEcon: 7.4, bowBest: '3/20',
      bowFiveW: 0, catches: 12, stumpings: 0, runOuts: 0,
    },
    {
      id: 'player-rinku-singh',
      name: 'Rinku Singh', nationality: 'Indian',
      role: 'ALL_ROUNDER', battingStyle: 'LEFT_HAND', bowlingStyle: 'RIGHT_ARM_MEDIUM', jersey: 75,
      batMatches: 15, batInnings: 13, batRuns: 243, batHS: 69, batAvg: 48.6, batSR: 176.8,
      bat50s: 2, bat100s: 0, batFours: 18, batSixes: 20, batNO: 8,
      bowWickets: 0, bowBalls: 12, bowRuns: 20, bowAvg: 0, bowEcon: 10.0, bowBest: null,
      bowFiveW: 0, catches: 4, stumpings: 0, runOuts: 0,
    },
    {
      id: 'player-yuzvendra-chahal',
      name: 'Yuzvendra Chahal', nationality: 'Indian',
      role: 'BOWLER', battingStyle: 'RIGHT_HAND', bowlingStyle: 'RIGHT_ARM_LEGBREAK', jersey: 3,
      batMatches: 72, batInnings: 24, batRuns: 50, batHS: 18, batAvg: 4.5, batSR: 77.0,
      bat50s: 0, bat100s: 0, batFours: 4, batSixes: 1, batNO: 13,
      bowWickets: 96, bowBalls: 1602, bowRuns: 1970, bowAvg: 20.5, bowEcon: 7.38, bowBest: '6/25',
      bowFiveW: 2, catches: 14, stumpings: 0, runOuts: 0,
    },
    {
      id: 'player-deepak-chahar',
      name: 'Deepak Chahar', nationality: 'Indian',
      role: 'BOWLER', battingStyle: 'RIGHT_HAND', bowlingStyle: 'RIGHT_ARM_MEDIUM', jersey: 90,
      batMatches: 41, batInnings: 24, batRuns: 230, batHS: 69, batAvg: 15.3, batSR: 117.3,
      bat50s: 1, bat100s: 0, batFours: 22, batSixes: 12, batNO: 9,
      bowWickets: 37, bowBalls: 810, bowRuns: 878, bowAvg: 23.7, bowEcon: 6.5, bowBest: '6/7',
      bowFiveW: 1, catches: 8, stumpings: 0, runOuts: 0,
    },
    {
      id: 'player-arshdeep-singh',
      name: 'Arshdeep Singh', nationality: 'Indian',
      role: 'BOWLER', battingStyle: 'LEFT_HAND', bowlingStyle: 'LEFT_ARM_FAST', jersey: 2,
      batMatches: 60, batInnings: 20, batRuns: 48, batHS: 16, batAvg: 4.8, batSR: 82.8,
      bat50s: 0, bat100s: 0, batFours: 4, batSixes: 1, batNO: 10,
      bowWickets: 76, bowBalls: 1296, bowRuns: 1584, bowAvg: 20.8, bowEcon: 7.33, bowBest: '4/9',
      bowFiveW: 0, catches: 12, stumpings: 0, runOuts: 0,
    },
    {
      id: 'player-avesh-khan',
      name: 'Avesh Khan', nationality: 'Indian',
      role: 'BOWLER', battingStyle: 'RIGHT_HAND', bowlingStyle: 'RIGHT_ARM_FAST', jersey: 31,
      batMatches: 22, batInnings: 6, batRuns: 12, batHS: 6, batAvg: 3.0, batSR: 60.0,
      bat50s: 0, bat100s: 0, batFours: 1, batSixes: 0, batNO: 2,
      bowWickets: 24, bowBalls: 456, bowRuns: 612, bowAvg: 25.5, bowEcon: 8.05, bowBest: '3/16',
      bowFiveW: 0, catches: 5, stumpings: 0, runOuts: 0,
    },
    {
      id: 'player-ishan-kishan',
      name: 'Ishan Kishan', nationality: 'Indian',
      role: 'WICKET_KEEPER', battingStyle: 'LEFT_HAND', bowlingStyle: null, jersey: 32,
      batMatches: 32, batInnings: 30, batRuns: 842, batHS: 93, batAvg: 31.2, batSR: 140.5,
      bat50s: 7, bat100s: 0, batFours: 88, batSixes: 38, batNO: 3,
      bowWickets: 0, bowBalls: 0, bowRuns: 0, bowAvg: 0, bowEcon: 0, bowBest: null,
      bowFiveW: 0, catches: 28, stumpings: 14, runOuts: 0,
    },
  ];

  const players: Array<{ id: string }> = [];
  for (const pd of playerData) {
    const player = await prisma.player.upsert({
      where: { id: pd.id },
      update: {},
      create: {
        id: pd.id,
        name: pd.name,
        nationality: pd.nationality,
        role: pd.role,
        battingStyle: pd.battingStyle,
        bowlingStyle: pd.bowlingStyle,
        jerseyNumber: pd.jersey,
      },
    });

    // Career stats
    await prisma.playerCareerStats.upsert({
      where: { playerId: player.id },
      update: {},
      create: {
        playerId: player.id,
        matches: pd.batMatches,
        innings: pd.batInnings,
        runs: pd.batRuns,
        highScore: pd.batHS,
        average: pd.batAvg,
        strikeRate: pd.batSR,
        fifties: pd.bat50s,
        hundreds: pd.bat100s,
        fours: pd.batFours,
        sixes: pd.batSixes,
        notOuts: pd.batNO,
        wickets: pd.bowWickets,
        ballsBowled: pd.bowBalls,
        runsConceded: pd.bowRuns,
        bowlingAverage: pd.bowAvg,
        economy: pd.bowEcon,
        bestBowling: pd.bowBest,
        fiveWickets: pd.bowFiveW,
        catches: pd.catches,
        stumpings: pd.stumpings,
        runOuts: pd.runOuts,
      },
    });

    players.push(player);
  }

  const mumbaiPlayers = players.slice(0, 11);   // Kohli … Kuldeep
  const delhiPlayers  = players.slice(11, 22);  // Shaw … Ishan

  console.log(`✅ ${players.length} players + career stats created`);

  // ── Venue ──────────────────────────────────────────────────────────────────
  const venue = await prisma.venue.upsert({
    where: { id: 'seed-venue-wankhede' },
    update: {},
    create: {
      id: 'seed-venue-wankhede',
      name: 'Wankhede Stadium',
      city: 'Mumbai',
      country: 'India',
      capacity: 33108,
      latitude: 18.9388,
      longitude: 72.8258,
    },
  });

  console.log('✅ Venue created');

  // ── Teams ──────────────────────────────────────────────────────────────────
  // ownerId is used by subscriptionService.canCreateTeam
  const teamMumbai = await prisma.team.upsert({
    where: { id: 'seed-team-mumbai' },
    update: {},
    create: {
      id: 'seed-team-mumbai',
      name: 'Mumbai Thunder',
      shortName: 'MUT',
      primaryColor: '#004BA0',
      ownerId: user1.id,
    },
  });

  const teamDelhi = await prisma.team.upsert({
    where: { id: 'seed-team-delhi' },
    update: {},
    create: {
      id: 'seed-team-delhi',
      name: 'Delhi Warriors',
      shortName: 'DEW',
      primaryColor: '#CB0000',
      ownerId: user2.id,
    },
  });

  const teamChennai = await prisma.team.upsert({
    where: { id: 'seed-team-chennai' },
    update: {},
    create: {
      id: 'seed-team-chennai',
      name: 'Chennai Royals',
      shortName: 'CHR',
      primaryColor: '#F5CF00',
      ownerId: admin.id,
    },
  });

  // Register players in their teams
  for (const p of mumbaiPlayers) {
    await prisma.teamPlayer.upsert({
      where: { teamId_playerId: { teamId: teamMumbai.id, playerId: p.id } },
      update: {},
      create: { teamId: teamMumbai.id, playerId: p.id },
    });
  }
  for (const p of delhiPlayers) {
    await prisma.teamPlayer.upsert({
      where: { teamId_playerId: { teamId: teamDelhi.id, playerId: p.id } },
      update: {},
      create: { teamId: teamDelhi.id, playerId: p.id },
    });
  }

  console.log('✅ Teams created and players registered');

  // ── Tournament ─────────────────────────────────────────────────────────────
  const tournament = await prisma.tournament.upsert({
    where: { id: 'seed-tournament-t20-2024' },
    update: {},
    create: {
      id: 'seed-tournament-t20-2024',
      name: 'MyCricket T20 League 2024',
      description: 'Premier T20 tournament featuring top local teams across India.',
      format: 'LEAGUE',
      status: 'ACTIVE',
      matchType: 'T20',
      oversPerInnings: 20,
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-03-31'),
      isPublic: true,
      createdBy: admin.id,
    },
  });

  await prisma.tournamentTeam.upsert({
    where: { tournamentId_teamId: { tournamentId: tournament.id, teamId: teamMumbai.id } },
    update: {},
    create: {
      tournamentId: tournament.id, teamId: teamMumbai.id,
      points: 6, won: 3, lost: 1, matchesPlayed: 4, nrr: 0.842,
    },
  });
  await prisma.tournamentTeam.upsert({
    where: { tournamentId_teamId: { tournamentId: tournament.id, teamId: teamDelhi.id } },
    update: {},
    create: {
      tournamentId: tournament.id, teamId: teamDelhi.id,
      points: 4, won: 2, lost: 2, matchesPlayed: 4, nrr: -0.12,
    },
  });
  await prisma.tournamentTeam.upsert({
    where: { tournamentId_teamId: { tournamentId: tournament.id, teamId: teamChennai.id } },
    update: {},
    create: {
      tournamentId: tournament.id, teamId: teamChennai.id,
      points: 2, won: 1, lost: 3, matchesPlayed: 4, nrr: -0.72,
    },
  });

  console.log('✅ Tournament created');

  // ── Match ──────────────────────────────────────────────────────────────────
  // createdById (renamed from createdBy) — matches matchService.ts
  const match1 = await prisma.match.upsert({
    where: { id: 'seed-match-1' },
    update: {},
    create: {
      id: 'seed-match-1',
      title: 'Mumbai Thunder vs Delhi Warriors — T20 League',
      matchType: 'T20',
      oversPerInnings: 20,
      status: 'COMPLETED',
      team1Id: teamMumbai.id,
      team2Id: teamDelhi.id,
      venueId: venue.id,
      venueName: 'Wankhede Stadium, Mumbai',
      tournamentId: tournament.id,
      createdById: user1.id,
      createdByTag: 'MyCricketScoreEngine_v1',
      startedAt: new Date('2024-01-15T14:00:00Z'),
      completedAt: new Date('2024-01-15T18:30:00Z'),
      isPublic: true,
      resultDescription: 'Mumbai Thunder won by 23 runs. MUT posted 187/6 in 20 overs. DEW fell short at 164/8.',
      winnerTeamId: teamMumbai.id,
      resultType: 'RUNS',
      margin: 23,
      marginType: 'runs',
      latitude: 18.9388,
      longitude: 72.8258,
    },
  });

  // ── Toss ───────────────────────────────────────────────────────────────────
  const toss = await prisma.toss.upsert({
    where: { matchId: match1.id },
    update: {},
    create: {
      matchId: match1.id,
      winnerTeamId: teamMumbai.id,
      decision: 'BAT',
      battingFirstTeamId: teamMumbai.id,
    },
  });

  await prisma.match.update({
    where: { id: match1.id },
    data: { tossId: toss.id },
  });

  // ── Innings 1 — Mumbai Thunder batting ─────────────────────────────────────
  const innings1 = await prisma.innings.upsert({
    where: { matchId_inningsNumber: { matchId: match1.id, inningsNumber: 1 } },
    update: {},
    create: {
      matchId: match1.id,
      inningsNumber: 1,
      battingTeamId: teamMumbai.id,
      bowlingTeamId: teamDelhi.id,
      state: 'OVERS_COMPLETE',
      totalRuns: 187,
      wickets: 6,
      currentOver: 20,
      legalBallsInOver: 0,
      extrasWides: 8,
      extrasNoBalls: 3,
      extrasByes: 2,
      extrasLegByes: 4,
      completedAt: new Date('2024-01-15T16:15:00Z'),
    },
  });

  // ── Innings 2 — Delhi Warriors batting ─────────────────────────────────────
  const innings2 = await prisma.innings.upsert({
    where: { matchId_inningsNumber: { matchId: match1.id, inningsNumber: 2 } },
    update: {},
    create: {
      matchId: match1.id,
      inningsNumber: 2,
      battingTeamId: teamDelhi.id,
      bowlingTeamId: teamMumbai.id,
      state: 'OVERS_COMPLETE',
      totalRuns: 164,
      wickets: 8,
      currentOver: 20,
      legalBallsInOver: 0,
      extrasWides: 10,
      extrasNoBalls: 4,
      target: 188,
      completedAt: new Date('2024-01-15T18:30:00Z'),
    },
  });

  // ── InningsPlayers — Innings 1 batsmen (Mumbai Thunder) ────────────────────
  // mumbaiPlayers: [0]Kohli [1]Rohit [2]Gill [3]SKY [4]Hardik [5]KLR [6]Jadeja [7]Axar [8]Bumrah [9]Shami [10]Kuldeep
  const batting1 = [
    { p: mumbaiPlayers[1], order: 1,  runs: 58, balls: 42, fours: 6, sixes: 3, isOut: true,  info: 'c Ishan Kishan b Deepak Chahar' },
    { p: mumbaiPlayers[0], order: 2,  runs: 72, balls: 48, fours: 8, sixes: 3, isOut: true,  info: 'b Yuzvendra Chahal' },
    { p: mumbaiPlayers[2], order: 3,  runs: 18, balls: 14, fours: 2, sixes: 0, isOut: true,  info: 'c Shreyas Iyer b Washington Sundar' },
    { p: mumbaiPlayers[3], order: 4,  runs: 21, balls: 13, fours: 1, sixes: 2, isOut: true,  info: 'lbw b Arshdeep Singh' },
    { p: mumbaiPlayers[4], order: 5,  runs: 14, balls: 8,  fours: 1, sixes: 1, isOut: false, info: null },
    { p: mumbaiPlayers[5], order: 6,  runs: 4,  balls: 4,  fours: 0, sixes: 0, isOut: true,  info: 'c Sanju Samson b Avesh Khan' },
    { p: mumbaiPlayers[6], order: 7,  runs: 0,  balls: 1,  fours: 0, sixes: 0, isOut: false, info: null },
  ];

  for (const b of batting1) {
    await prisma.inningsPlayer.upsert({
      where: { inningsId_playerId: { inningsId: innings1.id, playerId: b.p.id } },
      update: {},
      create: {
        inningsId: innings1.id,
        playerId: b.p.id,
        role: 'BATSMAN',
        battingOrder: b.order,
        runs: b.runs,
        balls: b.balls,
        fours: b.fours,
        sixes: b.sixes,
        isOut: b.isOut,
        dismissalInfo: b.info,
      },
    });
  }

  // ── InningsPlayers — Innings 1 bowlers (Delhi Warriors) ────────────────────
  // delhiPlayers: [0]Shaw [1]Samson [2]Iyer [3]Pant [4]Washington [5]Rinku
  //               [6]Chahal [7]D.Chahar [8]Arshdeep [9]Avesh [10]Ishan
  const bowling1 = [
    { p: delhiPlayers[6],  runsGiven: 32, legalBalls: 24, wides: 2, noBalls: 1, wicketsTaken: 2 }, // Chahal
    { p: delhiPlayers[7],  runsGiven: 38, legalBalls: 24, wides: 3, noBalls: 0, wicketsTaken: 2 }, // D.Chahar
    { p: delhiPlayers[8],  runsGiven: 41, legalBalls: 24, wides: 1, noBalls: 1, wicketsTaken: 1 }, // Arshdeep
    { p: delhiPlayers[9],  runsGiven: 35, legalBalls: 24, wides: 2, noBalls: 1, wicketsTaken: 1 }, // Avesh
    { p: delhiPlayers[4],  runsGiven: 28, legalBalls: 24, wides: 0, noBalls: 0, wicketsTaken: 0 }, // Washington
  ];

  for (const b of bowling1) {
    await prisma.inningsPlayer.upsert({
      where: { inningsId_playerId: { inningsId: innings1.id, playerId: b.p.id } },
      update: {},
      create: {
        inningsId: innings1.id,
        playerId: b.p.id,
        role: 'BOWLER',
        runsGiven: b.runsGiven,
        legalBalls: b.legalBalls,
        wides: b.wides,
        noBalls: b.noBalls,
        wicketsTaken: b.wicketsTaken,
      },
    });
  }

  // ── InningsPlayers — Innings 2 batsmen (Delhi Warriors) ────────────────────
  const batting2 = [
    { p: delhiPlayers[0],  order: 1,  runs: 28, balls: 20, fours: 4, sixes: 1, isOut: true,  info: 'b Jasprit Bumrah' },
    { p: delhiPlayers[10], order: 2,  runs: 42, balls: 30, fours: 5, sixes: 2, isOut: true,  info: 'c Rohit Sharma b Mohammed Shami' },
    { p: delhiPlayers[2],  order: 3,  runs: 35, balls: 28, fours: 4, sixes: 1, isOut: true,  info: 'run out (Hardik Pandya)' },
    { p: delhiPlayers[3],  order: 4,  runs: 22, balls: 16, fours: 2, sixes: 1, isOut: true,  info: 'c KL Rahul b Kuldeep Yadav' },
    { p: delhiPlayers[5],  order: 5,  runs: 19, balls: 11, fours: 0, sixes: 2, isOut: false, info: null },
    { p: delhiPlayers[1],  order: 6,  runs: 18, balls: 15, fours: 2, sixes: 0, isOut: true,  info: 'c Virat Kohli b Axar Patel' },
  ];

  for (const b of batting2) {
    await prisma.inningsPlayer.upsert({
      where: { inningsId_playerId: { inningsId: innings2.id, playerId: b.p.id } },
      update: {},
      create: {
        inningsId: innings2.id,
        playerId: b.p.id,
        role: 'BATSMAN',
        battingOrder: b.order,
        runs: b.runs,
        balls: b.balls,
        fours: b.fours,
        sixes: b.sixes,
        isOut: b.isOut,
        dismissalInfo: b.info,
      },
    });
  }

  // ── InningsPlayers — Innings 2 bowlers (Mumbai Thunder) ────────────────────
  const bowling2 = [
    { p: mumbaiPlayers[8],  runsGiven: 24, legalBalls: 24, wides: 2, noBalls: 0, wicketsTaken: 3 }, // Bumrah
    { p: mumbaiPlayers[9],  runsGiven: 38, legalBalls: 24, wides: 4, noBalls: 2, wicketsTaken: 1 }, // Shami
    { p: mumbaiPlayers[10], runsGiven: 36, legalBalls: 24, wides: 2, noBalls: 1, wicketsTaken: 2 }, // Kuldeep
    { p: mumbaiPlayers[7],  runsGiven: 30, legalBalls: 24, wides: 2, noBalls: 1, wicketsTaken: 1 }, // Axar
    { p: mumbaiPlayers[6],  runsGiven: 28, legalBalls: 24, wides: 0, noBalls: 0, wicketsTaken: 1 }, // Jadeja
  ];

  for (const b of bowling2) {
    await prisma.inningsPlayer.upsert({
      where: { inningsId_playerId: { inningsId: innings2.id, playerId: b.p.id } },
      update: {},
      create: {
        inningsId: innings2.id,
        playerId: b.p.id,
        role: 'BOWLER',
        runsGiven: b.runsGiven,
        legalBalls: b.legalBalls,
        wides: b.wides,
        noBalls: b.noBalls,
        wicketsTaken: b.wicketsTaken,
      },
    });
  }

  // ── Ball-by-ball — Over 1 of Innings 1 (Arshdeep bowls to Rohit & Kohli) ───
  const over1Balls = [
    { ballInOver: 1, batsmanId: mumbaiPlayers[1].id, bowlerId: delhiPlayers[8].id, runs: 0, isLegalBall: true,  isWide: false, extraRuns: 0 },
    { ballInOver: 2, batsmanId: mumbaiPlayers[1].id, bowlerId: delhiPlayers[8].id, runs: 4, isLegalBall: true,  isWide: false, extraRuns: 0 },
    { ballInOver: 3, batsmanId: mumbaiPlayers[0].id, bowlerId: delhiPlayers[8].id, runs: 1, isLegalBall: true,  isWide: false, extraRuns: 0 },
    { ballInOver: 3, batsmanId: mumbaiPlayers[1].id, bowlerId: delhiPlayers[8].id, runs: 0, isLegalBall: false, isWide: true,  extraRuns: 1 },
    { ballInOver: 4, batsmanId: mumbaiPlayers[1].id, bowlerId: delhiPlayers[8].id, runs: 6, isLegalBall: true,  isWide: false, extraRuns: 0 },
    { ballInOver: 5, batsmanId: mumbaiPlayers[0].id, bowlerId: delhiPlayers[8].id, runs: 2, isLegalBall: true,  isWide: false, extraRuns: 0 },
    { ballInOver: 6, batsmanId: mumbaiPlayers[1].id, bowlerId: delhiPlayers[8].id, runs: 1, isLegalBall: true,  isWide: false, extraRuns: 0 },
  ];

  for (let i = 0; i < over1Balls.length; i++) {
    const b = over1Balls[i];
    await prisma.ball.create({
      data: {
        inningsId: innings1.id,
        overNumber: 1,
        ballNumber: i + 1,
        ballInOver: b.ballInOver,
        batsmanId: b.batsmanId,
        bowlerId: b.bowlerId,
        runs: b.runs,
        totalRuns: b.runs + b.extraRuns,
        isWide: b.isWide,
        isNoBall: false,
        isBye: false,
        isLegBye: false,
        isWicket: false,
        extraRuns: b.extraRuns,
        isLegalBall: b.isLegalBall,
        commentary:
          b.runs === 6 ? 'SIX! Rohit clears the mid-wicket boundary!' :
          b.runs === 4 ? 'FOUR! Punched through cover!' :
          b.isWide    ? 'Wide down leg side.' : null,
      },
    });
  }

  console.log('✅ Match, toss, innings, players and ball-by-ball data created');

  // ── Subscription — PRO plan for user1 ─────────────────────────────────────
  // No @unique on userId anymore — subscription records can stack
  await prisma.subscription.upsert({
    where: { id: 'seed-sub-harsha' },
    update: {},
    create: {
      id: 'seed-sub-harsha',
      userId: user1.id,
      plan: 'PRO',
      status: 'ACTIVE',
      provider: 'razorpay',
      transactionId: 'pay_seed_001',
      endDate: new Date('2025-12-31'),
      metadata: { activatedAt: '2024-01-01T00:00:00.000Z', note: 'seed subscription' },
    },
  });

  console.log('✅ Subscription created for harsha_scorer (PRO)');
  console.log('\n🎉 Seed complete!\n');
  console.log('Test accounts (all password: Password123!):');
  console.log('  admin@myscoreapp.com   — ADMIN');
  console.log('  scorer@myscoreapp.com  — SCORER, PRO plan');
  console.log('  priya@myscoreapp.com   — USER');
  console.log('  arjun@myscoreapp.com   — USER');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
