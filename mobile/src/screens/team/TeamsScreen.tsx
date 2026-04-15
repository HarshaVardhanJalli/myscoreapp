/**
 * TeamsScreen — list of teams with create CTA
 * created_by: MyCricketScoreEngine_v1
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  TextInput, Alert, Modal, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { teamAPI } from '../../services/api';
import { Team } from '../../types';
import { RootStackParamList } from '../../navigation';
import { colors, font, gradients, radius, shadows, spacing, typography } from '../../theme';
import { GlassCard, GradientButton, ScreenShell, SectionHeading } from '../../components/ui';

type Nav = NativeStackNavigationProp<RootStackParamList>;

function CreateTeamModal({
  visible,
  onClose,
  onCreated,
}: {
  visible: boolean;
  onClose: () => void;
  onCreated: (team: Team) => void;
}) {
  const [name, setName] = useState('');
  const [shortName, setShortName] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!name.trim()) {
      Alert.alert('Name required');
      return;
    }
    if (!shortName.trim() || shortName.length > 4) {
      Alert.alert('Short name must be 1-4 characters');
      return;
    }
    setLoading(true);
    try {
      const response = await teamAPI.create({ name: name.trim(), shortName: shortName.trim().toUpperCase() });
      onCreated(response.data);
      setName('');
      setShortName('');
      onClose();
    } catch {
      Alert.alert('Error', 'Failed to create team');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={modalStyles.overlay}>
        <View style={modalStyles.sheet}>
          <Text style={modalStyles.title}>Create Team</Text>
          <Text style={modalStyles.label}>Team name</Text>
          <TextInput
            style={modalStyles.input}
            placeholder="Midnight Strikers"
            placeholderTextColor="#A0A8C8"
            value={name}
            onChangeText={setName}
          />
          <Text style={modalStyles.label}>Short name</Text>
          <TextInput
            style={modalStyles.input}
            placeholder="MS"
            placeholderTextColor="#A0A8C8"
            value={shortName}
            onChangeText={setShortName}
            autoCapitalize="characters"
            maxLength={4}
          />
          <View style={modalStyles.actions}>
            <TouchableOpacity style={modalStyles.cancelButton} onPress={onClose}>
              <Text style={modalStyles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={modalStyles.submitButton} onPress={submit} disabled={loading}>
              <Text style={modalStyles.submitText}>{loading ? 'Creating...' : 'Create Team'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function TeamCard({ team, onPress }: { team: Team; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.88}>
      <View style={styles.teamCard}>
        <LinearGradient colors={gradients.hero} style={styles.teamBadge}>
          <Text style={styles.teamBadgeText}>{team.shortName}</Text>
        </LinearGradient>
        <View style={styles.teamMeta}>
          <Text style={styles.teamName}>{team.name}</Text>
          <Text style={styles.teamCount}>{team._count?.players ?? team.players?.length ?? 0} players</Text>
        </View>
        <Text style={styles.teamArrow}>›</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function TeamsScreen() {
  const navigation = useNavigation<Nav>();
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(() => {
    setIsLoading(true);
    teamAPI.list({ limit: 50 })
      .then((response) => setTeams(response.data?.teams ?? response.data ?? []))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = search.trim()
    ? teams.filter((team) => team.name.toLowerCase().includes(search.toLowerCase()))
    : teams;

  return (
    <ScreenShell contentStyle={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.heroEyebrow}>Elegant roster management</Text>
        <Text style={styles.heroTitle}>Teams</Text>
        <Text style={styles.heroCopy}>Craft polished team identities, keep squads organized, and jump into detail views with less friction.</Text>
      </View>

      <View style={styles.searchWrap}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search teams"
          placeholderTextColor="#A0A8C8"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(team) => team.id}
        renderItem={({ item }) => (
          <TeamCard team={item} onPress={() => navigation.navigate('TeamDetail', { teamId: item.id })} />
        )}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <SectionHeading
            eyebrow="Squads"
            title="Your clubs"
            action={<TouchableOpacity onPress={() => setShowCreate(true)}><Text style={styles.inlineAction}>New</Text></TouchableOpacity>}
          />
        }
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator color="#6366F1" style={{ marginTop: 40 }} />
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No teams yet</Text>
              <Text style={styles.emptyText}>Create your first team to unlock the refreshed roster experience.</Text>
              <GradientButton label="Create First Team" onPress={() => setShowCreate(true)} style={styles.emptyButton} />
            </View>
          )
        }
        showsVerticalScrollIndicator={false}
      />

      <TouchableOpacity style={styles.fab} onPress={() => setShowCreate(true)} activeOpacity={0.9}>
        <LinearGradient colors={['#FCE7F3', '#EDE9FE', '#DBEAFE']} style={styles.fabInner}>
          <Text style={styles.fabText}>+</Text>
        </LinearGradient>
      </TouchableOpacity>

      <CreateTeamModal
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={(team) => setTeams((current) => [team, ...current])}
      />
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 12 },
  hero: {
    backgroundColor: 'rgba(255,255,255,0.76)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.50)',
    padding: 24,
    marginBottom: 20,
    shadowColor: 'rgba(26,31,54,0.06)',
    shadowOpacity: 1,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  heroEyebrow: {
    color: '#6366F1',
    textTransform: 'uppercase',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.3,
    marginBottom: 6,
    fontFamily: typography.body,
  },
  heroTitle: {
    color: '#1A1F36',
    fontSize: 36,
    fontWeight: '900',
    fontFamily: typography.display,
  },
  heroCopy: {
    color: '#6B7394',
    marginTop: 8,
    fontSize: 14,
    lineHeight: 22,
    fontFamily: typography.body,
  },
  searchWrap: { marginBottom: 20 },
  searchInput: {
    backgroundColor: 'rgba(255,255,255,0.78)',
    borderRadius: radius.full,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.50)',
    color: '#1A1F36',
    fontSize: 15,
    shadowColor: 'rgba(26,31,54,0.06)',
    shadowOpacity: 1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    fontFamily: typography.body,
  },
  listContent: { paddingBottom: 120 },
  inlineAction: {
    color: '#6366F1',
    fontWeight: '800',
    fontSize: 14,
    fontFamily: typography.display,
  },
  teamCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.76)',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.50)',
    padding: 20,
    marginBottom: 14,
    shadowColor: 'rgba(26,31,54,0.06)',
    shadowOpacity: 1,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  teamBadge: {
    width: 60,
    height: 60,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamBadgeText: {
    color: '#1A1F36',
    fontWeight: '900',
    fontSize: 16,
  },
  teamMeta: {
    flex: 1,
    marginLeft: 16,
  },
  teamName: {
    color: '#1A1F36',
    fontSize: 18,
    fontWeight: '800',
    fontFamily: typography.display,
  },
  teamCount: {
    color: '#6B7394',
    marginTop: 4,
    fontSize: 13,
    fontFamily: typography.body,
  },
  teamArrow: {
    color: '#A0A8C8',
    fontSize: 24,
    marginLeft: 8,
  },
  emptyCard: {
    backgroundColor: 'rgba(255,255,255,0.76)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.50)',
    padding: 28,
    marginTop: 16,
    shadowColor: 'rgba(26,31,54,0.06)',
    shadowOpacity: 1,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  emptyTitle: {
    color: '#1A1F36',
    fontSize: 20,
    fontWeight: '800',
    fontFamily: typography.display,
  },
  emptyText: {
    color: '#6B7394',
    lineHeight: 22,
    marginTop: 8,
    fontSize: 14,
    fontFamily: typography.body,
  },
  emptyButton: { marginTop: 20 },
  fab: {
    position: 'absolute',
    right: 0,
    bottom: 88,
    shadowColor: 'rgba(99,102,241,0.15)',
    shadowOpacity: 1,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  fabInner: {
    width: 66,
    height: 66,
    borderRadius: 33,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabText: {
    color: '#6366F1',
    fontSize: 36,
    lineHeight: 38,
    fontWeight: '700',
  },
});

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(26,31,54,0.32)',
    padding: 16,
  },
  sheet: {
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.50)',
    padding: 24,
    marginBottom: 16,
    shadowColor: 'rgba(26,31,54,0.06)',
    shadowOpacity: 1,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  title: {
    color: '#1A1F36',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 20,
    fontFamily: typography.display,
  },
  label: {
    color: '#6B7394',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
    fontFamily: typography.body,
  },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.10)',
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: 'rgba(255,255,255,0.72)',
    marginBottom: 16,
    color: '#1A1F36',
    fontSize: 15,
    fontFamily: typography.body,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.10)',
    backgroundColor: 'rgba(255,255,255,0.62)',
  },
  cancelText: {
    color: '#6B7394',
    fontWeight: '700',
    fontSize: 15,
    fontFamily: typography.body,
  },
  submitButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: radius.full,
    backgroundColor: '#6366F1',
  },
  submitText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
    fontFamily: typography.display,
  },
});
