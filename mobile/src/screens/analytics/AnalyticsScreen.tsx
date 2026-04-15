/**
 * AnalyticsScreen — player & team stats explorer
 * created_by: MyCricketScoreEngine_v1
 */

import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { analyticsAPI, playerAPI } from '../../services/api';
import { colors, spacing, radius, font, typography } from '../../theme';

interface PlayerStats {
  batting?: {
    matches: number; innings: number; runs: number; balls: number;
    average: number; strikeRate: number; fours: number; sixes: number;
    highScore: number; fifties: number; hundreds: number;
  };
  bowling?: {
    matches: number; innings: number; overs: number; runs: number;
    wickets: number; average: number; economy: number; bestFigures: string;
    fiveWickets: number;
  };
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <View style={statStyles.card}>
      <Text style={statStyles.value}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
      {sub && <Text style={statStyles.sub}>{sub}</Text>}
    </View>
  );
}
const statStyles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.76)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.50)',
    padding: 12,
    alignItems: 'center',
    margin: 4,
    shadowColor: 'rgba(26,31,54,0.06)',
    shadowOpacity: 1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  value: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1A1F36',
    fontFamily: typography.display,
  },
  label: {
    fontSize: 11,
    color: '#6B7394',
    textAlign: 'center',
    marginTop: 3,
    fontWeight: '600',
    fontFamily: typography.body,
  },
  sub: {
    fontSize: 11,
    color: '#A0A8C8',
    marginTop: 2,
    fontFamily: typography.body,
  },
});

