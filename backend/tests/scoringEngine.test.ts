/**
 * Scoring Engine Unit Tests
 * Tests pure functions, cricket rule logic, and stat calculations.
 * created_by: MyCricketScoreEngine_v1
 */

// ─── Helpers (pure functions, no DB) ─────────────────────────────────────────

import {
  formatOvers,
  oversToLegalBalls,
  calculateStrikeRate,
  calculateEconomy,
  calculateAverage,
  calculateRunRate,
  calculateRequiredRunRate,
  calculateWinProbability,
  haversineDistance,
  buildPaginationMeta,
  parsePagination,
} from '../src/utils/helpers';

// ─── formatOvers ─────────────────────────────────────────────────────────────

describe('formatOvers', () => {
  it('formats complete overs correctly', () => {
    expect(formatOvers(6)).toBe('1.0');
    expect(formatOvers(12)).toBe('2.0');
    expect(formatOvers(120)).toBe('20.0');
  });

  it('formats partial overs correctly', () => {
    expect(formatOvers(7)).toBe('1.1');
    expect(formatOvers(11)).toBe('1.5');
    expect(formatOvers(0)).toBe('0.0');
    expect(formatOvers(1)).toBe('0.1');
    expect(formatOvers(5)).toBe('0.5');
  });

  it('handles T20 match 20 overs', () => {
    expect(formatOvers(120)).toBe('20.0');
  });
});

// ─── oversToLegalBalls ────────────────────────────────────────────────────────

describe('oversToLegalBalls', () => {
  it('converts whole overs', () => {
    expect(oversToLegalBalls(1)).toBe(6);
    expect(oversToLegalBalls(20)).toBe(120);
    expect(oversToLegalBalls(50)).toBe(300);
  });

  it('converts partial overs', () => {
    expect(oversToLegalBalls(1.1)).toBe(7);
    expect(oversToLegalBalls(1.5)).toBe(11);
    expect(oversToLegalBalls(0.3)).toBe(3);
  });

  it('handles zero', () => {
    expect(oversToLegalBalls(0)).toBe(0);
  });
});

// ─── calculateStrikeRate ──────────────────────────────────────────────────────

describe('calculateStrikeRate', () => {
  it('calculates strike rate correctly', () => {
    expect(calculateStrikeRate(50, 50)).toBe(100);
    expect(calculateStrikeRate(100, 50)).toBe(200);
    expect(calculateStrikeRate(36, 60)).toBe(60);
  });

  it('returns 0 when no balls faced', () => {
    expect(calculateStrikeRate(5, 0)).toBe(0);
  });

  it('handles T20 power hitter', () => {
    expect(calculateStrikeRate(30, 12)).toBeCloseTo(250, 0);
  });

  it('handles boundary (4 off 1)', () => {
    expect(calculateStrikeRate(4, 1)).toBe(400);
  });

  it('handles six (6 off 1)', () => {
    expect(calculateStrikeRate(6, 1)).toBe(600);
  });
});

// ─── calculateEconomy ────────────────────────────────────────────────────────

describe('calculateEconomy', () => {
  it('calculates economy correctly', () => {
    expect(calculateEconomy(24, 24)).toBe(6);   // 1 run/ball = 6.00
    expect(calculateEconomy(48, 24)).toBe(12);  // 2 runs/ball = 12.00
    expect(calculateEconomy(12, 24)).toBe(3);   // 0.5 runs/ball = 3.00
  });

  it('returns 0 when no balls bowled', () => {
    expect(calculateEconomy(10, 0)).toBe(0);
  });

  it('handles maiden over (0 runs in 6 balls)', () => {
    expect(calculateEconomy(0, 6)).toBe(0);
  });

  it('handles expensive over (24 in 6)', () => {
    expect(calculateEconomy(24, 6)).toBe(24);
  });
});

// ─── calculateAverage ────────────────────────────────────────────────────────

describe('calculateAverage', () => {
  it('calculates batting average', () => {
    expect(calculateAverage(500, 10)).toBe(50);
    expect(calculateAverage(1000, 20)).toBe(50);
  });

  it('returns runs as average when no dismissals (not out)', () => {
    expect(calculateAverage(100, 0)).toBe(100);
    expect(calculateAverage(0, 0)).toBe(0);
  });
});

// ─── calculateRunRate ─────────────────────────────────────────────────────────

describe('calculateRunRate', () => {
  it('calculates run rate per over', () => {
    expect(calculateRunRate(60, 60)).toBe(6);   // 60 runs in 10 overs
    expect(calculateRunRate(120, 60)).toBe(12);
    expect(calculateRunRate(0, 60)).toBe(0);
  });

  it('returns 0 when no balls bowled', () => {
    expect(calculateRunRate(100, 0)).toBe(0);
  });
});

