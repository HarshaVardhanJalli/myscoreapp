/**
 * TournamentListScreen
 * created_by: MyCricketScoreEngine_v1
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator, Modal, TextInput, Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { tournamentAPI } from '../../services/api';
import { Tournament } from '../../types';
import { RootStackParamList } from '../../navigation';
import { colors, spacing, radius, font, shadows } from '../../theme';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const FORMAT_COLORS: Record<string, string> = {
  LEAGUE: '#3B82F6', KNOCKOUT: '#EF4444', GROUP_KNOCKOUT: '#F59E0B', ROUND_ROBIN: '#10B981',
};

function CreateTournamentModal({ visible, onClose, onCreated }: {
  visible: boolean; onClose: () => void; onCreated: (t: Tournament) => void;
}) {
  const [name, setName] = useState('');
  const [format, setFormat] = useState('LEAGUE');
  const [loading, setLoading] = useState(false);
  const formats = ['LEAGUE', 'KNOCKOUT', 'GROUP_KNOCKOUT', 'ROUND_ROBIN'];

  async function submit() {
    if (!name.trim()) { Alert.alert('Name required'); return; }
    setLoading(true);
    try {
      const res = await tournamentAPI.create({ name: name.trim(), format, matchType: 'T20', oversPerInnings: 20, isPublic: true });
      onCreated(res.data);
      setName('');
      onClose();
    } catch { Alert.alert('Error', 'Failed to create tournament'); }
    finally { setLoading(false); }
  }

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={mStyles.overlay}>
        <View style={mStyles.sheet}>
          <View style={mStyles.handle} />
          <Text style={mStyles.title}>New Tournament</Text>
          <Text style={mStyles.label}>Name *</Text>
          <TextInput
            style={mStyles.input}
            placeholder="e.g. Summer League 2025"
            placeholderTextColor={colors.textMuted}
            value={name}
            onChangeText={setName}
          />
          <Text style={mStyles.label}>Format</Text>
          <View style={mStyles.formatRow}>
            {formats.map((f) => (
              <TouchableOpacity
                key={f}
                style={[mStyles.formatBtn, format === f && mStyles.formatBtnActive]}
                onPress={() => setFormat(f)}
              >
                <Text style={[mStyles.formatText, format === f && mStyles.formatTextActive]}>
                  {f.replace('_', ' ')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={mStyles.actions}>
            <TouchableOpacity style={mStyles.cancelBtn} onPress={onClose}>
              <Text style={mStyles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={mStyles.createBtn} onPress={submit} disabled={loading}>
              {loading ? <ActivityIndicator color={colors.white} size="small" /> : <Text style={mStyles.createText}>Create</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const mStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(26,31,54,0.40)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    paddingBottom: 44,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.50)',
    ...shadows.card,
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.textMuted,
    alignSelf: 'center',
    marginBottom: spacing.md,
    opacity: 0.5,
  },
  title: {
    fontSize: font.xl,
    fontWeight: '800',
    color: colors.text,
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: font.sm,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    letterSpacing: 0.3,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(255,255,255,0.60)',
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: font.md,
    color: colors.text,
    marginBottom: spacing.md,
  },
  formatRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  formatBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(255,255,255,0.50)',
  },
  formatBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryMuted,
  },
  formatText: {
    fontSize: font.sm,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  formatTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.50)',
  },
  cancelText: {
    color: colors.textSecondary,
    fontWeight: '700',
    fontSize: font.md,
  },
  createBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    ...shadows.glow,
  },
  createText: {
    color: colors.white,
    fontWeight: '800',
    fontSize: font.md,
  },
});

export default function TournamentListScreen() {
  const navigation = useNavigation<Nav>();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(() => {
    setIsLoading(true);
    tournamentAPI.list({ limit: 30 }).then((r) => {
      setTournaments(r.data?.tournaments ?? r.data ?? []);
    }).catch(() => {}).finally(() => setIsLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <View style={styles.container}>
      <FlatList
        data={tournaments}
        keyExtractor={(t) => t.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('TournamentDetail', { tournamentId: item.id })}
            activeOpacity={0.8}
          >
            <View style={[styles.formatBadge, { backgroundColor: FORMAT_COLORS[item.format] ?? colors.primary }]}>
              <Text style={styles.formatText}>{item.format.replace('_', ' ')}</Text>
            </View>
            <Text style={styles.tournamentName}>{item.name}</Text>
            <View style={styles.meta}>
              <Text style={styles.metaText}>{item.matchType} · {item.oversPerInnings}ov</Text>
              <Text style={[styles.status, item.status === 'ACTIVE' && styles.statusActive]}>{item.status}</Text>
            </View>
            {(item.teams?.length ?? 0) > 0 && (
              <Text style={styles.teamCount}>{item.teams!.length} teams</Text>
            )}
          </TouchableOpacity>
        )}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={load} colors={[colors.primary]} />}
        contentContainerStyle={tournaments.length === 0 ? styles.emptyContainer : { paddingBottom: 100, paddingHorizontal: spacing.lg, paddingTop: spacing.md }}
        ListEmptyComponent={
          isLoading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 60 }} /> : (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🏆</Text>
              <Text style={styles.emptyTitle}>No tournaments yet</Text>
              <Text style={styles.emptySubtext}>Tap + to create your first tournament</Text>
            </View>
          )
        }
      />
      <TouchableOpacity style={styles.fab} onPress={() => setShowCreate(true)}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
      <CreateTournamentModal
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={(t) => { setTournaments((p) => [t, ...p]); }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 20,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.50)',
    ...shadows.card,
  },
  formatBadge: {
    alignSelf: 'flex-start',
    borderRadius: radius.full,
    paddingHorizontal: 14,
    paddingVertical: 5,
    marginBottom: spacing.sm,
  },
  formatText: {
    fontSize: font.xs,
    color: colors.white,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  tournamentName: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 6,
  },
  meta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  metaText: {
    fontSize: font.sm,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  status: {
    fontSize: font.xs,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  statusActive: {
    color: colors.success,
  },
  teamCount: {
    fontSize: font.sm,
    color: colors.textMuted,
    marginTop: 6,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyContainer: {
    flexGrow: 1,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: font.lg,
    fontWeight: '800',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  emptySubtext: {
    fontSize: font.md,
    color: colors.textSecondary,
  },
  fab: {
    position: 'absolute',
    bottom: 28,
    right: 28,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.glow,
    shadowRadius: 20,
    shadowOpacity: 1,
    elevation: 6,
  },
  fabText: {
    fontSize: 32,
    color: colors.white,
    lineHeight: 36,
    fontWeight: '300',
  },
});
