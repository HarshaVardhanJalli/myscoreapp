/**
 * TeamDetailScreen — team roster, add player
 * created_by: MyCricketScoreEngine_v1
 */

import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Alert, Modal, TextInput, ActivityIndicator,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { teamAPI, playerAPI } from '../../services/api';
import { Team, TeamPlayer } from '../../types';
import { RootStackParamList } from '../../navigation';
import { colors, spacing, radius, font, typography } from '../../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'TeamDetail'>;

const ROLES = ['BATSMAN', 'BOWLER', 'ALL_ROUNDER', 'WICKET_KEEPER'];

function AddPlayerModal({ visible, onClose, teamId, onAdded }: {
  visible: boolean; onClose: () => void; teamId: string; onAdded: () => void;
}) {
  const [name, setName] = useState('');
  const [role, setRole] = useState('ALL_ROUNDER');
  const [jerseyNumber, setJerseyNumber] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!name.trim()) { Alert.alert('Name required'); return; }
    setLoading(true);
    try {
      const playerRes = await playerAPI.create({
        name: name.trim(),
        role,
        jerseyNumber: jerseyNumber ? parseInt(jerseyNumber, 10) : undefined,
      });
      await teamAPI.addPlayer(teamId, { playerId: playerRes.data.id });
      onAdded();
      setName(''); setJerseyNumber(''); setRole('ALL_ROUNDER');
      onClose();
    } catch {
      Alert.alert('Error', 'Failed to add player');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={mStyles.overlay}>
        <View style={mStyles.sheet}>
          <Text style={mStyles.title}>Add Player</Text>
          <Text style={mStyles.label}>Name *</Text>
          <TextInput style={mStyles.input} placeholder="Player name" placeholderTextColor="#A0A8C8" value={name} onChangeText={setName} />
          <Text style={mStyles.label}>Role</Text>
          <View style={mStyles.roleRow}>
            {ROLES.map((r) => (
              <TouchableOpacity
                key={r} style={[mStyles.roleBtn, role === r && mStyles.roleBtnActive]}
                onPress={() => setRole(r)}
              >
                <Text style={[mStyles.roleBtnText, role === r && mStyles.roleBtnTextActive]}>
                  {r.replace('_', ' ')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={mStyles.label}>Jersey Number (optional)</Text>
          <TextInput style={mStyles.input} placeholder="#" placeholderTextColor="#A0A8C8" value={jerseyNumber} onChangeText={setJerseyNumber} keyboardType="number-pad" maxLength={3} />
          <View style={mStyles.actions}>
            <TouchableOpacity style={mStyles.cancelBtn} onPress={onClose}><Text style={mStyles.cancelText}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity style={mStyles.addBtn} onPress={submit} disabled={loading}>
              {loading ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={mStyles.addText}>Add</Text>}
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
    backgroundColor: 'rgba(26,31,54,0.32)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.50)',
    padding: 24,
    paddingBottom: 40,
    shadowColor: 'rgba(26,31,54,0.06)',
    shadowOpacity: 1,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -4 },
    elevation: 3,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1A1F36',
    marginBottom: 20,
    fontFamily: typography.display,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7394',
    marginBottom: 6,
    fontFamily: typography.body,
  },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.10)',
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 14,
    fontSize: 15,
    color: '#1A1F36',
    marginBottom: 16,
    backgroundColor: 'rgba(255,255,255,0.72)',
    fontFamily: typography.body,
  },
  roleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  roleBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.10)',
    backgroundColor: 'rgba(255,255,255,0.50)',
  },
  roleBtnActive: {
    borderColor: 'rgba(99,102,241,0.20)',
    backgroundColor: '#EEF2FF',
  },
  roleBtnText: {
    fontSize: 12,
    color: '#6B7394',
    fontWeight: '600',
    fontFamily: typography.body,
  },
  roleBtnTextActive: { color: '#6366F1' },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.10)',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.62)',
  },
  cancelText: {
    color: '#6B7394',
    fontWeight: '700',
    fontSize: 15,
    fontFamily: typography.body,
  },
  addBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: radius.full,
    backgroundColor: '#6366F1',
    alignItems: 'center',
  },
  addText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
    fontFamily: typography.display,
  },
});

