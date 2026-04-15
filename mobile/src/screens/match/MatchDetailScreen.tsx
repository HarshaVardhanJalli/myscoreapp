/**
 * MatchDetailScreen — match overview with toss, innings summary, start scoring CTA
 * created_by: MyCricketScoreEngine_v1
 */

import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAppDispatch, useAppSelector } from '../../store';
import { fetchMatch } from '../../store/slices/matchSlice';
import { matchAPI } from '../../services/api';
import { RootStackParamList } from '../../navigation';
import { colors, spacing, radius, font, shadows } from '../../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'MatchDetail'>;

export default function MatchDetailScreen({ route, navigation }: Props) {
  const { matchId } = route.params;
  const dispatch = useAppDispatch();
  const { currentMatch: match, isLoading } = useAppSelector((s) => s.matches);
  const { user } = useAppSelector((s) => s.auth);
  const [tossWinner, setTossWinner] = useState<string>('');
  const [tossChoice, setTossChoice] = useState<'BAT' | 'BOWL'>('BAT');
  const [showTossModal, setShowTossModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    dispatch(fetchMatch(matchId));
  }, [matchId, dispatch]);

  useFocusEffect(
    React.useCallback(() => {
      dispatch(fetchMatch(matchId));
    }, [dispatch, matchId]),
  );

  if (isLoading || !match) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const currentMatch = match;
  const isOwner = (currentMatch.createdById ?? currentMatch.createdByUser?.id) === user?.id;
  const isLive = currentMatch.status === 'PLAYING' || currentMatch.status === 'SECOND_INNINGS';
  const isCompleted = currentMatch.status === 'COMPLETED';
  const innings = currentMatch.innings ?? [];
  const inns1 = innings[0];
  const inns2 = innings[1];

  function formatOvers(over?: number, balls?: number) {
    return `${over ?? 0}.${balls ?? 0}`;
  }

  function getTeamById(teamId?: string) {
    if (!teamId) return undefined;
    if (teamId === currentMatch.team1.id) return currentMatch.team1;
    if (teamId === currentMatch.team2.id) return currentMatch.team2;
    return undefined;
  }

  function getInningsByTeam(teamId?: string) {
    if (!teamId) return undefined;
    return innings.find((entry) => entry.battingTeamId === teamId);
  }

  const derivedWinnerTeamId = currentMatch.winnerTeamId ?? (
    isCompleted && inns1 && inns2
      ? (inns2.totalRuns > inns1.totalRuns
        ? inns2.battingTeamId
        : (inns1.totalRuns > inns2.totalRuns ? inns1.battingTeamId : undefined))
      : undefined
  );
  const winnerTeam = getTeamById(derivedWinnerTeamId);
  const winningInnings = getInningsByTeam(derivedWinnerTeamId);
  const opponentTeam = winnerTeam?.id === currentMatch.team1.id ? currentMatch.team2 : currentMatch.team1;
  const opponentInnings = getInningsByTeam(opponentTeam?.id);

  let resultHeadline = currentMatch.resultDescription ?? 'Match result';
  let resultMarginValue: string | undefined;
  let resultMarginLabel: string | undefined;
  let resultSecondary = currentMatch.resultDescription;

  if (isCompleted && winnerTeam && inns1 && inns2) {
    if (derivedWinnerTeamId === inns2.battingTeamId && inns2.totalRuns > inns1.totalRuns) {
      const chasingTeam = getTeamById(inns2.battingTeamId);
      const wicketsRemaining = Math.max(0, getSquad(chasingTeam).length - 1 - inns2.wickets);
      resultHeadline = `${winnerTeam.name} won the match`;
      resultMarginValue = `${wicketsRemaining}`;
      resultMarginLabel = 'Wickets';
      resultSecondary = `Target ${inns1.totalRuns + 1} chased in ${formatOvers(inns2.currentOver, inns2.legalBallsInOver)} overs`;
    } else if (derivedWinnerTeamId === inns1.battingTeamId && inns1.totalRuns > inns2.totalRuns) {
      const margin = Math.max(0, inns1.totalRuns - inns2.totalRuns);
      resultHeadline = `${winnerTeam.name} won the match`;
      resultMarginValue = `${margin}`;
      resultMarginLabel = 'Runs';
      resultSecondary = `Defended ${inns1.totalRuns}/${inns1.wickets} against ${getTeamById(inns2.battingTeamId)?.name ?? opponentTeam?.name ?? 'the chase'}`;
    } else if (inns1.totalRuns === inns2.totalRuns) {
      resultHeadline = currentMatch.resultDescription ?? 'Match tied';
      resultMarginValue = 'Tied';
      resultMarginLabel = 'Result';
      resultSecondary = 'Scores finished level';
    }
  } else if (isCompleted && !winnerTeam && currentMatch.resultDescription) {
    resultHeadline = currentMatch.resultDescription;
    resultSecondary = 'Scores finished level';
  }

  function getSquad(team: any) {
    return ((team?.players ?? []) as any[])
      .filter((teamPlayer) => !teamPlayer.leftAt)
      .map((teamPlayer) => teamPlayer.player);
  }

  function getOpeningSetup(team: any) {
    const squad = getSquad(team).slice(0, 11);
    if (squad.length < 2) {
      throw new Error(`${team?.name ?? 'This team'} needs at least 2 players to start`);
    }
    return {
      playerIds: squad.map((player: any) => player.id),
      openingBatsmanIds: [squad[0].id, squad[1].id] as [string, string],
      openingBowlerId: squad[0].id,
    };
  }

  async function handleToss() {
    if (!tossWinner) { Alert.alert('Select toss winner'); return; }
    setActionLoading(true);
    try {
      await matchAPI.recordToss(matchId, { winnerTeamId: tossWinner, decision: tossChoice });
      dispatch(fetchMatch(matchId));
      setShowTossModal(false);
    } catch {
      Alert.alert('Error', 'Failed to record toss');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleStartInnings() {
    if (!currentMatch.toss) {
      Alert.alert('Toss Pending', 'Please record the toss before starting the innings');
      return;
    }

    setActionLoading(true);
    try {
      const isFirstInnings = innings.length === 0;
      const battingTeamId = isFirstInnings
        ? currentMatch.toss.battingFirstTeamId
        : (inns1?.battingTeamId === currentMatch.team1Id ? currentMatch.team2Id : currentMatch.team1Id);
      const bowlingTeamId = battingTeamId === currentMatch.team1Id ? currentMatch.team2Id : currentMatch.team1Id;
      const battingTeam = battingTeamId === currentMatch.team1Id ? (currentMatch as any).team1 : (currentMatch as any).team2;
      const bowlingTeam = bowlingTeamId === currentMatch.team1Id ? (currentMatch as any).team1 : (currentMatch as any).team2;
      const battingSetup = getOpeningSetup(battingTeam);
      const bowlingSetup = getOpeningSetup(bowlingTeam);

      await Promise.all([
        matchAPI.setPlayingXI(matchId, { teamId: battingTeamId, playerIds: battingSetup.playerIds }),
        matchAPI.setPlayingXI(matchId, { teamId: bowlingTeamId, playerIds: bowlingSetup.playerIds }),
      ]);

      const res = await matchAPI.startInnings(matchId, {
        battingTeamId,
        bowlingTeamId,
        openingBatsmanIds: battingSetup.openingBatsmanIds,
        openingBowlerId: bowlingSetup.openingBowlerId,
      });
      const inningsId = res.data?.innings?.id ?? res.data?.id;
      if (inningsId) {
        navigation.replace('Scoring', { matchId, inningsId });
      }
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.error || error?.message || 'Failed to start innings');
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Title card */}
      <View style={styles.titleCard}>
        <Text style={styles.matchType}>{currentMatch.matchType} · {currentMatch.oversPerInnings} overs</Text>
        <Text style={styles.matchTitle}>{currentMatch.title}</Text>
        {currentMatch.venueName && <Text style={styles.venue}>📍 {currentMatch.venueName}</Text>}
        <View style={styles.statusRow}>
          <View style={[styles.statusBadge, isLive && styles.statusBadgeLive]}>
            {isLive && <View style={styles.liveDot} />}
            <Text style={[styles.statusText, isLive && styles.statusTextLive]}>
              {currentMatch.status.replace('_', ' ')}
            </Text>
          </View>
        </View>
      </View>

      {/* Teams */}
      <View style={styles.teamsCard}>
        <View style={styles.teamBlock}>
          <Text style={styles.teamLabel}>Team 1</Text>
          <Text style={styles.teamName}>{currentMatch.team1.name}</Text>
          {inns1 && (
            <Text style={styles.innsScore}>
              {inns1.totalRuns}/{inns1.wickets} ({formatOvers(inns1.currentOver, inns1.legalBallsInOver)})
            </Text>
          )}
        </View>
        <Text style={styles.vs}>VS</Text>
        <View style={[styles.teamBlock, styles.teamBlockRight]}>
          <Text style={styles.teamLabel}>Team 2</Text>
          <Text style={styles.teamName}>{currentMatch.team2.name}</Text>
          {inns2 && (
            <Text style={styles.innsScore}>
              {inns2.totalRuns}/{inns2.wickets} ({formatOvers(inns2.currentOver, inns2.legalBallsInOver)})
            </Text>
          )}
        </View>
      </View>

      {isCompleted && (
        <View style={styles.resultHero}>
          <View style={styles.resultHeroHeader}>
            <Text style={styles.resultEyebrow}>Match Result</Text>
            {winnerTeam && (
              <View style={styles.resultWinnerPill}>
                <Text style={styles.resultWinnerPillText}>{winnerTeam.shortName}</Text>
              </View>
            )}
          </View>

          <Text style={styles.resultHeadline}>{resultHeadline}</Text>
          {resultSecondary ? <Text style={styles.resultSecondary}>{resultSecondary}</Text> : null}

          <View style={styles.resultMetrics}>
            <View style={styles.resultMetricPrimary}>
              <Text style={styles.resultMetricValue}>{resultMarginValue ?? 'Tied'}</Text>
              <Text style={styles.resultMetricLabel}>{resultMarginLabel ?? 'Result'}</Text>
            </View>
            <View style={styles.resultMetricSide}>
              <View style={styles.resultScoreChip}>
                <Text style={styles.resultScoreLabel}>{winnerTeam?.shortName ?? 'Winner'}</Text>
                <Text style={styles.resultScoreValue}>
                  {winningInnings ? `${winningInnings.totalRuns}/${winningInnings.wickets}` : '—'}
                </Text>
              </View>
              <View style={styles.resultScoreChip}>
                <Text style={styles.resultScoreLabel}>{opponentTeam?.shortName ?? 'Opposition'}</Text>
                <Text style={styles.resultScoreValue}>
                  {opponentInnings ? `${opponentInnings.totalRuns}/${opponentInnings.wickets}` : '—'}
                </Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {!isCompleted && currentMatch.resultDescription && (
        <View style={styles.resultCard}>
          <Text style={styles.resultText}>{currentMatch.resultDescription}</Text>
        </View>
      )}

      {/* Actions (owner only) */}
      {isOwner && (
        <View style={styles.actions}>
          {currentMatch.status === 'SETUP' && (
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => setShowTossModal(true)}
            >
              <Text style={styles.actionBtnText}>🪙 Record Toss</Text>
            </TouchableOpacity>
          )}
          {(currentMatch.status === 'TOSS' || currentMatch.status === 'INNINGS_BREAK') && (
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={handleStartInnings}
              disabled={actionLoading}
            >
              {actionLoading
                ? <ActivityIndicator color={colors.white} />
                : <Text style={styles.actionBtnText}>▶ Start Innings</Text>
              }
            </TouchableOpacity>
          )}
          {isLive && innings.length > 0 && (
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => {
                const lastInnings = innings[innings.length - 1];
                navigation.navigate('Scoring', { matchId, inningsId: (lastInnings as any).id ?? matchId });
              }}
            >
              <Text style={styles.actionBtnText}>🏏 Continue Scoring</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Toss modal (inline) */}
      {showTossModal && (
        <View style={styles.tossModal}>
          <Text style={styles.tossTitle}>Record Toss</Text>
          <Text style={styles.tossLabel}>Toss Winner</Text>
          <View style={styles.tossChoices}>
            {[currentMatch.team1, currentMatch.team2].map((t) => (
              <TouchableOpacity
                key={t.id}
                style={[styles.tossOption, tossWinner === t.id && styles.tossOptionSelected]}
                onPress={() => setTossWinner(t.id)}
              >
                <Text style={[styles.tossOptionText, tossWinner === t.id && styles.tossOptionTextSelected]}>
                  {t.shortName}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.tossLabel}>Decision</Text>
          <View style={styles.tossChoices}>
            {(['BAT', 'BOWL'] as const).map((d) => (
              <TouchableOpacity
                key={d}
                style={[styles.tossOption, tossChoice === d && styles.tossOptionSelected]}
                onPress={() => setTossChoice(d)}
              >
                <Text style={[styles.tossOptionText, tossChoice === d && styles.tossOptionTextSelected]}>{d}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.tossActions}>
            <TouchableOpacity style={styles.tossCancelBtn} onPress={() => setShowTossModal(false)}>
              <Text style={styles.tossCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.tossConfirmBtn} onPress={handleToss} disabled={actionLoading}>
              {actionLoading
                ? <ActivityIndicator color={colors.white} size="small" />
                : <Text style={styles.tossConfirmText}>Confirm</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* View Scorecard */}
      {innings.length > 0 && (
        <TouchableOpacity
          style={styles.scorecardBtn}
          onPress={() => navigation.navigate('Scorecard', { matchId })}
        >
          <Text style={styles.scorecardBtnText}>📋 View Full Scorecard</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4FF' },
  content: { padding: 20, paddingBottom: 48 },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F0F4FF' },

  /* ── Title card ── */
  titleCard: {
    backgroundColor: '#1A1F36',
    borderRadius: 24,
    padding: 24,
    marginBottom: 16,
    ...shadows.card,
  },
  matchType: {
    fontSize: 12,
    color: '#A5B4FC',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  matchTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  venue: {
    fontSize: 14,
    color: '#C8D6F8',
    marginBottom: 12,
  },
  statusRow: { flexDirection: 'row' },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 5,
  },
  statusBadgeLive: {
    backgroundColor: 'rgba(239,68,68,0.15)',
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusTextLive: { color: '#EF4444' },

  /* ── Teams card ── */
  teamsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.76)',
    borderRadius: 24,
    padding: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.50)',
    ...shadows.soft,
  },
  teamBlock: { flex: 1 },
  teamBlockRight: { alignItems: 'flex-end' },
  teamLabel: {
    fontSize: 11,
    color: '#A0A8C8',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  teamName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A1F36',
  },
  innsScore: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1F36',
    marginTop: 6,
  },
  vs: {
    fontSize: 13,
    fontWeight: '700',
    color: '#A0A8C8',
    marginHorizontal: 12,
  },

  /* ── Result ── */
  resultHero: {
    backgroundColor: 'rgba(255,255,255,0.84)',
    borderRadius: 24,
    padding: 22,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.14)',
    ...shadows.card,
  },
  resultHeroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  resultEyebrow: {
    fontSize: 11,
    color: '#7C88B6',
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  resultWinnerPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.16)',
  },
  resultWinnerPillText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#4F46E5',
  },
  resultHeadline: {
    fontSize: 24,
    fontWeight: '900',
    color: '#1A1F36',
    marginBottom: 8,
  },
  resultSecondary: {
    fontSize: 14,
    lineHeight: 20,
    color: '#6B7394',
    marginBottom: 18,
  },
  resultMetrics: {
    flexDirection: 'row',
    gap: 12,
  },
  resultMetricPrimary: {
    flex: 1,
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 16,
    backgroundColor: '#1A1F36',
    justifyContent: 'center',
  },
  resultMetricValue: {
    fontSize: 34,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  resultMetricLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#A5B4FC',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  resultMetricSide: {
    flex: 1,
    gap: 10,
  },
  resultScoreChip: {
    flex: 1,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: '#F8FAFF',
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.10)',
    justifyContent: 'center',
  },
  resultScoreLabel: {
    fontSize: 11,
    color: '#8A94B6',
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginBottom: 6,
  },
  resultScoreValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1A1F36',
  },
  resultCard: {
    backgroundColor: 'rgba(255,255,255,0.76)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.50)',
    borderLeftWidth: 4,
    borderLeftColor: '#6366F1',
    ...shadows.soft,
  },
  resultText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1F36',
  },

  /* ── Actions ── */
  actions: { gap: 12, marginBottom: 16 },
  actionBtn: {
    backgroundColor: '#6366F1',
    borderRadius: 999,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    ...shadows.glow,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  /* ── Toss modal ── */
  tossModal: {
    backgroundColor: 'rgba(255,255,255,0.76)',
    borderRadius: 24,
    padding: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.50)',
    ...shadows.card,
  },
  tossTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1A1F36',
    marginBottom: 20,
  },
  tossLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7394',
    marginBottom: 8,
  },
  tossChoices: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  tossOption: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: 'rgba(99,102,241,0.10)',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.60)',
  },
  tossOptionSelected: {
    borderColor: '#6366F1',
    backgroundColor: '#EEF2FF',
  },
  tossOptionText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#6B7394',
  },
  tossOptionTextSelected: { color: '#6366F1' },
  tossActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  tossCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: 'rgba(99,102,241,0.10)',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.60)',
  },
  tossCancelText: {
    color: '#6B7394',
    fontWeight: '700',
    fontSize: 15,
  },
  tossConfirmBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 999,
    backgroundColor: '#6366F1',
    alignItems: 'center',
    ...shadows.glow,
  },
  tossConfirmText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },

  /* ── Scorecard button ── */
  scorecardBtn: {
    backgroundColor: 'rgba(255,255,255,0.76)',
    borderRadius: 999,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(99,102,241,0.18)',
    ...shadows.soft,
  },
  scorecardBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#6366F1',
  },
});
