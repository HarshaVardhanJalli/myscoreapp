/**
 * ScorecardScreen — full batting & bowling scorecard
 * created_by: MyCricketScoreEngine_v1
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { matchAPI } from '../../services/api';
import { RootStackParamList } from '../../navigation';
import { colors, spacing, radius, font, shadows } from '../../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Scorecard'>;

interface BattingRow {
  playerName: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  strikeRate: number;
  isOut: boolean;
  dismissalInfo?: string;
}

interface BowlingRow {
  playerName: string;
  overs: string;
  maidens: number;
  runs: number;
  wickets: number;
  economy: number;
  wides: number;
  noBalls: number;
}

interface InningsCard {
  inningsNumber: number;
  battingTeamName: string;
  totalRuns: number;
  wickets: number;
  overs: string;
  extras: { wides: number; noBalls: number; byes: number; legByes: number; total: number };
  batting: BattingRow[];
  bowling: BowlingRow[];
}

function TableHeader({ cols }: { cols: Array<{ label: string; flex?: number; align?: 'left' | 'right' }> }) {
  return (
    <View style={tableStyles.header}>
      {cols.map((c, i) => (
        <Text key={i} style={[tableStyles.headerCell, { flex: c.flex ?? 1, textAlign: c.align ?? 'right' }]}>
          {c.label}
        </Text>
      ))}
    </View>
  );
}

const tableStyles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    backgroundColor: colors.primaryMuted,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  headerCell: {
    fontSize: font.xs,
    fontWeight: '800',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});

export default function ScorecardScreen({ route }: Props) {
  const { matchId } = route.params;
  const [innings, setInnings] = useState<InningsCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeInnings, setActiveInnings] = useState(0);
  const [error, setError] = useState('');

  const loadScorecard = useCallback(() => {
    setIsLoading(true);
    setError('');
    matchAPI.scorecard(matchId)
      .then((res) => {
        const data = res.data;
        const currentInningsId = data.currentInnings?.inningsId;
        // Normalise API response into InningsCard[]
        const cards: InningsCard[] = (data.innings ?? []).map((inns: any) => ({
          inningsNumber: inns.inningsNumber,
          battingTeamName: inns.battingTeamName ?? inns.battingTeam?.name ?? `Innings ${inns.inningsNumber}`,
          totalRuns: inns.totalRuns ?? 0,
          wickets: inns.wickets ?? 0,
          overs: `${inns.overs ?? inns.currentOver ?? 0}.${inns.balls ?? inns.legalBallsInOver ?? 0}`,
          extras: {
            wides: inns.extras?.wides ?? inns.extrasWides ?? 0,
            noBalls: inns.extras?.noBalls ?? inns.extrasNoBalls ?? 0,
            byes: inns.extras?.byes ?? inns.extrasByes ?? 0,
            legByes: inns.extras?.legByes ?? inns.extrasLegByes ?? 0,
            total: inns.extras?.total ?? (
              (inns.extrasWides ?? 0) +
              (inns.extrasNoBalls ?? 0) +
              (inns.extrasByes ?? 0) +
              (inns.extrasLegByes ?? 0)
            ),
          },
          batting: (inns.batsmen ?? inns.batting ?? inns.batterStats ?? []).map((b: any) => ({
            playerName: b.playerName ?? b.player?.name ?? '—',
            runs: b.runs ?? 0,
            balls: b.balls ?? 0,
            fours: b.fours ?? 0,
            sixes: b.sixes ?? 0,
            strikeRate: b.strikeRate ?? 0,
            isOut: b.isOut ?? false,
            dismissalInfo: b.dismissalInfo ?? b.howOut,
          })),
          bowling: (inns.bowlers ?? inns.bowling ?? inns.bowlerStats ?? []).map((b: any) => ({
            playerName: b.playerName ?? b.player?.name ?? '—',
            overs: `${b.overs ?? 0}.${b.balls ?? 0}`,
            maidens: b.maidens ?? 0,
            runs: b.runs ?? 0,
            wickets: b.wickets ?? 0,
            economy: b.economy ?? 0,
            wides: b.wides ?? 0,
            noBalls: b.noBalls ?? 0,
          })),
        }));
        setInnings(cards);
        if (currentInningsId) {
          const currentIndex = (data.innings ?? []).findIndex((inns: any) => inns.inningsId === currentInningsId);
          if (currentIndex >= 0) {
            setActiveInnings(currentIndex);
          }
        }
      })
      .catch(() => setError('Failed to load scorecard'))
      .finally(() => setIsLoading(false));
  }, [matchId]);

  useEffect(() => {
    loadScorecard();
  }, [loadScorecard]);

  useFocusEffect(
    useCallback(() => {
      loadScorecard();
    }, [loadScorecard]),
  );

  if (isLoading) {
    return <View style={styles.loader}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }
  if (error) {
    return <View style={styles.loader}><Text style={styles.error}>{error}</Text></View>;
  }
  if (innings.length === 0) {
    return <View style={styles.loader}><Text style={styles.emptyText}>No innings data yet</Text></View>;
  }

  const card = innings[activeInnings];

  return (
    <View style={styles.container}>
      {/* Innings tabs */}
      {innings.length > 1 && (
        <View style={styles.tabs}>
          {innings.map((inns, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.tab, activeInnings === i && styles.tabActive]}
              onPress={() => setActiveInnings(i)}
            >
              <Text style={[styles.tabText, activeInnings === i && styles.tabTextActive]}>
                {inns.battingTeamName}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Innings summary */}
        <View style={styles.inningsSummary}>
          <View style={styles.summaryTitleRow}>
            <Ionicons name="shield-outline" size={18} color={colors.primaryLight} />
            <Text style={styles.inningsTitle}>{card.battingTeamName}</Text>
          </View>
          <Text style={styles.inningsScore}>
            {card.totalRuns}/{card.wickets}
            <Text style={styles.inningsOvers}>  ({card.overs} ov)</Text>
          </Text>
        </View>

        {/* Batting */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="flash-outline" size={16} color={colors.primary} />
            <Text style={styles.sectionTitle}>Batting</Text>
          </View>
          <TableHeader cols={[
            { label: 'Batter', flex: 3, align: 'left' },
            { label: 'R' },
            { label: 'B' },
            { label: '4s' },
            { label: '6s' },
            { label: 'SR' },
          ]} />
          {card.batting.map((b, i) => (
            <View key={i} style={[styles.tableRow, i % 2 === 0 && styles.tableRowAlt]}>
              <View style={{ flex: 3 }}>
                <Text style={styles.playerName} numberOfLines={1}>{b.playerName}</Text>
                {b.isOut && b.dismissalInfo && (
                  <Text style={styles.dismissal} numberOfLines={1}>{b.dismissalInfo}</Text>
                )}
                {!b.isOut && <Text style={styles.notOut}>not out</Text>}
              </View>
              <Text style={[styles.cell, styles.cellBold]}>{b.runs}</Text>
              <Text style={styles.cell}>{b.balls}</Text>
              <Text style={styles.cell}>{b.fours}</Text>
              <Text style={[styles.cell, b.sixes > 0 && styles.cellSix]}>{b.sixes}</Text>
              <Text style={styles.cell}>{b.strikeRate.toFixed(1)}</Text>
            </View>
          ))}
          {/* Extras */}
          <View style={styles.extrasRow}>
            <Text style={styles.extrasLabel}>Extras</Text>
            <Text style={styles.extrasValue}>
              {card.extras.total} (w {card.extras.wides}, nb {card.extras.noBalls}, b {card.extras.byes}, lb {card.extras.legByes})
            </Text>
          </View>
        </View>

        {/* Bowling */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="baseball-outline" size={16} color={colors.primary} />
            <Text style={styles.sectionTitle}>Bowling</Text>
          </View>
          <TableHeader cols={[
            { label: 'Bowler', flex: 3, align: 'left' },
            { label: 'O' },
            { label: 'M' },
            { label: 'R' },
            { label: 'W' },
            { label: 'Econ' },
          ]} />
          {card.bowling.map((b, i) => (
            <View key={i} style={[styles.tableRow, i % 2 === 0 && styles.tableRowAlt]}>
              <Text style={[styles.playerName, { flex: 3 }]} numberOfLines={1}>{b.playerName}</Text>
              <Text style={styles.cell}>{b.overs}</Text>
              <Text style={styles.cell}>{b.maidens}</Text>
              <Text style={styles.cell}>{b.runs}</Text>
              <Text style={[styles.cell, b.wickets > 0 && styles.cellWicket]}>{b.wickets}</Text>
              <Text style={styles.cell}>{b.economy.toFixed(2)}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  error: {
    color: colors.error,
    fontSize: font.md,
    fontWeight: '600',
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: font.md,
  },

  // Tabs
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: font.md,
    color: colors.textMuted,
    fontWeight: '700',
  },
  tabTextActive: {
    color: colors.primary,
  },

  scroll: {
    flex: 1,
  },

  // Innings summary
  inningsSummary: {
    backgroundColor: '#1A1F36',
    paddingHorizontal: 24,
    paddingVertical: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  inningsTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.white,
  },
  inningsScore: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.white,
  },
  inningsOvers: {
    fontSize: font.sm,
    fontWeight: '500',
    color: colors.primaryLight,
  },

  // Section (glass card)
  section: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.50)',
    ...shadows.card,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: font.xs,
    fontWeight: '800',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },

  // Table rows
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  tableRowAlt: {
    backgroundColor: 'rgba(238,242,255,0.40)',
  },
  playerName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  dismissal: {
    fontSize: font.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  notOut: {
    fontSize: font.xs,
    color: '#10B981',
    fontWeight: '700',
    marginTop: 2,
  },
  cell: {
    flex: 1,
    textAlign: 'right',
    fontSize: font.sm,
    color: colors.text,
    fontWeight: '500',
  },
  cellBold: {
    fontWeight: '900',
    color: colors.primaryDark,
  },
  cellSix: {
    color: '#F59E0B',
    fontWeight: '800',
  },
  cellWicket: {
    color: '#EF4444',
    fontWeight: '900',
  },

  // Extras
  extrasRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: 'rgba(238,242,255,0.30)',
  },
  extrasLabel: {
    fontSize: font.sm,
    fontWeight: '700',
    color: colors.textSecondary,
    marginRight: spacing.sm,
  },
  extrasValue: {
    fontSize: font.sm,
    color: colors.text,
    fontWeight: '500',
  },
});