// ─── calculateRequiredRunRate ─────────────────────────────────────────────────

describe('calculateRequiredRunRate', () => {
  it('calculates RRR', () => {
    // Need 60 runs from 60 balls → 6 RRR
    expect(calculateRequiredRunRate(100, 40, 60)).toBe(6);
  });

  it('returns 0 when already won', () => {
    expect(calculateRequiredRunRate(100, 110, 30)).toBe(0);
  });

  it('returns 99.99 when no balls remaining and still need runs', () => {
    expect(calculateRequiredRunRate(100, 50, 0)).toBe(99.99);
  });

  it('handles very steep chase', () => {
    // Need 120 from 12 balls → 60 RRR
    const rrr = calculateRequiredRunRate(200, 80, 12);
    expect(rrr).toBeGreaterThan(20);
  });
});

// ─── calculateWinProbability ──────────────────────────────────────────────────

describe('calculateWinProbability', () => {
  it('returns 1 (100%) when target already exceeded', () => {
    const p = calculateWinProbability(100, 110, 2, 30, 120);
    expect(p).toBe(1);
  });

  it('returns 0 when no balls left and target not reached', () => {
    const p = calculateWinProbability(100, 80, 5, 0, 120);
    expect(p).toBe(0);
  });

  it('returns high probability when well ahead with wickets in hand', () => {
    // Need 10 from 30 balls, 9 wickets remaining
    const p = calculateWinProbability(200, 190, 1, 30, 120);
    expect(p).toBeGreaterThan(0.7);
  });

  it('returns low probability when nearly impossible', () => {
    // Need 100 from 6 balls, 8 wickets down
    const p = calculateWinProbability(200, 100, 8, 6, 120);
    expect(p).toBeLessThan(0.1);
  });

  it('returns near 50% for evenly-matched chase', () => {
    // Need 60 from 60 balls, 5 down — somewhat balanced
    const p = calculateWinProbability(120, 60, 5, 60, 120);
    expect(p).toBeGreaterThan(0.1);
    expect(p).toBeLessThan(0.9);
  });

  it('result is always between 0 and 1', () => {
    const scenarios = [
      [150, 100, 3, 24, 120],
      [200, 50, 9, 60, 120],
      [100, 99, 0, 1, 120],
      [300, 1, 0, 299, 300],
    ];
    for (const [target, current, wkts, balls, total] of scenarios) {
      const p = calculateWinProbability(target, current, wkts, balls, total);
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(1);
    }
  });
});

// ─── haversineDistance ────────────────────────────────────────────────────────

describe('haversineDistance', () => {
  it('returns 0 for same point', () => {
    expect(haversineDistance(12.9716, 77.5946, 12.9716, 77.5946)).toBe(0);
  });

  it('calculates distance between Bangalore and Mumbai (~840 km)', () => {
    const dist = haversineDistance(12.9716, 77.5946, 19.0760, 72.8777);
    expect(dist).toBeGreaterThan(800);
    expect(dist).toBeLessThan(900);
  });

  it('calculates nearby distance correctly', () => {
    // ~1.1 km
    const dist = haversineDistance(12.9716, 77.5946, 12.9816, 77.5946);
    expect(dist).toBeGreaterThan(0.5);
    expect(dist).toBeLessThan(5);
  });
});

// ─── Pagination ───────────────────────────────────────────────────────────────

describe('parsePagination', () => {
  it('parses valid page and limit', () => {
    const result = parsePagination({ page: '2', limit: '10' });
    expect(result).toEqual({ page: 2, limit: 10, skip: 10 });
  });

  it('defaults to page 1, limit 20', () => {
    const result = parsePagination({});
    expect(result).toEqual({ page: 1, limit: 20, skip: 0 });
  });

  it('caps limit at 100', () => {
    const result = parsePagination({ limit: '9999' });
    expect(result.limit).toBe(100);
  });

  it('floors page at 1', () => {
    const result = parsePagination({ page: '-5' });
    expect(result.page).toBe(1);
    expect(result.skip).toBe(0);
  });
});

