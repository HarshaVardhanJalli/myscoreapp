import { matchAPI, playerAPI, teamAPI } from './api';
import { getItem, setItem } from './storage';
import { Player, Team } from '../types';

const TEST_FIXTURE_STORAGE_KEY = 'ind_pak_test_fixture_v1';
const TEST_MATCH_OVERS = 5;

type FixtureTeamKey = 'india' | 'pakistan';

interface FixturePlayerDefinition {
  key: string;
  name: string;
  shortName: string;
  nationality: string;
  role: Player['role'];
  jerseyNumber: number;
}

interface FixtureTeamDefinition {
  key: FixtureTeamKey;
  name: string;
  shortName: string;
  primaryColor: string;
  captainKey: string;
  viceCaptainKey: string;
  openerKeys: [string, string];
  openingBowlerKey: string;
  players: FixturePlayerDefinition[];
}

interface FixtureCache {
  version: 1;
  teams: Record<FixtureTeamKey, {
    teamId: string;
    playerIds: Record<string, string>;
  }>;
}

interface ResolvedFixtureTeam {
  team: Team;
  orderedPlayerIds: string[];
  openerIds: [string, string];
  openingBowlerId: string;
  playerIdsByKey: Record<string, string>;
}

const TEST_FIXTURE: Record<FixtureTeamKey, FixtureTeamDefinition> = {
  india: {
    key: 'india',
    name: 'India Test XI',
    shortName: 'IND',
    primaryColor: '#8EA9FF',
    captainKey: 'rohit-sharma',
    viceCaptainKey: 'hardik-pandya',
    openerKeys: ['rohit-sharma', 'virat-kohli'],
    openingBowlerKey: 'jasprit-bumrah',
    players: [
      {
        key: 'rohit-sharma',
        name: 'Rohit Sharma',
        shortName: 'R. Sharma',
        nationality: 'India',
        role: 'BATSMAN',
        jerseyNumber: 45,
      },
      {
        key: 'virat-kohli',
        name: 'Virat Kohli',
        shortName: 'V. Kohli',
        nationality: 'India',
        role: 'BATSMAN',
        jerseyNumber: 18,
      },
      {
        key: 'suryakumar-yadav',
        name: 'Suryakumar Yadav',
        shortName: 'S. Yadav',
        nationality: 'India',
        role: 'BATSMAN',
        jerseyNumber: 63,
      },
      {
        key: 'hardik-pandya',
        name: 'Hardik Pandya',
        shortName: 'H. Pandya',
        nationality: 'India',
        role: 'ALL_ROUNDER',
        jerseyNumber: 33,
      },
      {
        key: 'jasprit-bumrah',
        name: 'Jasprit Bumrah',
        shortName: 'J. Bumrah',
        nationality: 'India',
        role: 'BOWLER',
        jerseyNumber: 93,
      },
    ],
  },
  pakistan: {
    key: 'pakistan',
    name: 'Pakistan Test XI',
    shortName: 'PAK',
    primaryColor: '#76D6B2',
    captainKey: 'babar-azam',
    viceCaptainKey: 'mohammad-rizwan',
    openerKeys: ['babar-azam', 'fakhar-zaman'],
    openingBowlerKey: 'shaheen-shah-afridi',
    players: [
      {
        key: 'babar-azam',
        name: 'Babar Azam',
        shortName: 'B. Azam',
        nationality: 'Pakistan',
        role: 'BATSMAN',
        jerseyNumber: 56,
      },
      {
        key: 'mohammad-rizwan',
        name: 'Mohammad Rizwan',
        shortName: 'M. Rizwan',
        nationality: 'Pakistan',
        role: 'WICKET_KEEPER',
        jerseyNumber: 16,
      },
      {
        key: 'fakhar-zaman',
        name: 'Fakhar Zaman',
        shortName: 'F. Zaman',
        nationality: 'Pakistan',
        role: 'BATSMAN',
        jerseyNumber: 39,
      },
      {
        key: 'shaheen-shah-afridi',
        name: 'Shaheen Shah Afridi',
        shortName: 'S. Afridi',
        nationality: 'Pakistan',
        role: 'BOWLER',
        jerseyNumber: 10,
      },
      {
        key: 'haris-rauf',
        name: 'Haris Rauf',
        shortName: 'H. Rauf',
        nationality: 'Pakistan',
        role: 'BOWLER',
        jerseyNumber: 97,
      },
    ],
  },
};

