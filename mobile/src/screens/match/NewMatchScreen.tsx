/**
 * NewMatchScreen — match creation form
 * created_by: MyCricketScoreEngine_v1
 */

import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, Switch,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAppDispatch, useAppSelector } from '../../store';
import { createMatch } from '../../store/slices/matchSlice';
import { playerAPI, teamAPI } from '../../services/api';
import { Player, Team, MatchType } from '../../types';
import { RootStackParamList } from '../../navigation';
import { colors, spacing, radius, font, shadows } from '../../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'NewMatch'>;
type TeamSetupMode = 'existing' | 'custom';
type DraftPlayer = {
  id: string;
  name: string;
  role: Player['role'];
  jerseyNumber: string;
};

const MATCH_TYPES: { label: string; value: MatchType; overs: number }[] = [
  { label: 'T10', value: 'T10', overs: 10 },
  { label: 'T20', value: 'T20', overs: 20 },
  { label: 'ODI', value: 'ODI', overs: 50 },
  { label: 'TEST', value: 'TEST', overs: 0 },
  { label: 'Custom', value: 'CUSTOM', overs: 20 },
];

const PLAYER_ROLES: Player['role'][] = ['BATSMAN', 'BOWLER', 'ALL_ROUNDER', 'WICKET_KEEPER'];

function makeDraftPlayer(): DraftPlayer {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: '',
    role: 'ALL_ROUNDER',
    jerseyNumber: '',
  };
}

function deriveShortName(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '';
  if (words.length === 1) return words[0].slice(0, 4).toUpperCase();
  return words.slice(0, 4).map((word) => word[0]).join('').toUpperCase();
}

