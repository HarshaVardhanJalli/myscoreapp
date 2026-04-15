/**
 * ScoringScreen — ball-by-ball scoring UI (Cricbuzz-style)
 * Clear display of striker, non-striker, bowler with live stats
 * created_by: MyCricketScoreEngine_v1
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Alert, Modal, ActivityIndicator, FlatList, Platform,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAppDispatch, useAppSelector } from '../../store';
import { fetchMatch, processBall, undoLastBall, endOver } from '../../store/slices/scoringSlice';
import { inningsAPI, matchAPI, teamAPI } from '../../services/api';
import { WicketType, BallInput } from '../../types';
import { RootStackParamList } from '../../navigation';
import { colors, spacing, radius, font } from '../../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Scoring'>;

// ─── Types ───────────────────────────────────────────────────────────────────

interface PlayerInfo {
  id: string;
  name: string;
}

interface TeamPlayerGroup {
  title: string;
  players: PlayerInfo[];
}

interface BatsmanLiveStats {
  playerId: string;
  name: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
}

interface BowlerLiveStats {
  playerId: string;
  name: string;
  overs: number;
  legalBalls: number;
  runs: number;
  wickets: number;
  wides: number;
  noBalls: number;
}

// ─── Small components ────────────────────────────────────────────────────────

function BallChip({ label, type }: { label: string; type: string }) {
  const bg: Record<string, string> = {
    dot: '#E2E8F0', '1': '#DBEAFE', '2': '#D1FAE5', '3': '#FEF3C7',
    '4': '#10B981', '6': '#F59E0B', W: '#EF4444',
    Wd: '#F97316', NB: '#EF4444', B: '#E8D5F5', LB: '#D1F5F0',
  };
  const isLight = !['4', '6', 'W'].includes(type);
  return (
    <View style={[chipStyles.chip, { backgroundColor: bg[type] ?? '#E2E8F0' }]}>
      <Text style={[chipStyles.label, !isLight && chipStyles.labelWhite]}>{label}</Text>
    </View>
  );
}
const chipStyles = StyleSheet.create({
  chip: {
    width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', marginHorizontal: 3,
    shadowColor: '#6366F1', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  label: { fontSize: 12, fontWeight: '800', color: '#1A1F36' },
  labelWhite: { color: '#fff' },
});

function WicketModal({
  visible, onSelect, onCancel,
}: { visible: boolean; onSelect: (t: WicketType) => void; onCancel: () => void }) {
  const types: WicketType[] = [
    'BOWLED', 'CAUGHT', 'LBW', 'RUN_OUT', 'STUMPED',
    'HIT_WICKET', 'OBSTRUCTING_FIELD', 'HANDLED_BALL', 'HIT_BALL_TWICE',
  ];
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={modalStyles.overlay}>
        <View style={modalStyles.sheet}>
          <Text style={modalStyles.title}>Select Wicket Type</Text>
          {types.map((t) => (
            <TouchableOpacity key={t} style={modalStyles.option} onPress={() => onSelect(t)}>
              <Text style={modalStyles.optionText}>{t.replace(/_/g, ' ')}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={modalStyles.cancel} onPress={onCancel}>
            <Text style={modalStyles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function PlayerPickerModal({
  visible, title, players, onSelect, onCancel,
}: {
  visible: boolean; title: string;
  players: PlayerInfo[];
  onSelect: (id: string) => void; onCancel: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={modalStyles.overlay}>
        <View style={[modalStyles.sheet, { maxHeight: '70%' }]}>
          <Text style={modalStyles.title}>{title}</Text>
          <FlatList
            data={players}
            keyExtractor={(p) => p.id}
            renderItem={({ item }) => (
              <TouchableOpacity style={modalStyles.option} onPress={() => onSelect(item.id)}>
                <Text style={modalStyles.optionText}>{item.name}</Text>
              </TouchableOpacity>
            )}
          />
          <TouchableOpacity style={modalStyles.cancel} onPress={onCancel}>
            <Text style={modalStyles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function FielderPickerModal({
  visible,
  title,
  groups,
  onSelect,
  onCancel,
}: {
  visible: boolean;
  title: string;
  groups: TeamPlayerGroup[];
  onSelect: (id: string) => void;
  onCancel: () => void;
}) {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (visible) {
      const initialState = groups.reduce<Record<string, boolean>>((acc, group, index) => {
        acc[group.title] = index === 0;
        return acc;
      }, {});
      setOpenSections(initialState);
    }
  }, [visible, groups]);

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={modalStyles.overlay}>
        <View style={[modalStyles.sheet, { maxHeight: '78%' }]}>
          <Text style={modalStyles.title}>{title}</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            {groups.map((group) => (
              <View key={group.title} style={modalStyles.groupSection}>
                <TouchableOpacity
                  style={modalStyles.groupHeader}
                  onPress={() => setOpenSections((prev) => ({ ...prev, [group.title]: !prev[group.title] }))}
                >
                  <Text style={modalStyles.groupHeaderText}>{group.title}</Text>
                  <Text style={modalStyles.groupHeaderArrow}>{openSections[group.title] ? '−' : '+'}</Text>
                </TouchableOpacity>
                {openSections[group.title] && group.players.map((player) => (
                  <TouchableOpacity key={player.id} style={modalStyles.option} onPress={() => onSelect(player.id)}>
                    <Text style={modalStyles.optionText}>{player.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </ScrollView>
          <TouchableOpacity style={modalStyles.cancel} onPress={onCancel}>
            <Text style={modalStyles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 32,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.50)',
    shadowColor: '#6366F1', shadowOpacity: 0.10, shadowRadius: 20, shadowOffset: { width: 0, height: -4 }, elevation: 8,
  },
  title: {
    fontSize: 18, fontWeight: '700', color: '#1A1F36', padding: 16,
    borderBottomWidth: 1, borderBottomColor: 'rgba(226,232,240,0.6)',
  },
  groupSection: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(226,232,240,0.4)',
  },
  groupHeader: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(248,250,255,0.9)',
  },
  groupHeaderText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#56607F',
  },
  groupHeaderArrow: {
    fontSize: 18,
    lineHeight: 20,
    color: '#8B94B2',
    fontWeight: '600',
  },
  option: { padding: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(226,232,240,0.4)' },
  optionText: { fontSize: 16, color: '#1A1F36' },
  cancel: {
    margin: 12, backgroundColor: 'rgba(255,255,255,0.76)', borderRadius: 14, padding: 14, alignItems: 'center',
    borderWidth: 1, borderColor: '#E2E8F0',
    shadowColor: '#6366F1', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  cancelText: { fontSize: 16, fontWeight: '700', color: '#6B7394' },
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function strikeRate(runs: number, balls: number): string {
  if (balls === 0) return '0.00';
  return ((runs / balls) * 100).toFixed(1);
}

function formatBowlerOvers(overs: number, balls: number): string {
  return `${overs}.${balls}`;
}

function economy(runs: number, overs: number, balls: number): string {
  const totalOvers = overs + balls / 6;
  if (totalOvers === 0) return '0.00';
  return (runs / totalOvers).toFixed(1);
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function ScoringScreen({ route, navigation }: Props) {
  const { matchId, inningsId } = route.params;
  const dispatch = useAppDispatch();
  const { inningsUpdate, commentaryFeed, isLoading, lastBall, error } = useAppSelector((s) => s.scoring);
  // Local fallback for initial innings state (before first ball is bowled)
  const [localInningsState, setLocalInningsState] = useState<{
    totalRuns: number; wickets: number; overs: number; balls: number; target?: number;
  } | null>(null);

  // Player rosters
  const [battingPlayers, setBattingPlayers] = useState<PlayerInfo[]>([]);
  const [bowlingPlayers, setBowlingPlayers] = useState<PlayerInfo[]>([]);
  const [teamNames, setTeamNames] = useState<{ batting: string; bowling: string }>({ batting: '', bowling: '' });

  // Current on-field players
  const [strikerId, setStrikerId] = useState('');
  const [nonStrikerId, setNonStrikerId] = useState('');
  const [bowlerId, setBowlerId] = useState('');

  // Live batsman/bowler stats (tracked locally from ball results)
  const [batsmanStats, setBatsmanStats] = useState<Map<string, BatsmanLiveStats>>(new Map());
  const [bowlerStats, setBowlerStats] = useState<Map<string, BowlerLiveStats>>(new Map());

  // Ball state
  const [isWide, setIsWide] = useState(false);
  const [isNoBall, setIsNoBall] = useState(false);
  const [isBye, setIsBye] = useState(false);
  const [isLegBye, setIsLegBye] = useState(false);
  const [pendingWicket, setPendingWicket] = useState(false);
  const [wicketType, setWicketType] = useState<WicketType | undefined>();
  const [selectedFielderId, setSelectedFielderId] = useState<string | undefined>();

  // Modals
  const [showWicketModal, setShowWicketModal] = useState(false);
  const [showFielderPicker, setShowFielderPicker] = useState(false);
  const [showStrikerPicker, setShowStrikerPicker] = useState(false);
  const [showNonStrikerPicker, setShowNonStrikerPicker] = useState(false);
  const [showBowlerPicker, setShowBowlerPicker] = useState(false);
  const [showNewBatsmanPicker, setShowNewBatsmanPicker] = useState(false);

  // Over ball trail
  const [overBalls, setOverBalls] = useState<string[]>([]);

  // Initial setup flag
  const [needsSetup, setNeedsSetup] = useState(true);

  // ─── Load innings data ───────────────────────────────────────────────────

  const loadInnings = useCallback(async () => {
    try {
      const [matchRes, scorecardRes] = await Promise.all([
        matchAPI.get(matchId),
        matchAPI.scorecard(matchId),
      ]);
      const m = matchRes.data;
      const inningsList = scorecardRes.data?.innings ?? [];
      const scorecardInnings =
        inningsList.find((i: any) => i.inningsId === inningsId || i.id === inningsId) ??
        scorecardRes.data?.currentInnings ??
        inningsList[0];
      const inns = (m.innings ?? []).find((i: any) => i.id === inningsId) ?? (m.innings ?? [])[0];

      const battTeamId = inns?.battingTeamId;
      const bowlTeamId = inns?.bowlingTeamId;
      if (!battTeamId || !bowlTeamId) {
        return;
      }

      const [battRes, bowlRes] = await Promise.all([
        teamAPI.get(battTeamId),
        teamAPI.get(bowlTeamId),
      ]);
      const battTeamPlayers = (battRes.data?.players ?? []).map((tp: any) => ({
        id: tp.player.id, name: tp.player.name,
      }));
      const bowlTeamPlayers = (bowlRes.data?.players ?? []).map((tp: any) => ({
        id: tp.player.id, name: tp.player.name,
      }));
      setTeamNames({
        batting: battRes.data?.name ?? 'Batting',
        bowling: bowlRes.data?.name ?? 'Bowling',
      });

      const battingEntries = (scorecardInnings?.batsmen ?? scorecardInnings?.batting ?? [])
        .filter((player: any) => player.playerId);
      const bowlingEntries = (scorecardInnings?.bowlers ?? scorecardInnings?.bowling ?? [])
        .filter((player: any) => player.playerId);

      const inningsBattingPlayers: PlayerInfo[] = battingEntries.map((player: any) => ({
        id: player.playerId,
        name: player.playerName ?? battTeamPlayers.find((p: PlayerInfo) => p.id === player.playerId)?.name ?? player.playerId,
      }));
      const inningsBowlingPlayers: PlayerInfo[] = bowlingEntries.map((player: any) => ({
        id: player.playerId,
        name: player.playerName ?? bowlTeamPlayers.find((p: PlayerInfo) => p.id === player.playerId)?.name ?? player.playerId,
      }));

      setBattingPlayers(inningsBattingPlayers);
      setBowlingPlayers(inningsBowlingPlayers);

      const hydratedBatting = new Map<string, BatsmanLiveStats>();
      battingEntries.forEach((player: any) => {
        hydratedBatting.set(player.playerId, {
          playerId: player.playerId,
          name: player.playerName ?? inningsBattingPlayers.find((p: PlayerInfo) => p.id === player.playerId)?.name ?? player.playerId,
          runs: player.runs ?? 0,
          balls: player.balls ?? 0,
          fours: player.fours ?? 0,
          sixes: player.sixes ?? 0,
        });
      });
      if (hydratedBatting.size > 0) {
        setBatsmanStats(hydratedBatting);
      }

      const hydratedBowling = new Map<string, BowlerLiveStats>();
      bowlingEntries.forEach((player: any) => {
        // player.overs = completed overs (number), player.balls = remaining balls in current over
        const completedOvers = Number(player.overs ?? 0) || 0;
        const ballsThisOver = Number(player.balls ?? 0) || 0;
        const totalLegalBalls = completedOvers * 6 + ballsThisOver;
        hydratedBowling.set(player.playerId, {
          playerId: player.playerId,
          name: player.playerName ?? inningsBowlingPlayers.find((p: PlayerInfo) => p.id === player.playerId)?.name ?? player.playerId,
          overs: completedOvers,
          legalBalls: totalLegalBalls,
          runs: player.runs ?? 0,
          wickets: player.wickets ?? 0,
          wides: player.wides ?? 0,
          noBalls: player.noBalls ?? 0,
        });
      });
      if (hydratedBowling.size > 0) {
        setBowlerStats(hydratedBowling);
      }

      const onStrike = battingEntries.find((player: any) => player.onStrike && !player.isOut);
      const notOutBatsmen = battingEntries.filter((player: any) => !player.isOut);
      const fallbackStriker = onStrike ?? notOutBatsmen[0] ?? battingEntries[0];
      const fallbackNonStriker =
        notOutBatsmen.find((player: any) => player.playerId !== fallbackStriker?.playerId) ??
        battingEntries.find((player: any) => player.playerId !== fallbackStriker?.playerId);
      const currentBowler = bowlingEntries.find((player: any) => player.isCurrent) ?? bowlingEntries[0];

      if (fallbackStriker?.playerId) {
        setStrikerId(fallbackStriker.playerId);
      } else {
        setStrikerId('');
      }
      if (fallbackNonStriker?.playerId) {
        setNonStrikerId(fallbackNonStriker.playerId);
      } else {
        setNonStrikerId('');
      }
      if (currentBowler?.playerId) {
        setBowlerId(currentBowler.playerId);
      } else {
        setBowlerId('');
      }

      // Initialize local innings state (for score header before first ball is bowled)
      if (scorecardInnings) {
        setLocalInningsState({
          totalRuns: scorecardInnings.totalRuns ?? 0,
          wickets: scorecardInnings.wickets ?? 0,
          overs: scorecardInnings.overs ?? scorecardInnings.currentOver ?? 0,
          balls: scorecardInnings.balls ?? scorecardInnings.legalBallsInOver ?? 0,
          target: scorecardInnings.target,
        });
      }

      setNeedsSetup(!(fallbackStriker?.playerId && fallbackNonStriker?.playerId && currentBowler?.playerId));
    } catch (e) {
      // silently fail — UI will show defaults
    }
  }, [matchId, inningsId]);

  useEffect(() => {
    dispatch(fetchMatch(matchId));
    loadInnings();
  }, [matchId, dispatch, loadInnings]);

  // ─── Process ball results ────────────────────────────────────────────────

  useEffect(() => {
    if (!lastBall) return;

    const ball = lastBall.ball;
    const update = lastBall.inningsUpdate;

    // Update over ball trail
    const label = ball.isWicket ? 'W'
      : ball.isWide ? 'Wd'
      : ball.isNoBall ? 'NB'
      : ball.isBye ? 'B'
      : ball.isLegBye ? 'LB'
      : String(ball.runs);
    if (lastBall.overComplete) {
      setOverBalls([]);
    } else {
      setOverBalls((prev) => [...prev, label]);
    }

    // Update batsman stats from ball
    setBatsmanStats((prev) => {
      const next = new Map(prev);
      const bId = ball.batsmanId;
      const existing = next.get(bId);
      const bName = battingPlayers.find(p => p.id === bId)?.name ?? bId;
      const isLegal = !ball.isWide;
      const batRuns = (ball.isBye || ball.isLegBye || ball.isWide) ? 0 : ball.runs;

      if (existing) {
        next.set(bId, {
          ...existing,
          runs: existing.runs + batRuns,
          balls: existing.balls + (isLegal ? 1 : 0),
          fours: existing.fours + (batRuns === 4 && !ball.isBye && !ball.isLegBye ? 1 : 0),
          sixes: existing.sixes + (batRuns === 6 && !ball.isBye && !ball.isLegBye ? 1 : 0),
        });
      } else {
        next.set(bId, {
          playerId: bId, name: bName,
          runs: batRuns, balls: isLegal ? 1 : 0,
          fours: batRuns === 4 ? 1 : 0, sixes: batRuns === 6 ? 1 : 0,
        });
      }
      return next;
    });

    // Update bowler stats from ball
    setBowlerStats((prev) => {
      const next = new Map(prev);
      const bwId = ball.bowlerId;
      const existing = next.get(bwId);
      const bwName = bowlingPlayers.find(p => p.id === bwId)?.name ?? bwId;
      const isLegal = !ball.isWide && !ball.isNoBall;
      const bowlRuns = (ball.isBye || ball.isLegBye) ? 0 : ball.totalRuns;
      const isBowlerWicket = ball.isWicket && ball.wicketType &&
        !['RUN_OUT', 'OBSTRUCTING_FIELD', 'TIMED_OUT', 'HANDLED_BALL'].includes(ball.wicketType);

      if (existing) {
        const newLegalBalls = existing.legalBalls + (isLegal ? 1 : 0);
        const completedOvers = Math.floor(newLegalBalls / 6);
        const remainingBalls = newLegalBalls % 6;
        next.set(bwId, {
          ...existing,
          runs: existing.runs + bowlRuns,
          legalBalls: newLegalBalls,
          overs: existing.overs + completedOvers - Math.floor(existing.legalBalls / 6),
          wickets: existing.wickets + (isBowlerWicket ? 1 : 0),
          wides: existing.wides + (ball.isWide ? 1 : 0),
          noBalls: existing.noBalls + (ball.isNoBall ? 1 : 0),
        });
      } else {
        next.set(bwId, {
          playerId: bwId, name: bwName,
          overs: 0, legalBalls: isLegal ? 1 : 0,
          runs: bowlRuns, wickets: isBowlerWicket ? 1 : 0,
          wides: ball.isWide ? 1 : 0, noBalls: ball.isNoBall ? 1 : 0,
        });
      }
      return next;
    });

    // Auto-update on-field players from inningsUpdate
    if (update) {
      setStrikerId(update.currentBatsmanId);
      setNonStrikerId(update.nonStrikerId);
      setBowlerId(update.currentBowlerId);

      // Ensure new batsman has stats entry
      [update.currentBatsmanId, update.nonStrikerId].forEach(pid => {
        setBatsmanStats(prev => {
          if (prev.has(pid)) return prev;
          const next = new Map(prev);
          const name = battingPlayers.find(p => p.id === pid)?.name ?? pid;
          next.set(pid, { playerId: pid, name, runs: 0, balls: 0, fours: 0, sixes: 0 });
          return next;
        });
      });
    }

    // Over complete → show bowler picker
    if (lastBall.overComplete && !lastBall.isInningsComplete) {
      setShowBowlerPicker(true);
    }

    // Innings/match complete
    if (lastBall.isInningsComplete || lastBall.isMatchComplete) {
      const alertFn = Platform.OS === 'web' ? (t: string, m: string) => { window.alert(`${t}\n${m}`); navigation.replace('Scorecard', { matchId }); }
        : (t: string, m: string) => Alert.alert(t, m, [{ text: 'View Scorecard', onPress: () => navigation.replace('Scorecard', { matchId }) }]);
      alertFn(
        lastBall.isMatchComplete ? 'Match Complete' : 'Innings Complete',
        lastBall.commentary,
      );
    }
  }, [lastBall]);

  // ─── Ball input handlers ─────────────────────────────────────────────────

  function resetExtras() {
    setIsWide(false); setIsNoBall(false); setIsBye(false); setIsLegBye(false);
    setWicketType(undefined); setPendingWicket(false);
    setSelectedFielderId(undefined);
  }

  function submitBall(runs: number, overrides?: Partial<BallInput>) {
    if (!strikerId || !nonStrikerId || !bowlerId) {
      const alertMsg = 'Please select striker, non-striker, and bowler first.';
      if (Platform.OS === 'web') { window.alert(alertMsg); } else { Alert.alert('Setup Required', alertMsg); }
      if (!strikerId) setShowStrikerPicker(true);
      else if (!nonStrikerId) setShowNonStrikerPicker(true);
      else setShowBowlerPicker(true);
      return;
    }

    const hasStriker = battingPlayers.some((player) => player.id === strikerId);
    const hasNonStriker = battingPlayers.some((player) => player.id === nonStrikerId);
    const hasBowler = bowlingPlayers.some((player) => player.id === bowlerId);

    if (!hasStriker || !hasNonStriker || !hasBowler) {
      void loadInnings();
      const alertMsg = 'Scoring players were out of sync with this innings. The screen has been refreshed, please try again.';
      if (Platform.OS === 'web') { window.alert(alertMsg); } else { Alert.alert('Players Refreshed', alertMsg); }
      return;
    }

    const baseBall: BallInput = {
      batsmanId: strikerId,
      bowlerId,
      runs,
      isWide,
      isNoBall,
      isBye,
      isLegBye,
      isPenalty: false,
      isWicket: pendingWicket,
      wicketType: pendingWicket ? wicketType : undefined,
      dismissedPlayerId: pendingWicket ? strikerId : undefined,
    };

    if (isWide) {
      baseBall.extraRuns = runs;
      baseBall.runs = 0;
    } else if (isNoBall && (isBye || isLegBye)) {
      baseBall.extraRuns = runs;
      baseBall.runs = 0;
    }

    const ball = { ...baseBall, ...overrides };
    dispatch(processBall({ inningsId, ball }));
    resetExtras();
  }

  function handleRunPress(runs: number) {
    if (pendingWicket && !wicketType) {
      setShowWicketModal(true);
      return;
    }
    submitBall(runs, selectedFielderId ? { fielderIds: [selectedFielderId] } : undefined);
  }

  function handleWicketPress() {
    setPendingWicket(true);
    setShowWicketModal(true);
  }

  function handleWicketTypeSelected(type: WicketType) {
    setWicketType(type);
    setShowWicketModal(false);

    if (type === 'CAUGHT' || type === 'STUMPED') {
      setShowFielderPicker(true);
      return;
    }

    submitBall(0, { wicketType: type, isWicket: true, dismissedPlayerId: strikerId });
  }

  function handleUndo() {
    if (Platform.OS === 'web') {
      if (window.confirm('Undo the last ball?')) dispatch(undoLastBall(inningsId));
    } else {
      Alert.alert('Undo Last Ball', 'Are you sure?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Undo', style: 'destructive', onPress: () => dispatch(undoLastBall(inningsId)) },
      ]);
    }
  }

  // ─── Derived display values ──────────────────────────────────────────────

  const update = inningsUpdate;
  // Use inningsUpdate (live, from processBall) or fall back to localInningsState (from scorecard on load)
  const totalRuns = update?.totalRuns ?? localInningsState?.totalRuns ?? 0;
  const wickets = update?.wickets ?? localInningsState?.wickets ?? 0;
  const overs = update
    ? `${update.overs}.${update.balls}`
    : localInningsState
    ? `${localInningsState.overs}.${localInningsState.balls}`
    : '0.0';
  const crr = update?.currentRunRate?.toFixed(2) ?? '0.00';
  const rrr = update?.requiredRunRate?.toFixed(2);
  const target = update?.target ?? localInningsState?.target;

  const strikerStats = batsmanStats.get(strikerId);
  const nonStrikerStats = batsmanStats.get(nonStrikerId);
  const currentBowlerStats = bowlerStats.get(bowlerId);

  const strikerName = battingPlayers.find(p => p.id === strikerId)?.name ?? '—';
  const nonStrikerName = battingPlayers.find(p => p.id === nonStrikerId)?.name ?? '—';
  const bowlerName = bowlingPlayers.find(p => p.id === bowlerId)?.name ?? '—';
  const fielderGroups: TeamPlayerGroup[] = [
    { title: `${teamNames.bowling || 'Bowling'} fielders`, players: bowlingPlayers },
    { title: `${teamNames.batting || 'Batting'} players`, players: battingPlayers },
  ];

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <View style={s.container}>
      {/* ──── SCORE HEADER ──── */}
      <View style={s.header}>
        <View style={s.headerTop}>
          <Text style={s.teamNameHeader}>{teamNames.batting}</Text>
          <View style={s.scoreBox}>
            <Text style={s.scoreText}>{totalRuns}/{wickets}</Text>
            <Text style={s.oversText}>({overs} ov)</Text>
          </View>
        </View>
        <View style={s.rateRow}>
          <Text style={s.rateText}>CRR {crr}</Text>
          {rrr != null && <Text style={s.rateText}>  RRR {rrr}</Text>}
          {target != null && <Text style={s.targetText}>  Target: {target}</Text>}
        </View>
        {update?.partnershipRuns != null && (
          <Text style={s.partnershipText}>
            Partnership: {update.partnershipRuns} ({update.partnershipBalls} balls)
          </Text>
        )}
      </View>

      {/* ──── BATSMEN PANEL ──── */}
      <View style={s.batsmenPanel}>
        <View style={s.batsmenHeader}>
          <Text style={s.panelLabel}>BATSMAN</Text>
          <View style={s.batsmenStatHeaders}>
            <Text style={s.statHeader}>R</Text>
            <Text style={s.statHeader}>B</Text>
            <Text style={s.statHeader}>4s</Text>
            <Text style={s.statHeader}>6s</Text>
            <Text style={s.statHeader}>SR</Text>
          </View>
        </View>

        {/* Striker row */}
        <TouchableOpacity style={s.playerRow} onPress={() => setShowStrikerPicker(true)}>
          <View style={s.playerNameCol}>
            <View style={s.strikerDot} />
            <Text style={s.playerName} numberOfLines={1}>{strikerName}</Text>
            <Text style={s.onStrikeLabel}>*</Text>
          </View>
          <View style={s.batsmenStatHeaders}>
            <Text style={s.statValue}>{strikerStats?.runs ?? 0}</Text>
            <Text style={s.statValueDim}>{strikerStats?.balls ?? 0}</Text>
            <Text style={s.statValueDim}>{strikerStats?.fours ?? 0}</Text>
            <Text style={s.statValueDim}>{strikerStats?.sixes ?? 0}</Text>
            <Text style={s.statValue}>{strikeRate(strikerStats?.runs ?? 0, strikerStats?.balls ?? 0)}</Text>
          </View>
        </TouchableOpacity>

        {/* Non-striker row */}
        <TouchableOpacity style={s.playerRow} onPress={() => setShowNonStrikerPicker(true)}>
          <View style={s.playerNameCol}>
            <View style={s.nonStrikerDot} />
            <Text style={s.playerNameDim} numberOfLines={1}>{nonStrikerName}</Text>
          </View>
          <View style={s.batsmenStatHeaders}>
            <Text style={s.statValueDim}>{nonStrikerStats?.runs ?? 0}</Text>
            <Text style={s.statValueDim}>{nonStrikerStats?.balls ?? 0}</Text>
            <Text style={s.statValueDim}>{nonStrikerStats?.fours ?? 0}</Text>
            <Text style={s.statValueDim}>{nonStrikerStats?.sixes ?? 0}</Text>
            <Text style={s.statValueDim}>{strikeRate(nonStrikerStats?.runs ?? 0, nonStrikerStats?.balls ?? 0)}</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* ──── BOWLER PANEL ──── */}
      <TouchableOpacity style={s.bowlerPanel} onPress={() => setShowBowlerPicker(true)}>
        <View style={s.bowlerHeader}>
          <Text style={s.panelLabel}>BOWLER</Text>
          <View style={s.bowlerStatHeaders}>
            <Text style={s.statHeader}>O</Text>
            <Text style={s.statHeader}>R</Text>
            <Text style={s.statHeader}>W</Text>
            <Text style={s.statHeader}>Econ</Text>
          </View>
        </View>
        <View style={s.bowlerRow}>
          <View style={s.bowlerNameCol}>
            <Text style={s.bowlerIcon}>⚾</Text>
            <Text style={s.playerName} numberOfLines={1}>{bowlerName}</Text>
          </View>
          <View style={s.bowlerStatHeaders}>
            <Text style={s.statValue}>
              {formatBowlerOvers(
                Math.floor((currentBowlerStats?.legalBalls ?? 0) / 6),
                (currentBowlerStats?.legalBalls ?? 0) % 6
              )}
            </Text>
            <Text style={s.statValue}>{currentBowlerStats?.runs ?? 0}</Text>
            <Text style={s.statValue}>{currentBowlerStats?.wickets ?? 0}</Text>
            <Text style={s.statValue}>
              {economy(
                currentBowlerStats?.runs ?? 0,
                Math.floor((currentBowlerStats?.legalBalls ?? 0) / 6),
                (currentBowlerStats?.legalBalls ?? 0) % 6
              )}
            </Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* ──── THIS OVER ──── */}
      <View style={s.overRow}>
        <Text style={s.overLabel}>This Over</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.overScroll}>
          {overBalls.map((b, i) => (
            <BallChip
              key={i}
              label={b}
              type={b === 'W' ? 'W' : b === 'Wd' ? 'Wd' : b === 'NB' ? 'NB' : b === 'B' ? 'B' : b === 'LB' ? 'LB' : b === '0' ? 'dot' : b}
            />
          ))}
          {overBalls.length === 0 && <Text style={s.overEmpty}>New over</Text>}
        </ScrollView>
      </View>

      {/* ──── EXTRAS TOGGLES ──── */}
      <View style={s.extrasRow}>
        {[
          { label: 'Wide', active: isWide, toggle: () => { setIsWide(!isWide); setIsNoBall(false); } },
          { label: 'No Ball', active: isNoBall, toggle: () => { setIsNoBall(!isNoBall); setIsWide(false); } },
          { label: 'Bye', active: isBye, toggle: () => { setIsBye(!isBye); setIsLegBye(false); } },
          { label: 'Leg Bye', active: isLegBye, toggle: () => { setIsLegBye(!isLegBye); setIsBye(false); } },
        ].map((e) => (
          <TouchableOpacity
            key={e.label}
            style={[s.extraBtn, e.active && s.extraBtnActive]}
            onPress={e.toggle}
          >
            <Text style={[s.extraBtnText, e.active && s.extraBtnTextActive]}>{e.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ──── RUN BUTTONS ──── */}
      <View style={s.runsGrid}>
        {[0, 1, 2, 3, 4, 6].map((r) => (
          <TouchableOpacity
            key={r}
            style={[
              s.runBtn,
              r === 4 && s.runBtn4,
              r === 6 && s.runBtn6,
            ]}
            onPress={() => handleRunPress(r)}
            disabled={isLoading}
          >
            <Text style={[s.runBtnText, (r === 4 || r === 6) && s.runBtnTextWhite]}>
              {r === 0 ? '•' : r}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ──── WICKET + UNDO ──── */}
      <View style={s.actionRow}>
        <TouchableOpacity
          style={[s.wicketBtn, pendingWicket && s.wicketBtnActive]}
          onPress={handleWicketPress}
          disabled={isLoading}
        >
          <Text style={s.wicketBtnText}>
            {pendingWicket ? `OUT (${wicketType?.replace(/_/g, ' ') ?? '?'})` : 'WICKET'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.undoBtn} onPress={handleUndo} disabled={isLoading}>
          <Text style={s.undoBtnText}>UNDO</Text>
        </TouchableOpacity>
      </View>

      {/* ──── COMMENTARY ──── */}
      <View style={s.commentary}>
        <Text style={s.commentaryTitle}>Ball-by-Ball</Text>
        <ScrollView style={s.commentaryScroll} showsVerticalScrollIndicator={false}>
          {commentaryFeed.length === 0 ? (
            <Text style={s.commentaryEmpty}>Commentary will appear here</Text>
          ) : (
            commentaryFeed.map((c, i) => (
              <Text key={i} style={[s.commentaryItem, i === 0 && s.commentaryLatest]}>{c}</Text>
            ))
          )}
        </ScrollView>
      </View>

      {/* ──── ERROR BANNER ──── */}
      {error && (
        <View style={s.errorBanner}>
          <Text style={s.errorText}>{error}</Text>
        </View>
      )}

      {/* ──── LOADING OVERLAY ──── */}
      {isLoading && (
        <View style={s.loadingOverlay}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      )}

      {/* ──── MODALS ──── */}
      <WicketModal
        visible={showWicketModal}
        onSelect={handleWicketTypeSelected}
        onCancel={() => { setShowWicketModal(false); setPendingWicket(false); setWicketType(undefined); }}
      />

      <FielderPickerModal
        visible={showFielderPicker}
        title={wicketType === 'STUMPED' ? 'Who completed the stumping?' : 'Who took the catch?'}
        groups={fielderGroups}
        onSelect={(id) => {
          setSelectedFielderId(id);
          setShowFielderPicker(false);
          submitBall(0, {
            wicketType,
            isWicket: true,
            dismissedPlayerId: strikerId,
            fielderIds: [id],
          });
        }}
        onCancel={() => {
          setShowFielderPicker(false);
          setPendingWicket(false);
          setWicketType(undefined);
          setSelectedFielderId(undefined);
        }}
      />

      <PlayerPickerModal
        visible={showStrikerPicker}
        title="Select Striker"
        players={battingPlayers.filter(p => p.id !== nonStrikerId)}
        onSelect={(id) => { setStrikerId(id); setShowStrikerPicker(false); }}
        onCancel={() => setShowStrikerPicker(false)}
      />

      <PlayerPickerModal
        visible={showNonStrikerPicker}
        title="Select Non-Striker"
        players={battingPlayers.filter(p => p.id !== strikerId)}
        onSelect={(id) => { setNonStrikerId(id); setShowNonStrikerPicker(false); }}
        onCancel={() => setShowNonStrikerPicker(false)}
      />

      <PlayerPickerModal
        visible={showBowlerPicker}
        title="Select Bowler"
        players={bowlingPlayers}
        onSelect={(id) => {
          setBowlerId(id);
          // Init bowler stats if new
          setBowlerStats(prev => {
            if (prev.has(id)) return prev;
            const next = new Map(prev);
            const name = bowlingPlayers.find(p => p.id === id)?.name ?? id;
            next.set(id, { playerId: id, name, overs: 0, legalBalls: 0, runs: 0, wickets: 0, wides: 0, noBalls: 0 });
            return next;
          });
          setShowBowlerPicker(false);
        }}
        onCancel={() => setShowBowlerPicker(false)}
      />

      <PlayerPickerModal
        visible={showNewBatsmanPicker}
        title="New Batsman In"
        players={battingPlayers.filter(p => p.id !== strikerId && p.id !== nonStrikerId)}
        onSelect={(id) => {
          setStrikerId(id);
          setBatsmanStats(prev => {
            if (prev.has(id)) return prev;
            const next = new Map(prev);
            const name = battingPlayers.find(p => p.id === id)?.name ?? id;
            next.set(id, { playerId: id, name, runs: 0, balls: 0, fours: 0, sixes: 0 });
            return next;
          });
          setShowNewBatsmanPicker(false);
        }}
        onCancel={() => setShowNewBatsmanPicker(false)}
      />
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const glassCard = {
  backgroundColor: 'rgba(255,255,255,0.76)',
  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.50)',
  borderRadius: 20,
  shadowColor: '#6366F1',
  shadowOpacity: 0.06,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 3,
} as const;

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4FF' },

  // Header
  header: {
    backgroundColor: '#1A1F36',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 14,
    borderBottomLeftRadius: 20, borderBottomRightRadius: 20,
    shadowColor: '#1A1F36', shadowOpacity: 0.20, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 6,
  },
  headerTop: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  teamNameHeader: {
    fontSize: 14, fontWeight: '700', color: '#A5B4FC', textTransform: 'uppercase', letterSpacing: 1,
  },
  scoreBox: { flexDirection: 'row', alignItems: 'baseline' },
  scoreText: { fontSize: 42, fontWeight: '900', color: '#fff' },
  oversText: { fontSize: 16, color: '#A5B4FC', marginLeft: 6 },
  rateRow: { flexDirection: 'row', marginTop: 2 },
  rateText: { fontSize: 12, color: 'rgba(165,180,252,0.8)', fontWeight: '600' },
  targetText: { fontSize: 12, color: '#F59E0B', fontWeight: '700' },
  partnershipText: { fontSize: 11, color: '#A5B4FC', marginTop: 2 },

  // Batsmen panel
  batsmenPanel: {
    ...glassCard,
    marginHorizontal: 12, marginTop: 12,
  },
  batsmenHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6,
  },
  panelLabel: {
    fontSize: 10, fontWeight: '800', color: '#A0A8C8', letterSpacing: 1.5,
  },
  batsmenStatHeaders: {
    flexDirection: 'row', width: 200, justifyContent: 'flex-end',
  },
  statHeader: {
    width: 40, textAlign: 'center', fontSize: 10, fontWeight: '700', color: '#A0A8C8',
  },
  playerRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: 'rgba(226,232,240,0.5)',
  },
  playerNameCol: {
    flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 0,
  },
  strikerDot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: '#6366F1', marginRight: 8,
  },
  nonStrikerDot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: '#E2E8F0', marginRight: 8,
  },
  playerName: {
    fontSize: 14, fontWeight: '700', color: '#1A1F36', flexShrink: 1,
  },
  playerNameDim: {
    fontSize: 14, fontWeight: '600', color: '#6B7394', flexShrink: 1,
  },
  onStrikeLabel: {
    fontSize: 16, fontWeight: '900', color: '#6366F1', marginLeft: 2,
  },
  statValue: {
    width: 40, textAlign: 'center', fontSize: 14, fontWeight: '700', color: '#1A1F36',
  },
  statValueDim: {
    width: 40, textAlign: 'center', fontSize: 14, fontWeight: '600', color: '#6B7394',
  },

  // Bowler panel
  bowlerPanel: {
    ...glassCard,
    marginHorizontal: 12, marginTop: 12,
  },
  bowlerHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6,
  },
  bowlerStatHeaders: {
    flexDirection: 'row', width: 160, justifyContent: 'flex-end',
  },
  bowlerRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: 'rgba(226,232,240,0.5)',
  },
  bowlerNameCol: {
    flexDirection: 'row', alignItems: 'center', flex: 1,
  },
  bowlerIcon: { fontSize: 14, marginRight: 8 },

  // Over trail
  overRow: {
    flexDirection: 'row', alignItems: 'center',
    ...glassCard,
    marginHorizontal: 12, marginTop: 12,
    paddingHorizontal: 16, paddingVertical: 10,
  },
  overLabel: { fontSize: 12, fontWeight: '700', color: '#6B7394', marginRight: 10, minWidth: 60 },
  overScroll: { flex: 1 },
  overEmpty: { fontSize: 12, color: '#A0A8C8' },

  // Extras
  extrasRow: {
    flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8, gap: 8, backgroundColor: '#F8FAFF',
  },
  extraBtn: {
    flex: 1, paddingVertical: 8, borderRadius: 12,
    borderWidth: 1.5, borderColor: '#E2E8F0', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.76)',
    shadowColor: '#6366F1', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },
  extraBtnActive: { borderColor: '#F59E0B', backgroundColor: '#FFF7ED' },
  extraBtnText: { fontSize: 11, fontWeight: '800', color: '#6B7394' },
  extraBtnTextActive: { color: '#EA580C' },

  // Runs grid
  runsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, paddingVertical: 8, gap: 8, backgroundColor: '#F0F4FF',
  },
  runBtn: {
    width: '31%', aspectRatio: 2, alignItems: 'center', justifyContent: 'center',
    borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.76)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.50)',
    shadowColor: '#6366F1', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 3,
  },
  runBtn4: { backgroundColor: '#10B981', borderColor: '#10B981' },
  runBtn6: { backgroundColor: '#F59E0B', borderColor: '#F59E0B' },
  runBtnText: { fontSize: 28, fontWeight: '900', color: '#1A1F36' },
  runBtnTextWhite: { color: '#fff' },

  // Actions
  actionRow: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8, gap: 8, backgroundColor: '#F0F4FF' },
  wicketBtn: {
    flex: 2, padding: 14, borderRadius: 16, backgroundColor: '#EF4444', alignItems: 'center',
    shadowColor: '#EF4444', shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 4,
  },
  wicketBtnActive: { backgroundColor: '#DC2626' },
  wicketBtnText: { color: '#fff', fontWeight: '900', fontSize: 15 },
  undoBtn: {
    flex: 1, padding: 14, borderRadius: 16, alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.76)',
    borderWidth: 1.5, borderColor: '#E2E8F0',
    shadowColor: '#6366F1', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  undoBtnText: { color: '#6B7394', fontWeight: '800', fontSize: 13 },

  // Commentary
  commentary: {
    flex: 1,
    ...glassCard,
    marginHorizontal: 12, marginTop: 12, marginBottom: 12,
    borderRadius: 20,
  },
  commentaryTitle: {
    fontSize: 10, fontWeight: '800', color: '#A0A8C8', letterSpacing: 1.5, textTransform: 'uppercase',
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6,
  },
  commentaryScroll: { paddingHorizontal: 16 },
  commentaryEmpty: { color: '#A0A8C8', fontSize: 13, paddingVertical: 8 },
  commentaryItem: { fontSize: 13, color: '#6B7394', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: 'rgba(226,232,240,0.4)' },
  commentaryLatest: { color: '#1A1F36', fontWeight: '700' },

  // Error
  errorBanner: {
    backgroundColor: '#FEE2E2', padding: 12, alignItems: 'center',
    marginHorizontal: 12, borderRadius: 12,
  },
  errorText: { color: '#DC2626', fontSize: 13, fontWeight: '600' },

  // Loading
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center', justifyContent: 'center', zIndex: 99,
  },
});