function parseFixtureCache(raw: string | null): FixtureCache | null {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as FixtureCache;
    if (parsed?.version !== 1 || !parsed.teams?.india || !parsed.teams?.pakistan) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

async function readFixtureCache(): Promise<FixtureCache | null> {
  const raw = await getItem(TEST_FIXTURE_STORAGE_KEY);
  return parseFixtureCache(raw);
}

async function writeFixtureCache(cache: FixtureCache): Promise<void> {
  await setItem(TEST_FIXTURE_STORAGE_KEY, JSON.stringify(cache));
}

async function findExistingTeam(teamId: string | undefined, expectedName: string): Promise<Team | null> {
  if (!teamId) return null;

  try {
    const response = await teamAPI.get(teamId);
    const team = response.data as Team;
    return team?.name === expectedName ? team : null;
  } catch {
    return null;
  }
}

async function searchTeamByName(expectedName: string): Promise<Team | null> {
  try {
    const response = await teamAPI.list({ search: expectedName, limit: 20 });
    const teams = (response.data?.teams ?? []) as Team[];
    return teams.find((team) => team.name === expectedName) ?? null;
  } catch {
    return null;
  }
}

async function findExistingPlayer(playerId: string | undefined, expectedName: string): Promise<Player | null> {
  if (!playerId) return null;

  try {
    const response = await playerAPI.get(playerId);
    const player = response.data as Player;
    return player?.name === expectedName ? player : null;
  } catch {
    return null;
  }
}

async function searchPlayer(definition: FixturePlayerDefinition): Promise<Player | null> {
  try {
    const response = await playerAPI.list({ search: definition.name, limit: 20 });
    const players = (response.data?.players ?? []) as Player[];
    return players.find((player) => (
      player.name === definition.name
      && player.role === definition.role
      && player.nationality === definition.nationality
    )) ?? null;
  } catch {
    return null;
  }
}

async function ensurePlayer(
  definition: FixturePlayerDefinition,
  cachedId: string | undefined,
): Promise<Player> {
  const existing = await findExistingPlayer(cachedId, definition.name);
  if (existing) {
    return existing;
  }

  const matchedPlayer = await searchPlayer(definition);
  if (matchedPlayer) {
    return matchedPlayer;
  }

  const response = await playerAPI.create({
    name: definition.name,
    shortName: definition.shortName,
    nationality: definition.nationality,
    role: definition.role,
    jerseyNumber: definition.jerseyNumber,
  });

  return response.data as Player;
}

async function ensureTeam(
  definition: FixtureTeamDefinition,
  cachedTeamId: string | undefined,
  cachedPlayerIds: Record<string, string> | undefined,
): Promise<ResolvedFixtureTeam> {
  let team = await findExistingTeam(cachedTeamId, definition.name);

  if (!team) {
    team = await searchTeamByName(definition.name);
  }

  if (!team) {
    const response = await teamAPI.create({
      name: definition.name,
      shortName: definition.shortName,
      primaryColor: definition.primaryColor,
    });
    team = response.data as Team;
  }

  const playerIdsByKey: Record<string, string> = {};

  for (const playerDefinition of definition.players) {
    const player = await ensurePlayer(playerDefinition, cachedPlayerIds?.[playerDefinition.key]);
    playerIdsByKey[playerDefinition.key] = player.id;

    await teamAPI.addPlayer(team.id, {
      playerId: player.id,
      isCaptain: playerDefinition.key === definition.captainKey,
      isViceCaptain: playerDefinition.key === definition.viceCaptainKey,
    });
  }

  return {
    team,
    orderedPlayerIds: definition.players.map((playerDefinition) => playerIdsByKey[playerDefinition.key]),
    openerIds: [
      playerIdsByKey[definition.openerKeys[0]],
      playerIdsByKey[definition.openerKeys[1]],
    ],
    openingBowlerId: playerIdsByKey[definition.openingBowlerKey],
    playerIdsByKey,
  };
}

async function ensureFixture(): Promise<Record<FixtureTeamKey, ResolvedFixtureTeam>> {
  const cache = await readFixtureCache();

  const india = await ensureTeam(
    TEST_FIXTURE.india,
    cache?.teams.india.teamId,
    cache?.teams.india.playerIds,
  );
  const pakistan = await ensureTeam(
    TEST_FIXTURE.pakistan,
    cache?.teams.pakistan.teamId,
    cache?.teams.pakistan.playerIds,
  );

  await writeFixtureCache({
    version: 1,
    teams: {
      india: {
        teamId: india.team.id,
        playerIds: india.playerIdsByKey,
      },
      pakistan: {
        teamId: pakistan.team.id,
        playerIds: pakistan.playerIdsByKey,
      },
    },
  });

  return { india, pakistan };
}

export async function launchIndiaPakistanTestMatch(): Promise<{ matchId: string; inningsId: string }> {
  const { india, pakistan } = await ensureFixture();

  const matchResponse = await matchAPI.create({
    title: 'India vs Pakistan · Test Fixture',
    description: 'Fresh 5-over testing fixture with preset lineups.',
    matchType: 'CUSTOM',
    oversPerInnings: TEST_MATCH_OVERS,
    team1Id: india.team.id,
    team2Id: pakistan.team.id,
    venueName: 'Testing Arena',
    isPublic: false,
  });

  const match = matchResponse.data as { id: string };

  await matchAPI.recordToss(match.id, {
    winnerTeamId: india.team.id,
    decision: 'BAT',
  });

  await matchAPI.setPlayingXI(match.id, {
    teamId: india.team.id,
    playerIds: india.orderedPlayerIds,
  });
  await matchAPI.setPlayingXI(match.id, {
    teamId: pakistan.team.id,
    playerIds: pakistan.orderedPlayerIds,
  });

  const inningsResponse = await matchAPI.startInnings(match.id, {
    battingTeamId: india.team.id,
    bowlingTeamId: pakistan.team.id,
    openingBatsmanIds: india.openerIds,
    openingBowlerId: pakistan.openingBowlerId,
  });

  const innings = inningsResponse.data as { id: string };

  return {
    matchId: match.id,
    inningsId: innings.id,
  };
}