function TeamPicker({
  label,
  teams,
  selectedId,
  onSelect,
}: {
  label: string;
  teams: Team[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = teams.find((team) => team.id === selectedId);

  return (
    <View style={pickerStyles.container}>
      <Text style={pickerStyles.label}>{label}</Text>
      <TouchableOpacity style={pickerStyles.selector} onPress={() => setOpen((current) => !current)}>
        <Text style={selected ? pickerStyles.selected : pickerStyles.placeholder}>
          {selected ? selected.name : 'Select a team'}
        </Text>
        <Text style={pickerStyles.arrow}>{open ? '▲' : '▼'}</Text>
      </TouchableOpacity>
      {open && (
        <View style={pickerStyles.dropdown}>
          {teams.length === 0 ? (
            <Text style={pickerStyles.emptyOption}>No saved teams yet</Text>
          ) : (
            teams.map((team) => (
              <TouchableOpacity
                key={team.id}
                style={[pickerStyles.option, team.id === selectedId && pickerStyles.optionSelected]}
                onPress={() => {
                  onSelect(team.id);
                  setOpen(false);
                }}
              >
                <Text style={[pickerStyles.optionText, team.id === selectedId && pickerStyles.optionTextSelected]}>
                  {team.name}
                </Text>
                <Text style={pickerStyles.optionShort}>{team.shortName}</Text>
              </TouchableOpacity>
            ))
          )}
        </View>
      )}
    </View>
  );
}

function TeamSetupCard({
  label,
  teams,
  selectedId,
  onSelectTeam,
  mode,
  onModeChange,
  customName,
  onCustomNameChange,
  customShortName,
  onCustomShortNameChange,
  customPlayers,
  onCustomPlayersChange,
}: {
  label: string;
  teams: Team[];
  selectedId: string;
  onSelectTeam: (id: string) => void;
  mode: TeamSetupMode;
  onModeChange: (mode: TeamSetupMode) => void;
  customName: string;
  onCustomNameChange: (value: string) => void;
  customShortName: string;
  onCustomShortNameChange: (value: string) => void;
  customPlayers: DraftPlayer[];
  onCustomPlayersChange: (players: DraftPlayer[]) => void;
}) {
  function updatePlayer(playerId: string, patch: Partial<DraftPlayer>) {
    onCustomPlayersChange(customPlayers.map((player) => (
      player.id === playerId ? { ...player, ...patch } : player
    )));
  }

  function removePlayer(playerId: string) {
    onCustomPlayersChange(customPlayers.filter((player) => player.id !== playerId));
  }

  function addPlayer() {
    onCustomPlayersChange([...customPlayers, makeDraftPlayer()]);
  }

  return (
    <View style={styles.teamCard}>
      <Text style={styles.teamCardTitle}>{label}</Text>
      <View style={styles.modeRow}>
        {[
          { label: 'Saved Team', value: 'existing' as const },
          { label: 'Custom Team', value: 'custom' as const },
        ].map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[styles.modeButton, mode === option.value && styles.modeButtonActive]}
            onPress={() => onModeChange(option.value)}
          >
            <Text style={[styles.modeButtonText, mode === option.value && styles.modeButtonTextActive]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {mode === 'existing' ? (
        <TeamPicker
          label={`${label} *`}
          teams={teams}
          selectedId={selectedId}
          onSelect={onSelectTeam}
        />
      ) : (
        <>
          <Text style={styles.fieldLabel}>Team Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Street Strikers"
            placeholderTextColor="#A0A8C8"
            value={customName}
            onChangeText={onCustomNameChange}
          />

          <Text style={styles.fieldLabel}>Short Name *</Text>
          <TextInput
            style={styles.input}
            placeholder={deriveShortName(customName) || 'e.g. SS'}
            placeholderTextColor="#A0A8C8"
            value={customShortName}
            onChangeText={(value) => onCustomShortNameChange(value.toUpperCase())}
            maxLength={5}
            autoCapitalize="characters"
          />

          <View style={styles.playersHeader}>
            <View>
              <Text style={styles.fieldLabel}>Players</Text>
              <Text style={styles.playersHint}>Add at least 2 players now. You can keep building the squad later.</Text>
            </View>
            <TouchableOpacity style={styles.smallActionButton} onPress={addPlayer}>
              <Text style={styles.smallActionButtonText}>+ Add Player</Text>
            </TouchableOpacity>
          </View>

          {customPlayers.length === 0 ? (
            <View style={styles.emptyPlayersCard}>
              <Text style={styles.emptyPlayersText}>No players added yet.</Text>
            </View>
          ) : (
            customPlayers.map((player, index) => (
              <View key={player.id} style={styles.playerCard}>
                <View style={styles.playerCardHeader}>
                  <Text style={styles.playerCardTitle}>Player {index + 1}</Text>
                  <TouchableOpacity onPress={() => removePlayer(player.id)}>
                    <Text style={styles.removePlayerText}>Remove</Text>
                  </TouchableOpacity>
                </View>

                <TextInput
                  style={styles.input}
                  placeholder="Player name"
                  placeholderTextColor="#A0A8C8"
                  value={player.name}
                  onChangeText={(value) => updatePlayer(player.id, { name: value })}
                />

                <TextInput
                  style={styles.input}
                  placeholder="Jersey number (optional)"
                  placeholderTextColor="#A0A8C8"
                  value={player.jerseyNumber}
                  onChangeText={(value) => updatePlayer(player.id, { jerseyNumber: value.replace(/[^0-9]/g, '') })}
                  keyboardType="number-pad"
                  maxLength={3}
                />

                <View style={styles.roleRow}>
                  {PLAYER_ROLES.map((role) => (
                    <TouchableOpacity
                      key={role}
                      style={[styles.roleButton, player.role === role && styles.roleButtonActive]}
                      onPress={() => updatePlayer(player.id, { role })}
                    >
                      <Text style={[styles.roleButtonText, player.role === role && styles.roleButtonTextActive]}>
                        {role.replace(/_/g, ' ')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))
          )}
        </>
      )}
    </View>
  );
}

const pickerStyles = StyleSheet.create({
  container: { marginBottom: 12 },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7394',
    marginBottom: 6,
  },
  selector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.10)',
    borderRadius: 14,
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.60)',
  },
  selected: { fontSize: 15, color: '#1A1F36', fontWeight: '600' },
  placeholder: { fontSize: 15, color: '#A0A8C8' },
  arrow: { fontSize: 13, color: '#A0A8C8' },
  dropdown: {
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.10)',
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.76)',
    marginTop: 6,
    overflow: 'hidden',
    ...shadows.soft,
  },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(99,102,241,0.06)',
  },
  optionSelected: { backgroundColor: '#EEF2FF' },
  optionText: { fontSize: 15, color: '#1A1F36', fontWeight: '500' },
  optionTextSelected: { color: '#6366F1', fontWeight: '700' },
  optionShort: { fontSize: 13, color: '#A0A8C8' },
  emptyOption: { padding: 16, color: '#A0A8C8', fontSize: 14 },
});