const ROLE_ICONS: Record<string, string> = {
  BATSMAN: '🏏', BOWLER: '⚾', ALL_ROUNDER: '⭐', WICKET_KEEPER: '🧤',
};

export default function TeamDetailScreen({ route }: Props) {
  const { teamId } = route.params;
  const [team, setTeam] = useState<Team | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddPlayer, setShowAddPlayer] = useState(false);

  const loadTeam = () => {
    setIsLoading(true);
    teamAPI.get(teamId).then((r) => setTeam(r.data)).catch(() => {}).finally(() => setIsLoading(false));
  };

  useEffect(() => { loadTeam(); }, [teamId]);

  if (isLoading || !team) {
    return <View style={styles.loader}><ActivityIndicator size="large" color="#6366F1" /></View>;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{team.shortName}</Text>
        </View>
        <Text style={styles.teamName}>{team.name}</Text>
        <Text style={styles.playerCount}>{team.players?.length ?? 0} players</Text>
      </View>

      {/* Players list */}
      <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 80 }}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Squad</Text>
            <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddPlayer(true)}>
              <Text style={styles.addBtnText}>+ Add Player</Text>
            </TouchableOpacity>
          </View>
          {(team.players ?? []).length === 0 ? (
            <View style={styles.emptyPlayers}>
              <Text style={styles.emptyText}>No players yet. Add your squad!</Text>
            </View>
          ) : (
            (team.players ?? []).map((tp: TeamPlayer) => (
              <View key={tp.id} style={styles.playerRow}>
                <View style={styles.playerMeta}>
                  <Text style={styles.roleIcon}>{ROLE_ICONS[tp.player.role] ?? '👤'}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.playerName}>
                      {tp.player.name}
                      {tp.isCaptain && <Text style={styles.badge}> (C)</Text>}
                      {tp.isViceCaptain && <Text style={styles.badge}> (VC)</Text>}
                    </Text>
                    <Text style={styles.playerRole}>{tp.player.role.replace('_', ' ')}</Text>
                  </View>
                </View>
                {tp.player.jerseyNumber !== undefined && (
                  <View style={styles.jerseyBadge}>
                    <Text style={styles.jerseyNum}>#{tp.player.jerseyNumber}</Text>
                  </View>
                )}
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <AddPlayerModal
        visible={showAddPlayer}
        onClose={() => setShowAddPlayer(false)}
        teamId={teamId}
        onAdded={loadTeam}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4FF' },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F0F4FF' },
  header: {
    backgroundColor: '#1A1F36',
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.20)',
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    fontFamily: typography.display,
  },
  teamName: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: typography.display,
  },
  playerCount: {
    fontSize: 14,
    color: '#A5B4FC',
    marginTop: 6,
    fontFamily: typography.body,
  },
  scroll: { flex: 1 },
  section: {
    backgroundColor: 'rgba(255,255,255,0.76)',
    margin: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.50)',
    overflow: 'hidden',
    shadowColor: 'rgba(26,31,54,0.06)',
    shadowOpacity: 1,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(99,102,241,0.08)',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A1F36',
    fontFamily: typography.display,
  },
  addBtn: {
    backgroundColor: '#EEF2FF',
    borderRadius: radius.full,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  addBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6366F1',
    fontFamily: typography.body,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(99,102,241,0.06)',
  },
  playerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  roleIcon: {
    fontSize: 24,
    marginRight: 14,
  },
  playerName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1F36',
    fontFamily: typography.body,
  },
  badge: {
    fontSize: 13,
    color: '#6366F1',
    fontWeight: '700',
  },
  playerRole: {
    fontSize: 12,
    color: '#6B7394',
    marginTop: 3,
    fontFamily: typography.body,
  },
  jerseyBadge: {
    backgroundColor: '#EEF2FF',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  jerseyNum: {
    fontSize: 15,
    fontWeight: '800',
    color: '#6366F1',
    fontFamily: typography.display,
  },
  emptyPlayers: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7394',
    fontFamily: typography.body,
  },
});