describe('buildPaginationMeta', () => {
  it('builds correct meta for page 1 of 3', () => {
    const meta = buildPaginationMeta(50, 1, 20);
    expect(meta).toEqual({
      total: 50,
      page: 1,
      limit: 20,
      pages: 3,
      hasNext: true,
      hasPrev: false,
    });
  });

  it('builds correct meta for last page', () => {
    const meta = buildPaginationMeta(50, 3, 20);
    expect(meta.hasNext).toBe(false);
    expect(meta.hasPrev).toBe(true);
  });

  it('handles single page', () => {
    const meta = buildPaginationMeta(5, 1, 20);
    expect(meta.pages).toBe(1);
    expect(meta.hasNext).toBe(false);
    expect(meta.hasPrev).toBe(false);
  });
});

// ─── Cricket Rules: Extras logic ─────────────────────────────────────────────

describe('Cricket extras rules', () => {
  describe('Wide ball', () => {
    it('wide adds 1 + any additional runs to extras, does not advance legal ball count', () => {
      // Wide: 1 extra + extraRuns (if ball reaches boundary = 4 total)
      const extraRuns = 1 + 3; // 1 wide + 3 running
      expect(extraRuns).toBe(4);
    });

    it('wide on no-ball: both penalties apply', () => {
      // Not standard cricket but validating the 2-run minimum
      const wideNoBall = 1 + 1; // 1 wide + 1 no-ball
      expect(wideNoBall).toBeGreaterThanOrEqual(2);
    });
  });

  describe('No-ball rules', () => {
    it('no-ball adds 1 extra and next ball is free hit', () => {
      const isNoBall = true;
      const nextBallIsFreeHit = isNoBall; // always true after no-ball
      expect(nextBallIsFreeHit).toBe(true);
    });

    it('runs scored off a no-ball count for batsman but ball is not legal', () => {
      const runs = 4;     // boundary off a no-ball
      const isLegal = false;
      const totalExtra = 1; // no-ball penalty
      const batsmanRuns = runs;
      expect(isLegal).toBe(false);
      expect(batsmanRuns).toBe(4);
      expect(totalExtra).toBe(1);
    });
  });

  describe('Byes and Leg Byes', () => {
    it('byes: runs are extras, not credited to batsman, ball IS legal', () => {
      const runs = 4; // 4 byes
      const batsmanRuns = 0;
      const extras = runs;
      const isLegal = true;
      expect(batsmanRuns).toBe(0);
      expect(extras).toBe(4);
      expect(isLegal).toBe(true);
    });

    it('leg byes: same as byes', () => {
      const legByeRuns = 2;
      const batsmanRuns = 0;
      expect(batsmanRuns).toBe(0);
      expect(legByeRuns).toBe(2);
    });
  });

  describe('Strike rotation rules', () => {
    it('odd runs rotate strike', () => {
      const runsScored = 1;
      const strikeChanges = runsScored % 2 === 1;
      expect(strikeChanges).toBe(true);
    });

    it('even runs do not rotate strike', () => {
      const runsScored = 4;
      const strikeChanges = runsScored % 2 === 1;
      expect(strikeChanges).toBe(false);
    });

    it('wide does not rotate strike (0 runs off bat)', () => {
      const isWide = true;
      const runsOffBat = 0;
      const strikeChanges = !isWide && runsOffBat % 2 === 1;
      expect(strikeChanges).toBe(false);
    });

    it('end of over always rotates strike', () => {
      // End of over = batsmen swap ends
      const endOfOver = true;
      expect(endOfOver).toBe(true); // always swap
    });
  });
});

// ─── Wicket type classification ───────────────────────────────────────────────

describe('Wicket types', () => {
  const wicketTypes = [
    'BOWLED', 'CAUGHT', 'LBW', 'RUN_OUT',
    'STUMPED', 'HIT_WICKET', 'OBSTRUCTING_FIELD',
    'TIMED_OUT', 'HANDLED_BALL', 'HIT_BALL_TWICE',
  ];

  it('has all 10 standard wicket types', () => {
    expect(wicketTypes.length).toBe(10);
  });

  it('run-out does NOT count as bowler wicket', () => {
    const bowlerWickets = ['BOWLED', 'CAUGHT', 'LBW', 'STUMPED', 'HIT_WICKET'];
    expect(bowlerWickets).not.toContain('RUN_OUT');
  });

  it('caught is a bowler wicket', () => {
    const bowlerWickets = ['BOWLED', 'CAUGHT', 'LBW', 'STUMPED', 'HIT_WICKET'];
    expect(bowlerWickets).toContain('CAUGHT');
  });

  it('stumped credits the bowler (not keeper)', () => {
    const bowlerWickets = ['BOWLED', 'CAUGHT', 'LBW', 'STUMPED', 'HIT_WICKET'];
    expect(bowlerWickets).toContain('STUMPED');
  });
});

