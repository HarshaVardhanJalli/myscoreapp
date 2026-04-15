/**
 * TournamentDetailScreen — standings table + matches
 * created_by: MyCricketScoreEngine_v1
 */

import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { tournamentAPI, matchAPI } from '../../services/api';
import { Tournament, TournamentTeam, Match } from '../../types';
import { RootStackParamList } from '../../navigation';
import { colors, spacing, radius, font, shadows } from '../../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'TournamentDetail'>;
type Nav = NativeStackNavigationProp<RootStackParamList>;

const TABS = ['Standings', 'Matches'];

export default function TournamentDetailScreen({ route }: Props) {
  const { tournamentId } = route.params;
  const navigation = useNavigation<Nav>();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    Promise.all([
      tournamentAPI.get(tournamentId),
      tournamentAPI.matches(tournamentId),
    ]).then(([tRes, mRes]) => {
      setTournament(tRes.data);
      setMatches(mRes.data?.matches ?? mRes.data ?? []);
    }).catch(() => {}).finally(() => setIsLoading(false));
  }, [tournamentId]);

  if (isLoading || !tournament) {
    return <View style={styles.loader}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  const teams: TournamentTeam[] = tournament.teams ?? [];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.tournamentName}>{tournament.name}</Text>
        <View style={styles.headerMeta}>
          <View style={styles.metaPill}>
            <Text style={styles.headerMetaText}>{tournament.format.replace('_', ' ')}</Text>
          </View>
          <View style={styles.metaPill}>
            <Text style={styles.headerMetaText}>{tournament.matchType}</Text>
          </View>
          <Text style={[styles.status, tournament.status === 'ACTIVE' && styles.statusActive]}>
            {tournament.status}
          </Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {TABS.map((t, i) => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, activeTab === i && styles.tabActive]}
            onPress={() => setActiveTab(i)}
          >
            <Text style={[styles.tabText, activeTab === i && styles.tabTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 40 }}>
        {activeTab === 0 ? (
          // Standings
          <View style={styles.section}>
            {teams.length === 0 ? (
              <Text style={styles.emptyText}>No teams in this tournament yet</Text>
            ) : (
              <>
                {/* Table header */}
                <View style={styles.standingsHeader}>
                  <Text style={[styles.standingsHeaderCell, { flex: 3, textAlign: 'left' }]}>Team</Text>
                  <Text style={styles.standingsHeaderCell}>P</Text>
                  <Text style={styles.standingsHeaderCell}>W</Text>
                  <Text style={styles.standingsHeaderCell}>L</Text>
                  <Text style={styles.standingsHeaderCell}>T</Text>
                  <Text style={styles.standingsHeaderCell}>Pts</Text>
                  <Text style={styles.standingsHeaderCell}>NRR</Text>
                </View>
                {teams
                  .slice()
                  .sort((a, b) => b.points - a.points || b.nrr - a.nrr)
                  .map((t, i) => (
                    <View key={t.id} style={[styles.standingsRow, i % 2 === 0 && styles.standingsRowAlt]}>
                      <View style={{ flex: 3, flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={styles.rank}>{i + 1}</Text>
                        <Text style={styles.teamName} numberOfLines={1}>{t.team.shortName}</Text>
                      </View>
                      <Text style={styles.standingsCell}>{t.matchesPlayed}</Text>
                      <Text style={styles.standingsCell}>{t.won}</Text>
                      <Text style={styles.standingsCell}>{t.lost}</Text>
                      <Text style={styles.standingsCell}>{t.tied}</Text>
                      <Text style={[styles.standingsCell, styles.pointsCell]}>{t.points}</Text>
                      <Text style={styles.standingsCell}>{t.nrr >= 0 ? '+' : ''}{t.nrr.toFixed(3)}</Text>
                    </View>
                  ))}
              </>
            )}
          </View>
        ) : (
          // Matches
          <View style={styles.section}>
            {matches.length === 0 ? (
              <Text style={styles.emptyText}>No matches yet</Text>
            ) : (
              matches.map((m, index) => (
                <TouchableOpacity
                  key={m.id}
                  style={[styles.matchRow, index === matches.length - 1 && { borderBottomWidth: 0 }]}
                  onPress={() => navigation.navigate('MatchDetail', { matchId: m.id })}
                >
                  <View style={styles.matchRowInner}>
                    <Text style={styles.matchTeams}>
                      {m.team1.shortName} vs {m.team2.shortName}
                    </Text>
                    {m.resultDescription && (
                      <Text style={styles.matchResult} numberOfLines={1}>{m.resultDescription}</Text>
                    )}
                  </View>
                  <Text style={[
                    styles.matchStatus,
                    (m.status === 'PLAYING' || m.status === 'SECOND_INNINGS') && styles.matchStatusLive,
                  ]}>
                    {m.status === 'PLAYING' || m.status === 'SECOND_INNINGS' ? 'LIVE' : m.status}
                  </Text>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}
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

  // Header
  header: {
    backgroundColor: '#1A1F36',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 24,
  },
  tournamentName: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.white,
    marginBottom: spacing.sm,
  },
  headerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  metaPill: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  headerMetaText: {
    fontSize: font.sm,
    color: colors.primaryLight,
    fontWeight: '600',
  },
  status: {
    fontSize: font.sm,
    color: colors.primaryLight,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  statusActive: {
    color: colors.success,
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

  // Section (glass card)
  section: {
    backgroundColor: colors.surface,
    margin: spacing.md,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.50)',
    ...shadows.card,
  },
  emptyText: {
    padding: spacing.xl,
    color: colors.textSecondary,
    textAlign: 'center',
    fontSize: font.md,
  },

  // Standings
  standingsHeader: {
    flexDirection: 'row',
    backgroundColor: colors.primaryMuted,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  standingsHeaderCell: {
    flex: 1,
    textAlign: 'right',
    fontSize: font.xs,
    fontWeight: '800',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  standingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  standingsRowAlt: {
    backgroundColor: 'rgba(238,242,255,0.40)',
  },
  standingsCell: {
    flex: 1,
    textAlign: 'right',
    fontSize: font.sm,
    fontWeight: '600',
    color: colors.text,
  },
  rank: {
    fontSize: font.sm,
    color: colors.textMuted,
    width: 22,
    fontWeight: '700',
  },
  teamName: {
    fontSize: font.sm,
    fontWeight: '800',
    color: colors.text,
    flex: 1,
  },
  pointsCell: {
    color: colors.primary,
    fontWeight: '900',
  },

  // Matches
  matchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  matchRowInner: {
    flex: 1,
  },
  matchTeams: {
    fontSize: font.md,
    fontWeight: '800',
    color: colors.text,
  },
  matchResult: {
    fontSize: font.sm,
    color: colors.textSecondary,
    marginTop: 4,
  },
  matchStatus: {
    fontSize: font.xs,
    fontWeight: '800',
    color: colors.textMuted,
    marginLeft: spacing.md,
    letterSpacing: 0.5,
  },
  matchStatusLive: {
    color: '#EF4444',
  },
});
