/**
 * MatchListScreen — paginated list of matches with status filter tabs
 * created_by: MyCricketScoreEngine_v1
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  TextInput,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppDispatch, useAppSelector } from '../../store';
import { fetchMatches } from '../../store/slices/matchSlice';
import { RootStackParamList } from '../../navigation';
import { Match } from '../../types';
import { colors, font, gradients, radius, shadows, spacing, typography } from '../../theme';
import { GlassCard, GradientButton, Pill, ScreenShell, SectionHeading } from '../../components/ui';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const TABS = [
  { label: 'All', filter: undefined },
  { label: 'Live', filter: 'PLAYING' },
  { label: 'Setup', filter: 'SETUP' },
  { label: 'Done', filter: 'COMPLETED' },
];

function deriveCompletedResult(match: Match): string | undefined {
  if (match.resultDescription) {
    return match.resultDescription;
  }
  if (match.status !== 'COMPLETED') {
    return undefined;
  }

  const innings = match.innings ?? [];
  const inns1 = innings[0];
  const inns2 = innings[1];
  if (!inns1 || !inns2) {
    return undefined;
  }

  const getTeamName = (teamId?: string) => {
    if (teamId === match.team1.id) return match.team1.name;
    if (teamId === match.team2.id) return match.team2.name;
    return 'Team';
  };

  if (inns2.totalRuns > inns1.totalRuns) {
    return `${getTeamName(inns2.battingTeamId)} won`;
  }
  if (inns1.totalRuns > inns2.totalRuns) {
    return `${getTeamName(inns1.battingTeamId)} won by ${inns1.totalRuns - inns2.totalRuns} runs`;
  }

  return 'Match tied';
}

function MatchRow({ match, onPress }: { match: Match; onPress: () => void }) {
  const isLive = match.status === 'PLAYING' || match.status === 'SECOND_INNINGS';
  const innings = match.innings ?? [];
  const inns1 = innings[0];
  const inns2 = innings[1];
  const resultText = deriveCompletedResult(match);

  return (
    <TouchableOpacity activeOpacity={0.88} onPress={onPress}>
      <GlassCard style={styles.row}>
        <View style={styles.rowTop}>
          <Text style={styles.rowMeta}>{match.matchType} · {match.oversPerInnings} overs</Text>
          <Pill label={isLive ? 'LIVE' : match.status.replace('_', ' ')} active={isLive} />
        </View>
        <Text style={styles.rowTitle} numberOfLines={1}>{match.title}</Text>
        <View style={styles.rowTeams}>
          <Text style={styles.rowTeam}>{match.team1.shortName}</Text>
          <Text style={styles.rowScore}>{inns1 ? `${inns1.totalRuns}/${inns1.wickets}` : '—'}</Text>
          <Text style={styles.rowDivider}>vs</Text>
          <Text style={styles.rowTeam}>{match.team2.shortName}</Text>
          <Text style={styles.rowScore}>{inns2 ? `${inns2.totalRuns}/${inns2.wickets}` : '—'}</Text>
        </View>
        {!!resultText && <Text style={styles.rowResult}>{resultText}</Text>}
        {!resultText && !!match.venueName && <Text style={styles.rowVenue}>{match.venueName}</Text>}
      </GlassCard>
    </TouchableOpacity>
  );
}

export default function MatchListScreen() {
  const navigation = useNavigation<Nav>();
  const dispatch = useAppDispatch();
  const { matches, isLoading } = useAppSelector((state) => state.matches);
  const [activeTab, setActiveTab] = useState(0);
  const [search, setSearch] = useState('');

  const load = useCallback(() => {
    const params: Record<string, string> = {};
    if (TABS[activeTab].filter) params.status = TABS[activeTab].filter!;
    dispatch(fetchMatches(params));
  }, [dispatch, activeTab]);

  useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const filtered = search.trim()
    ? matches.filter((match) =>
        match.title.toLowerCase().includes(search.toLowerCase()) ||
        match.team1.name.toLowerCase().includes(search.toLowerCase()) ||
        match.team2.name.toLowerCase().includes(search.toLowerCase()))
    : matches;

  return (
    <ScreenShell contentStyle={styles.container}>
      <LinearHeader />
      <View style={styles.searchWrap}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by title or team"
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <View style={styles.tabs}>
        {TABS.map((tab, index) => (
          <TouchableOpacity
            key={tab.label}
            onPress={() => setActiveTab(index)}
            style={[styles.tab, index === activeTab && styles.tabActive]}
          >
            <Text style={[styles.tabText, index === activeTab && styles.tabTextActive]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(match) => match.id}
        renderItem={({ item }) => (
          <MatchRow match={item} onPress={() => navigation.navigate('MatchDetail', { matchId: item.id })} />
        )}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={<SectionHeading eyebrow="Match flow" title="All scoreboards" />}
        ListEmptyComponent={
          <GlassCard style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>{isLoading ? 'Loading matches...' : 'Nothing found yet'}</Text>
            <Text style={styles.emptyText}>
              Create a new match to start the redesigned scoring experience.
            </Text>
            <GradientButton label="Create Match" onPress={() => navigation.navigate('NewMatch')} style={styles.emptyButton} />
          </GlassCard>
        }
        showsVerticalScrollIndicator={false}
      />
    </ScreenShell>
  );
}

function LinearHeader() {
  return (
    <View style={styles.headerWrap}>
      <View style={styles.headerGlow} />
      <GlassCard dark style={styles.headerCard}>
        <Text style={styles.headerEyebrow}>Curated timeline</Text>
        <Text style={styles.headerTitle}>Matches</Text>
        <Text style={styles.headerSubtitle}>Find live games, revisit finished scorecards, or jump into a new setup in seconds.</Text>
      </GlassCard>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: spacing.sm,
  },

  /* ── Header ───────────────────────────────────────── */
  headerWrap: {
    marginBottom: spacing.lg,
  },
  headerGlow: {
    position: 'absolute',
    top: -8,
    right: 18,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.glow,
  },
  headerCard: {
    padding: spacing.lg,
    backgroundColor: colors.surfaceDark,
  },
  headerEyebrow: {
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 1.4,
    fontWeight: '700',
    fontSize: font.xs,
    marginBottom: spacing.sm,
    fontFamily: typography.body,
  },
  headerTitle: {
    color: colors.textInverse,
    fontSize: font.xxxl,
    fontWeight: '900',
    fontFamily: typography.display,
  },
  headerSubtitle: {
    color: colors.textMuted,
    marginTop: spacing.sm,
    lineHeight: 22,
    fontSize: font.md,
    fontFamily: typography.body,
  },

  /* ── Search ───────────────────────────────────────── */
  searchWrap: {
    marginBottom: spacing.md,
  },
  searchInput: {
    backgroundColor: 'rgba(255,255,255,0.78)',
    borderWidth: 1,
    borderColor: colors.glassStrong,
    borderRadius: radius.full,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    color: colors.text,
    fontSize: font.md,
    ...shadows.soft,
    fontFamily: typography.body,
  },

  /* ── Tabs ─────────────────────────────────────────── */
  tabs: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.60)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabActive: {
    backgroundColor: colors.primaryDark,
    borderColor: colors.primaryDark,
  },
  tabText: {
    color: colors.textSecondary,
    fontWeight: '700',
    fontSize: font.md,
    fontFamily: typography.body,
  },
  tabTextActive: {
    color: colors.textInverse,
  },

  /* ── List ─────────────────────────────────────────── */
  listContent: {
    paddingBottom: 120,
    gap: spacing.md,
  },

  /* ── Match rows ───────────────────────────────────── */
  row: {
    padding: 20,
    marginBottom: spacing.sm,
  },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  rowMeta: {
    color: colors.textMuted,
    textTransform: 'uppercase',
    fontSize: font.xs,
    fontWeight: '700',
    letterSpacing: 1,
    fontFamily: typography.body,
  },
  rowTitle: {
    color: colors.primaryDark,
    fontSize: font.lg,
    fontWeight: '800',
    marginBottom: spacing.md,
    fontFamily: typography.display,
  },
  rowTeams: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  rowTeam: {
    color: colors.primaryDark,
    fontWeight: '800',
    fontSize: font.md,
    fontFamily: typography.display,
  },
  rowScore: {
    color: colors.text,
    fontWeight: '700',
    marginLeft: spacing.xs,
    fontSize: font.md,
    fontFamily: typography.body,
  },
  rowDivider: {
    color: colors.textMuted,
    marginHorizontal: spacing.md,
    fontWeight: '700',
    fontSize: font.md,
    fontFamily: typography.body,
  },
  rowResult: {
    color: colors.accent,
    fontWeight: '700',
    marginTop: spacing.md,
    fontSize: font.sm,
    fontFamily: typography.display,
  },
  rowVenue: {
    color: colors.textMuted,
    marginTop: spacing.md,
    fontSize: font.sm,
    fontFamily: typography.body,
  },

  /* ── Empty state ──────────────────────────────────── */
  emptyCard: {
    padding: spacing.lg,
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  emptyTitle: {
    color: colors.primaryDark,
    fontSize: font.lg,
    fontWeight: '800',
    textAlign: 'center',
    fontFamily: typography.display,
  },
  emptyText: {
    color: colors.textSecondary,
    lineHeight: 22,
    marginTop: spacing.sm,
    textAlign: 'center',
    fontFamily: typography.body,
  },
  emptyButton: {
    marginTop: spacing.lg,
  },
});