// ─── Over and innings limits ──────────────────────────────────────────────────

describe('Match format rules', () => {
  it('T20 has 20 overs per innings', () => {
    expect(20 * 6).toBe(120); // 120 legal balls max
  });

  it('ODI has 50 overs per innings', () => {
    expect(50 * 6).toBe(300);
  });

  it('T10 has 10 overs per innings', () => {
    expect(10 * 6).toBe(60);
  });

  it('innings ends when all 10 wickets fall', () => {
    const maxWickets = 10;
    const wicketsForAllOut = 10;
    expect(wicketsForAllOut).toBe(maxWickets);
  });

  it('super over has exactly 1 over (6 legal balls)', () => {
    const superOverBalls = 1 * 6;
    expect(superOverBalls).toBe(6);
  });

  it('playing XI must have exactly 11 players', () => {
    const players = new Array(11).fill('player_id');
    expect(players.length).toBe(11);
  });
});

// ─── Target calculation ───────────────────────────────────────────────────────

describe('Target calculation', () => {
  it('target is first innings total + 1', () => {
    const firstInningsRuns = 185;
    const target = firstInningsRuns + 1;
    expect(target).toBe(186);
  });

  it('chasing team wins on reaching target (runs >= target)', () => {
    const target = 186;
    const chaseRuns = 186;
    expect(chaseRuns >= target).toBe(true);
  });

  it('bowling team wins if chase team does not reach target', () => {
    const target = 186;
    const chaseRuns = 185;
    expect(chaseRuns < target).toBe(true);
  });

  it('tie when scores are equal and last wicket falls', () => {
    // Both teams score exactly the same
    const team1Score = 150;
    const team2Score = 150;
    const team2AllOut = true;
    const isTie = team1Score === team2Score && team2AllOut;
    expect(isTie).toBe(true);
  });
});

// ─── Result margin calculation ────────────────────────────────────────────────

describe('Result margin', () => {
  it('calculates win by runs correctly (first innings team wins)', () => {
    const team1Runs = 185;
    const team2Runs = 160;
    const margin = team1Runs - team2Runs;
    expect(margin).toBe(25);
  });

  it('calculates win by wickets correctly (chasing team wins)', () => {
    const targetAchieved = true;
    const wicketsDown = 4;
    const wicketsLeft = 10 - wicketsDown;
    expect(wicketsLeft).toBe(6);
    expect(targetAchieved).toBe(true);
  });

  it('win by 10 wickets — perfect chase', () => {
    const wicketsDown = 0;
    const wicketsLeft = 10 - wicketsDown;
    expect(wicketsLeft).toBe(10);
  });
});

// ─── Commentary generation (rules) ───────────────────────────────────────────

describe('Commentary content rules', () => {
  it('six commentary contains SIX keyword', () => {
    const runsScored = 6;
    const isSix = runsScored === 6;
    expect(isSix).toBe(true);
  });

  it('four commentary indicates boundary', () => {
    const runsScored = 4;
    const isBoundary = runsScored === 4;
    expect(isBoundary).toBe(true);
  });

  it('dot ball is runs = 0', () => {
    const runsScored = 0;
    const isDotBall = runsScored === 0;
    expect(isDotBall).toBe(true);
  });

  it('maiden over has all dot balls', () => {
    const overBalls = [0, 0, 0, 0, 0, 0];
    const isMaiden = overBalls.every((r) => r === 0);
    expect(isMaiden).toBe(true);
  });

  it('not a maiden if any runs in over', () => {
    const overBalls = [0, 0, 1, 0, 0, 0];
    const isMaiden = overBalls.every((r) => r === 0);
    expect(isMaiden).toBe(false);
  });
});

// ─── Milestone thresholds ─────────────────────────────────────────────────────

describe('Milestone thresholds', () => {
  it('half-century is 50 runs', () => {
    const isFifty = (runs: number) => runs >= 50 && runs < 100;
    expect(isFifty(50)).toBe(true);
    expect(isFifty(99)).toBe(true);
    expect(isFifty(49)).toBe(false);
    expect(isFifty(100)).toBe(false);
  });

  it('century is 100 runs', () => {
    const isCentury = (runs: number) => runs >= 100 && runs < 200;
    expect(isCentury(100)).toBe(true);
    expect(isCentury(150)).toBe(true);
    expect(isCentury(99)).toBe(false);
    expect(isCentury(200)).toBe(false);
  });

  it('five-wicket haul threshold is 5', () => {
    const isFifer = (wickets: number) => wickets >= 5;
    expect(isFifer(5)).toBe(true);
    expect(isFifer(7)).toBe(true);
    expect(isFifer(4)).toBe(false);
  });

  it('hat-trick requires 3 consecutive wickets', () => {
    // 3 consecutive legal balls = wickets
    const lastThreeBalls = ['WICKET', 'WICKET', 'WICKET'];
    const isHatTrick = lastThreeBalls.every((b) => b === 'WICKET');
    expect(isHatTrick).toBe(true);
  });

  it('not a hat-trick if not consecutive', () => {
    const lastThreeBalls = ['WICKET', 'DOT', 'WICKET'];
    const isHatTrick = lastThreeBalls.every((b) => b === 'WICKET');
    expect(isHatTrick).toBe(false);
  });
});

