/**
 * HomeScreen — dashboard: live matches, recent activity, quick actions
 * created_by: MyCricketScoreEngine_v1
 */

import React, { useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppDispatch, useAppSelector } from '../../store';
import { fetchMatches } from '../../store/slices/matchSlice';
import { RootStackParamList } from '../../navigation';
import { Match } from '../../types';
import { colors, font, gradients, radius, shadows, spacing, typography } from '../../theme';
import { GlassCard, GradientButton, Pill, ScreenShell, SectionHeading } from '../../components/ui';

type Nav = NativeStackNavigationProp<RootStackParamList>;

function MatchCard({ match, onPress }: { match: Match; onPress: () => void }) {
  const innings = match.innings ?? [];
  const inns1 = innings[0];
  const inns2 = innings[1];
  const isLive = match.status === 'PLAYING' || match.status === 'SECOND_INNINGS';

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.88}>
      <GlassCard style={styles.matchCard}>
        <View style={styles.matchMeta}>
          <Text style={styles.matchMetaText}>{match.matchType} · {match.oversPerInnings} overs</Text>
          <Pill label={isLive ? 'LIVE' : match.status.replace('_', ' ')} active={isLive} />
        </View>
        <Text style={styles.matchTitle}>{match.title}</Text>
        <View style={styles.scoreRow}>
          <View style={styles.scoreCol}>
            <Text style={styles.teamCode}>{match.team1.shortName}</Text>
            <Text style={styles.scoreValue}>
              {inns1 ? `${inns1.totalRuns}/${inns1.wickets}` : 'Yet to bat'}
            </Text>
          </View>
          <Text style={styles.vs}>vs</Text>
          <View style={[styles.scoreCol, styles.scoreColRight]}>
            <Text style={styles.teamCode}>{match.team2.shortName}</Text>
            <Text style={styles.scoreValue}>
              {inns2 ? `${inns2.totalRuns}/${inns2.wickets}` : 'Yet to bat'}
            </Text>
          </View>
        </View>
        {!!match.resultDescription && <Text style={styles.result}>{match.resultDescription}</Text>}
        {!!match.venueName && <Text style={styles.venue}>{match.venueName}</Text>}
      </GlassCard>
    </TouchableOpacity>
  );
}