export default function NewMatchScreen({ navigation }: Props) {
  const dispatch = useAppDispatch();
  const { isLoading } = useAppSelector((state) => state.matches);
  const [teams, setTeams] = useState<Team[]>([]);
  const [title, setTitle] = useState('');
  const [venue, setVenue] = useState('');
  const [matchType, setMatchType] = useState<MatchType>('T20');
  const [overs, setOvers] = useState('20');
  const [team1Id, setTeam1Id] = useState('');
  const [team2Id, setTeam2Id] = useState('');
  const [team1Mode, setTeam1Mode] = useState<TeamSetupMode>('existing');
  const [team2Mode, setTeam2Mode] = useState<TeamSetupMode>('existing');
  const [team1Name, setTeam1Name] = useState('');
  const [team1ShortName, setTeam1ShortName] = useState('');
  const [team2Name, setTeam2Name] = useState('');
  const [team2ShortName, setTeam2ShortName] = useState('');
  const [team1Players, setTeam1Players] = useState<DraftPlayer[]>([]);
  const [team2Players, setTeam2Players] = useState<DraftPlayer[]>([]);
  const [isPublic, setIsPublic] = useState(true);
  const [teamsLoading, setTeamsLoading] = useState(true);

  useEffect(() => {
    teamAPI.list({ limit: 50 })
      .then((response) => {
        setTeams(response.data?.teams ?? response.data ?? []);
      })
      .catch(() => {})
      .finally(() => setTeamsLoading(false));
  }, []);

  function selectMatchType(nextType: typeof MATCH_TYPES[number]) {
    setMatchType(nextType.value);
    if (nextType.value === 'TEST') {
      setOvers('0');
      return;
    }
    if (nextType.value !== 'CUSTOM') {
      setOvers(String(nextType.overs));
    }
  }

  async function createTeamFromDraft(name: string, shortNameInput: string, players: DraftPlayer[]) {
    const shortName = (shortNameInput.trim() || deriveShortName(name)).toUpperCase();
    if (!name.trim()) {
      throw new Error('Team name is required');
    }
    if (shortName.length < 1 || shortName.length > 5) {
      throw new Error('Short name must be between 1 and 5 characters');
    }
    const cleanPlayers = players
      .map((player) => ({ ...player, name: player.name.trim() }))
      .filter((player) => player.name);

    if (cleanPlayers.length < 2) {
      throw new Error('Add at least 2 players for each custom team');
    }

    const teamResponse = await teamAPI.create({ name: name.trim(), shortName });
    const createdTeam = teamResponse.data as Team;

    for (const player of cleanPlayers) {
      const playerResponse = await playerAPI.create({
        name: player.name,
        role: player.role,
        jerseyNumber: player.jerseyNumber ? parseInt(player.jerseyNumber, 10) : undefined,
      });
      await teamAPI.addPlayer(createdTeam.id, { playerId: playerResponse.data.id });
    }

    setTeams((currentTeams) => [createdTeam, ...currentTeams]);
    return createdTeam.id;
  }

  async function handleCreate() {
    if (!title.trim()) {
      Alert.alert('Validation', 'Match title is required');
      return;
    }

    try {
      const resolvedTeam1Id = team1Mode === 'custom'
        ? await createTeamFromDraft(team1Name, team1ShortName, team1Players)
        : team1Id;
      const resolvedTeam2Id = team2Mode === 'custom'
        ? await createTeamFromDraft(team2Name, team2ShortName, team2Players)
        : team2Id;

      if (!resolvedTeam1Id || !resolvedTeam2Id) {
        Alert.alert('Validation', 'Please configure both teams');
        return;
      }

      if (resolvedTeam1Id === resolvedTeam2Id) {
        Alert.alert('Validation', 'Teams must be different');
        return;
      }

      const result = await dispatch(createMatch({
        title: title.trim(),
        venueName: venue.trim() || undefined,
        matchType,
        oversPerInnings: parseInt(overs, 10) || 0,
        team1Id: resolvedTeam1Id,
        team2Id: resolvedTeam2Id,
        isPublic,
      }));

      if (createMatch.fulfilled.match(result)) {
        navigation.replace('MatchDetail', { matchId: result.payload.id });
      } else {
        Alert.alert('Error', (result.payload as string) || 'Failed to create match');
      }
    } catch (error: any) {
      Alert.alert('Setup Error', error?.message || 'Failed to prepare teams');
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.fieldLabel}>Match Title *</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. DLF vs RCB — Quarter Final"
        placeholderTextColor="#A0A8C8"
        value={title}
        onChangeText={setTitle}
        maxLength={100}
      />

      <Text style={styles.fieldLabel}>Venue</Text>
      <TextInput
        style={styles.input}
        placeholder="Ground name (optional)"
        placeholderTextColor="#A0A8C8"
        value={venue}
        onChangeText={setVenue}
      />

      <Text style={styles.fieldLabel}>Match Format *</Text>
      <View style={styles.typeRow}>
        {MATCH_TYPES.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[styles.typeButton, matchType === option.value && styles.typeButtonActive]}
            onPress={() => selectMatchType(option)}
          >
            <Text style={[styles.typeButtonText, matchType === option.value && styles.typeButtonTextActive]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.fieldLabel}>Overs per Innings *</Text>
      <TextInput
        style={[styles.input, matchType !== 'CUSTOM' && matchType !== 'TEST' && styles.inputDisabled]}
        value={overs}
        onChangeText={setOvers}
        keyboardType="number-pad"
        editable={matchType === 'CUSTOM' || matchType === 'TEST'}
        placeholder="Overs"
        placeholderTextColor="#A0A8C8"
      />

      {teamsLoading ? (
        <ActivityIndicator color="#6366F1" style={{ marginVertical: 20 }} />
      ) : (
        <>
          <TeamSetupCard
            label="Team 1"
            teams={teams}
            selectedId={team1Id}
            onSelectTeam={setTeam1Id}
            mode={team1Mode}
            onModeChange={setTeam1Mode}
            customName={team1Name}
            onCustomNameChange={setTeam1Name}
            customShortName={team1ShortName}
            onCustomShortNameChange={setTeam1ShortName}
            customPlayers={team1Players}
            onCustomPlayersChange={setTeam1Players}
          />

          <TeamSetupCard
            label="Team 2"
            teams={teams.filter((team) => team.id !== team1Id)}
            selectedId={team2Id}
            onSelectTeam={setTeam2Id}
            mode={team2Mode}
            onModeChange={setTeam2Mode}
            customName={team2Name}
            onCustomNameChange={setTeam2Name}
            customShortName={team2ShortName}
            onCustomShortNameChange={setTeam2ShortName}
            customPlayers={team2Players}
            onCustomPlayersChange={setTeam2Players}
          />
        </>
      )}

      <View style={styles.toggleRow}>
        <View>
          <Text style={styles.toggleLabel}>Public Match</Text>
          <Text style={styles.toggleHint}>Visible to all users in the feed</Text>
        </View>
        <Switch
          value={isPublic}
          onValueChange={setIsPublic}
          trackColor={{ false: 'rgba(99,102,241,0.10)', true: '#A5B4FC' }}
          thumbColor={isPublic ? '#6366F1' : '#A0A8C8'}
        />
      </View>

      <TouchableOpacity
        style={[styles.createButton, isLoading && styles.createButtonDisabled]}
        onPress={handleCreate}
        disabled={isLoading}
      >
        {isLoading
          ? <ActivityIndicator color="#FFFFFF" />
          : <Text style={styles.createButtonText}>Create Match</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4FF' },
  content: { padding: 20, paddingBottom: 48 },

  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7394',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.10)',
    borderRadius: 14,
    padding: 16,
    fontSize: 15,
    color: '#1A1F36',
    backgroundColor: 'rgba(255,255,255,0.60)',
    marginBottom: 16,
  },
  inputDisabled: {
    backgroundColor: 'rgba(240,244,255,0.80)',
    color: '#A0A8C8',
  },

  /* ── Match type pills ── */
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  typeButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: 'rgba(99,102,241,0.10)',
    backgroundColor: 'rgba(255,255,255,0.60)',
  },
  typeButtonActive: {
    borderColor: '#6366F1',
    backgroundColor: '#EEF2FF',
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6B7394',
  },
  typeButtonTextActive: { color: '#6366F1' },

  /* ── Team setup card ── */
  teamCard: {
    backgroundColor: 'rgba(255,255,255,0.76)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.50)',
    ...shadows.soft,
  },
  teamCardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A1F36',
    marginBottom: 12,
  },

  /* ── Mode buttons ── */
  modeRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: 'rgba(99,102,241,0.10)',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.60)',
  },
  modeButtonActive: {
    borderColor: '#6366F1',
    backgroundColor: '#EEF2FF',
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6B7394',
  },
  modeButtonTextActive: { color: '#6366F1' },

  /* ── Players ── */
  playersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  playersHint: {
    fontSize: 12,
    color: '#A0A8C8',
    maxWidth: 220,
    marginTop: 2,
  },
  smallActionButton: {
    backgroundColor: '#EEF2FF',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.10)',
  },
  smallActionButtonText: {
    color: '#6366F1',
    fontWeight: '700',
    fontSize: 13,
  },
  emptyPlayersCard: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(99,102,241,0.12)',
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
  },
  emptyPlayersText: {
    color: '#A0A8C8',
    fontSize: 14,
  },

  /* ── Player card ── */
  playerCard: {
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.10)',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    backgroundColor: 'rgba(255,255,255,0.60)',
  },
  playerCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  playerCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1F36',
  },
  removePlayerText: {
    color: '#EF4444',
    fontWeight: '700',
    fontSize: 13,
  },

  /* ── Role pills ── */
  roleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  roleButton: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: 'rgba(99,102,241,0.10)',
    backgroundColor: 'rgba(255,255,255,0.60)',
  },
  roleButtonActive: {
    borderColor: '#6366F1',
    backgroundColor: '#EEF2FF',
  },
  roleButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7394',
  },
  roleButtonTextActive: { color: '#6366F1' },

  /* ── Toggle row ── */
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.76)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.50)',
    ...shadows.soft,
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1F36',
  },
  toggleHint: {
    fontSize: 12,
    color: '#A0A8C8',
    marginTop: 3,
  },

  /* ── Create button ── */
  createButton: {
    backgroundColor: '#6366F1',
    borderRadius: 999,
    paddingVertical: 18,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginTop: 8,
    ...shadows.glow,
  },
  createButtonDisabled: { opacity: 0.6 },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },
});