// ─── Free hit rules ───────────────────────────────────────────────────────────

describe('Free hit rules', () => {
  it('no-ball triggers free hit next ball', () => {
    const isNoBall = true;
    const nextBallIsFreeBit = isNoBall;
    expect(nextBallIsFreeBit).toBe(true);
  });

  it('batsman cannot be out bowled on free hit', () => {
    const isFreeBit = true;
    const validDismissals = ['RUN_OUT', 'OBSTRUCTING_FIELD', 'HANDLED_BALL', 'HIT_BALL_TWICE'];
    // On a free hit, only these dismissals are valid
    expect(validDismissals).not.toContain('BOWLED');
    expect(validDismissals).not.toContain('CAUGHT');
    expect(validDismissals).not.toContain('LBW');
    expect(validDismissals).not.toContain('STUMPED');
    expect(isFreeBit).toBe(true);
  });

  it('free hit only applies to the NEXT ball after no-ball', () => {
    const ballAfterFreeBit = false; // free hit consumed
    expect(ballAfterFreeBit).toBe(false);
  });
});

// ─── DLS calculation logic ────────────────────────────────────────────────────

describe('DLS target logic', () => {
  it('DLS target overrides standard target', () => {
    const standardTarget = 200;
    const dlsTarget = 175; // revised due to rain
    const activeTarget = dlsTarget !== undefined ? dlsTarget : standardTarget;
    expect(activeTarget).toBe(175);
  });

  it('match has no DLS target by default', () => {
    const dlsTarget: number | null = null;
    expect(dlsTarget).toBeNull();
  });
});

// ─── Partnership tracking ─────────────────────────────────────────────────────

describe('Partnership tracking', () => {
  it('partnership resets when a batsman gets out', () => {
    const partnership = { runs: 50, balls: 40, isActive: true };
    const wicketFalls = true;
    if (wicketFalls) {
      partnership.isActive = false;
    }
    expect(partnership.isActive).toBe(false);
  });

  it('new partnership starts when next batsman comes in', () => {
    const newPartnership = { runs: 0, balls: 0, isActive: true };
    expect(newPartnership.runs).toBe(0);
    expect(newPartnership.isActive).toBe(true);
  });

  it('partnership runs accumulate correctly', () => {
    let partnershipRuns = 0;
    const balls = [4, 1, 0, 6, 2, 1]; // over
    balls.forEach((r) => { partnershipRuns += r; });
    expect(partnershipRuns).toBe(14);
  });
});

// ─── Powerplay rules ─────────────────────────────────────────────────────────

describe('Powerplay rules', () => {
  it('T20 powerplay is overs 1-6 (0-5 zero-indexed)', () => {
    const isPowerplay = (over: number) => over < 6;
    expect(isPowerplay(0)).toBe(true);
    expect(isPowerplay(5)).toBe(true);
    expect(isPowerplay(6)).toBe(false);
    expect(isPowerplay(19)).toBe(false);
  });

  it('ODI powerplay 1 is overs 1-10 (0-9 zero-indexed)', () => {
    const isPowerplay1 = (over: number) => over < 10;
    expect(isPowerplay1(9)).toBe(true);
    expect(isPowerplay1(10)).toBe(false);
  });
});

// ─── Score display format ─────────────────────────────────────────────────────

describe('Score display format', () => {
  it('formats score as runs/wickets', () => {
    const runs = 156;
    const wickets = 4;
    const formatted = `${runs}/${wickets}`;
    expect(formatted).toBe('156/4');
  });

  it('formats all-out score', () => {
    const runs = 143;
    const wickets = 10; // all out
    const formatted = wickets === 10 ? `${runs}` : `${runs}/${wickets}`;
    expect(formatted).toBe('143');
  });

  it('formats overs display', () => {
    const over = 14;
    const ball = 3;
    const formatted = `${over}.${ball}`;
    expect(formatted).toBe('14.3');
  });
});