export default function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const dispatch = useAppDispatch();
  const { matches, isLoading } = useAppSelector((state) => state.matches);
  const { user } = useAppSelector((state) => state.auth);

  const load = useCallback(() => {
    dispatch(fetchMatches({ limit: 10 }));
  }, [dispatch]);

  useEffect(() => {
    load();
  }, [load]);

  const liveMatches = matches.filter((match) => match.status === 'PLAYING' || match.status === 'SECOND_INNINGS');
  const recentMatches = matches.filter((match) => match.status !== 'PLAYING' && match.status !== 'SECOND_INNINGS').slice(0, 4);

  return (
    <ScreenShell
      scroll
      contentStyle={styles.content}
    >
      <LinearGradient colors={gradients.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <Text style={styles.heroEyebrow}>Matchday command center</Text>
        <Text style={styles.heroTitle}>Welcome back, {user?.name?.split(' ')[0] ?? 'Scorer'}.</Text>
        <Text style={styles.heroSubtitle}>Create beautiful live score experiences with faster setup, richer context, and cleaner flow.</Text>
        <View style={styles.heroStats}>
          <GlassCard dark style={styles.statCard}>
            <Text style={styles.statValue}>{liveMatches.length}</Text>
            <Text style={styles.statLabel}>Live matches</Text>
          </GlassCard>
          <GlassCard dark style={styles.statCard}>
            <Text style={styles.statValue}>{matches.length}</Text>
            <Text style={styles.statLabel}>Tracked today</Text>
          </GlassCard>
        </View>
        <GradientButton label="Start New Match" onPress={() => navigation.navigate('NewMatch')} accent style={styles.heroButton} />
      </LinearGradient>

      <View style={styles.section}>
        <SectionHeading eyebrow="Quick launch" title="Move faster" />
        <View style={styles.quickGrid}>
          {[
            { label: 'New Match', icon: 'add-circle-outline', hint: 'Spin up a scoring flow' },
            { label: 'Teams', icon: 'people-outline', hint: 'Manage squads and rosters' },
            { label: 'Scorecards', icon: 'document-text-outline', hint: 'Review recent games' },
          ].map((item, index) => (
            <TouchableOpacity
              key={item.label}
              activeOpacity={0.88}
              onPress={() => {
                if (index === 0) navigation.navigate('NewMatch');
                if (index === 1) navigation.navigate('Main');
                if (index === 2) navigation.navigate('Main');
              }}
              style={styles.quickCardWrap}
            >
              <GlassCard style={styles.quickCard}>
                <View style={styles.quickIconWrap}>
                  <Ionicons name={item.icon} size={22} color={colors.primary} />
                </View>
                <View style={styles.quickCardBody}>
                  <Text style={styles.quickCardTitle}>{item.label}</Text>
                  <Text style={styles.quickCardHint}>{item.hint}</Text>
                </View>
              </GlassCard>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {liveMatches.length > 0 && (
        <View style={styles.section}>
          <SectionHeading eyebrow="Live" title="Happening now" />
          {liveMatches.map((match) => (
            <MatchCard key={match.id} match={match} onPress={() => navigation.navigate('MatchDetail', { matchId: match.id })} />
          ))}
        </View>
      )}

      <View style={styles.section}>
        <SectionHeading eyebrow="Recent" title="Latest scoreboards" />
        {recentMatches.length === 0 ? (
          <GlassCard style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No matches yet</Text>
            <Text style={styles.emptyText}>Your recent matches and polished scoreboards will show up here once you start scoring.</Text>
          </GlassCard>
        ) : (
          recentMatches.map((match) => (
            <MatchCard key={match.id} match={match} onPress={() => navigation.navigate('MatchDetail', { matchId: match.id })} />
          ))
        )}
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: spacing.sm,
    gap: spacing.lg,
  },

  /* ── Hero ─────────────────────────────────────────── */
  hero: {
    borderRadius: radius.xxl,
    padding: 28,
    ...shadows.card,
  },
  heroEyebrow: {
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    fontSize: font.xs,
    fontWeight: '700',
    marginBottom: spacing.sm,
    fontFamily: typography.body,
  },
  heroTitle: {
    color: colors.primaryDark,
    fontSize: font.xxxl,
    fontWeight: '900',
    lineHeight: 42,
    fontFamily: typography.display,
  },
  heroSubtitle: {
    color: colors.textMuted,
    fontSize: font.md,
    lineHeight: 22,
    marginTop: spacing.md,
    fontFamily: typography.body,
  },
  heroStats: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  statCard: {
    flex: 1,
    padding: spacing.lg,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  statValue: {
    color: colors.primaryDark,
    fontSize: font.xxl,
    fontWeight: '900',
    fontFamily: typography.display,
  },
  statLabel: {
    color: colors.textSecondary,
    marginTop: spacing.xs,
    fontSize: font.sm,
    fontWeight: '600',
    fontFamily: typography.body,
  },
  heroButton: {
    marginTop: spacing.lg,
  },

  /* ── Sections ─────────────────────────────────────── */
  section: {
    gap: spacing.md,
  },

  /* ── Quick actions ────────────────────────────────── */
  quickGrid: {
    gap: spacing.md,
  },
  quickCardWrap: {
    borderRadius: radius.xl,
  },
  quickCard: {
    padding: spacing.lg,
    borderRadius: radius.xl,
    minHeight: 90,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    backgroundColor: 'rgba(255,255,255,0.76)',
  },
  quickIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(217,228,255,0.90)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(109,124,218,0.12)',
  },
  quickCardBody: {
    flex: 1,
  },
  quickCardTitle: {
    color: colors.primaryDark,
    fontSize: font.lg,
    fontWeight: '800',
    fontFamily: typography.display,
  },
  quickCardHint: {
    color: colors.textSecondary,
    fontSize: font.sm,
    lineHeight: 19,
    marginTop: spacing.xs,
    fontFamily: typography.body,
  },

  /* ── Match cards ──────────────────────────────────── */
  matchCard: {
    padding: 20,
    marginBottom: spacing.md,
  },
  matchMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  matchMetaText: {
    color: colors.textMuted,
    fontSize: font.xs,
    textTransform: 'uppercase',
    fontWeight: '700',
    letterSpacing: 1.1,
    fontFamily: typography.body,
  },
  matchTitle: {
    color: colors.primaryDark,
    fontSize: font.lg,
    fontWeight: '800',
    marginBottom: spacing.md,
    fontFamily: typography.display,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scoreCol: {
    flex: 1,
  },
  scoreColRight: {
    alignItems: 'flex-end',
  },
  teamCode: {
    color: colors.primaryDark,
    fontSize: font.md,
    fontWeight: '800',
    fontFamily: typography.display,
  },
  scoreValue: {
    color: colors.text,
    fontSize: font.lg,
    fontWeight: '700',
    marginTop: spacing.xs,
    fontFamily: typography.body,
  },
  vs: {
    color: colors.textMuted,
    fontSize: font.md,
    fontWeight: '700',
    marginHorizontal: spacing.md,
    fontFamily: typography.body,
  },
  result: {
    color: colors.accent,
    fontSize: font.sm,
    fontWeight: '700',
    marginTop: spacing.md,
    fontFamily: typography.display,
  },
  venue: {
    color: colors.textMuted,
    fontSize: font.sm,
    marginTop: spacing.xs,
    fontFamily: typography.body,
  },

  /* ── Empty state ──────────────────────────────────── */
  emptyCard: {
    padding: spacing.lg,
  },
  emptyTitle: {
    color: colors.primaryDark,
    fontSize: font.lg,
    fontWeight: '800',
    marginBottom: spacing.sm,
    fontFamily: typography.display,
  },
  emptyText: {
    color: colors.textSecondary,
    lineHeight: 22,
    fontFamily: typography.body,
  },
});