export default function AnalyticsScreen() {
  const [mode, setMode] = useState<'player' | 'team'>('player');
  const [searchQuery, setSearchQuery] = useState('');
  const [players, setPlayers] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<{ id: string; name: string } | null>(null);
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [formData, setFormData] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function searchPlayers() {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const res = await playerAPI.list({ search: searchQuery.trim(), limit: 10 });
      setPlayers(res.data?.players ?? res.data ?? []);
    } catch { Alert.alert('Error', 'Search failed'); }
    finally { setIsSearching(false); }
  }

  async function loadPlayerStats(player: { id: string; name: string }) {
    setSelectedPlayer(player);
    setPlayers([]);
    setSearchQuery(player.name);
    setIsLoading(true);
    try {
      const [statsRes, formRes] = await Promise.all([
        analyticsAPI.playerStats(player.id),
        analyticsAPI.playerForm(player.id, 5),
      ]);
      setStats(statsRes.data);
      setFormData(formRes.data?.form ?? []);
    } catch { Alert.alert('Error', 'Failed to load stats'); }
    finally { setIsLoading(false); }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {/* Mode toggle */}
      <View style={styles.modeRow}>
        {(['player', 'team'] as const).map((m) => (
          <TouchableOpacity
            key={m}
            style={[styles.modeBtn, mode === m && styles.modeBtnActive]}
            onPress={() => { setMode(m); setStats(null); setSelectedPlayer(null); setSearchQuery(''); }}
          >
            <Text style={[styles.modeBtnText, mode === m && styles.modeBtnTextActive]}>
              {m === 'player' ? '👤 Player' : '👥 Team'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder={mode === 'player' ? 'Search player name...' : 'Search team name...'}
          placeholderTextColor="#A0A8C8"
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={searchPlayers}
          returnKeyType="search"
        />
        <TouchableOpacity style={styles.searchBtn} onPress={searchPlayers} disabled={isSearching}>
          {isSearching ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={styles.searchBtnText}>Search</Text>}
        </TouchableOpacity>
      </View>

      {/* Search results dropdown */}
      {players.length > 0 && (
        <View style={styles.dropdown}>
          {players.map((p) => (
            <TouchableOpacity key={p.id} style={styles.dropdownItem} onPress={() => loadPlayerStats(p)}>
              <Text style={styles.dropdownText}>{p.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {isLoading && <ActivityIndicator color="#6366F1" style={{ marginTop: 32 }} />}

      {/* Stats display */}
      {stats && selectedPlayer && (
        <View style={styles.statsContainer}>
          <Text style={styles.playerName}>{selectedPlayer.name}</Text>

          {stats.batting && (
            <View style={styles.statsSection}>
              <Text style={styles.statsSectionTitle}>Batting</Text>
              <View style={styles.statsGrid}>
                <StatCard label="Matches" value={stats.batting.matches} />
                <StatCard label="Runs" value={stats.batting.runs} />
                <StatCard label="Average" value={stats.batting.average?.toFixed(2) ?? '—'} />
                <StatCard label="Strike Rate" value={stats.batting.strikeRate?.toFixed(2) ?? '—'} />
              </View>
              <View style={styles.statsGrid}>
                <StatCard label="High Score" value={stats.batting.highScore} />
                <StatCard label="50s" value={stats.batting.fifties} />
                <StatCard label="100s" value={stats.batting.hundreds} />
                <StatCard label="6s" value={stats.batting.sixes} />
              </View>
            </View>
          )}

          {stats.bowling && (
            <View style={styles.statsSection}>
              <Text style={styles.statsSectionTitle}>Bowling</Text>
              <View style={styles.statsGrid}>
                <StatCard label="Wickets" value={stats.bowling.wickets} />
                <StatCard label="Overs" value={stats.bowling.overs} />
                <StatCard label="Economy" value={stats.bowling.economy?.toFixed(2) ?? '—'} />
                <StatCard label="Average" value={stats.bowling.average?.toFixed(2) ?? '—'} />
              </View>
              <View style={styles.statsGrid}>
                <StatCard label="Best" value={stats.bowling.bestFigures ?? '—'} />
                <StatCard label="5W" value={stats.bowling.fiveWickets} />
                <StatCard label="Runs" value={stats.bowling.runs} />
                <StatCard label="Innings" value={stats.bowling.innings} />
              </View>
            </View>
          )}

          {/* Recent form */}
          {formData.length > 0 && (
            <View style={styles.statsSection}>
              <Text style={styles.statsSectionTitle}>Recent Form (Last {formData.length})</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                {formData.map((f: any, i: number) => (
                  <View key={i} style={styles.formChip}>
                    <Text style={styles.formRuns}>{f.runs ?? f.wickets ?? '—'}</Text>
                    <Text style={styles.formLabel}>{f.runs !== undefined ? 'R' : 'W'}</Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}
        </View>
      )}

      {!stats && !isLoading && !selectedPlayer && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📊</Text>
          <Text style={styles.emptyTitle}>No stats yet</Text>
          <Text style={styles.emptyText}>Search for a player or team to view stats</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4FF' },
  content: { padding: 20, paddingBottom: 40 },
  modeRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: 'rgba(99,102,241,0.10)',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.76)',
  },
  modeBtnActive: {
    borderColor: 'rgba(99,102,241,0.20)',
    backgroundColor: '#EEF2FF',
  },
  modeBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6B7394',
    fontFamily: typography.body,
  },
  modeBtnTextActive: { color: '#6366F1' },
  searchRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.10)',
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 14,
    fontSize: 15,
    color: '#1A1F36',
    backgroundColor: 'rgba(255,255,255,0.76)',
    fontFamily: typography.body,
  },
  searchBtn: {
    backgroundColor: '#6366F1',
    borderRadius: radius.full,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
    fontFamily: typography.body,
  },
  dropdown: {
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.50)',
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: 'rgba(26,31,54,0.06)',
    shadowOpacity: 1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  dropdownItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(99,102,241,0.06)',
  },
  dropdownText: {
    fontSize: 15,
    color: '#1A1F36',
    fontFamily: typography.body,
  },
  statsContainer: { marginTop: 16 },
  playerName: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1A1F36',
    marginBottom: 16,
    fontFamily: typography.display,
  },
  statsSection: {
    backgroundColor: 'rgba(255,255,255,0.76)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.50)',
    padding: 16,
    marginBottom: 16,
    shadowColor: 'rgba(26,31,54,0.06)',
    shadowOpacity: 1,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  statsSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7394',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
    paddingLeft: 4,
    fontFamily: typography.body,
  },
  statsGrid: { flexDirection: 'row', marginBottom: 4 },
  formChip: {
    backgroundColor: '#EEF2FF',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
    marginRight: 10,
    minWidth: 56,
  },
  formRuns: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A1F36',
    fontFamily: typography.display,
  },
  formLabel: {
    fontSize: 11,
    color: '#6B7394',
    fontWeight: '600',
    marginTop: 2,
    fontFamily: typography.body,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 72,
  },
  emptyIcon: {
    fontSize: 60,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A1F36',
    marginBottom: 8,
    fontFamily: typography.display,
  },
  emptyText: {
    fontSize: 15,
    color: '#A0A8C8',
    textAlign: 'center',
    lineHeight: 22,
    fontFamily: typography.body,
  },
});
