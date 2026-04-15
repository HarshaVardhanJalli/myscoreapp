/**
 * SettingsScreen — profile, subscription, app preferences, logout
 * created_by: MyCricketScoreEngine_v1
 */

import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Alert, Switch, TextInput, Modal, ActivityIndicator,
} from 'react-native';
import { useAppDispatch, useAppSelector } from '../../store';
import { logout, updateUser } from '../../store/slices/authSlice';
import { authAPI } from '../../services/api';
import { colors, spacing, radius, font, typography } from '../../theme';

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

function SettingsRow({
  icon, label, value, onPress, rightElement, destructive,
}: {
  icon: string; label: string; value?: string;
  onPress?: () => void; rightElement?: React.ReactNode; destructive?: boolean;
}) {
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      <View style={styles.rowIconWrap}>
        <Text style={styles.rowIcon}>{icon}</Text>
      </View>
      <View style={styles.rowContent}>
        <Text style={[styles.rowLabel, destructive && styles.rowLabelDestructive]}>{label}</Text>
        {value ? <Text style={styles.rowValue}>{value}</Text> : null}
      </View>
      {rightElement ?? (onPress && <Text style={styles.chevron}>›</Text>)}
    </TouchableOpacity>
  );
}

function EditProfileModal({ visible, onClose, onSaved }: {
  visible: boolean; onClose: () => void; onSaved: (name: string) => void;
}) {
  const { user } = useAppSelector((s) => s.auth);
  const [name, setName] = useState(user?.name ?? '');
  const [loading, setLoading] = useState(false);

  async function save() {
    if (!name.trim()) { Alert.alert('Name required'); return; }
    setLoading(true);
    try {
      await authAPI.updateProfile({ name: name.trim() });
      onSaved(name.trim());
      onClose();
    } catch { Alert.alert('Error', 'Failed to update profile'); }
    finally { setLoading(false); }
  }

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={mStyles.overlay}>
        <View style={mStyles.sheet}>
          <Text style={mStyles.title}>Edit Profile</Text>
          <Text style={mStyles.label}>Display Name</Text>
          <TextInput
            style={mStyles.input}
            value={name} onChangeText={setName}
            placeholder="Your name"
            placeholderTextColor="#A0A8C8"
          />
          <View style={mStyles.actions}>
            <TouchableOpacity style={mStyles.cancelBtn} onPress={onClose}>
              <Text style={mStyles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={mStyles.saveBtn} onPress={save} disabled={loading}>
              {loading ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={mStyles.saveText}>Save</Text>}
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
  saveBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: radius.full,
    backgroundColor: '#6366F1',
    alignItems: 'center',
  },
  saveText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
    fontFamily: typography.display,
  },
});

const PLAN_COLORS: Record<string, string> = {
  FREE: '#6B7394', PRO: '#3B82F6', ELITE: '#F59E0B',
};

export default function SettingsScreen() {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((s) => s.auth);
  const [notifications, setNotifications] = useState(true);
  const [showEditProfile, setShowEditProfile] = useState(false);

  function handleLogout() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out', style: 'destructive',
        onPress: () => dispatch(logout()),
      },
    ]);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Profile card */}
      <View style={styles.profileCard}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{user?.name?.charAt(0).toUpperCase() ?? '?'}</Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{user?.name ?? '—'}</Text>
          <Text style={styles.profileEmail}>{user?.email ?? '—'}</Text>
          <Text style={styles.profileUsername}>@{user?.username ?? '—'}</Text>
        </View>
        <View style={[styles.planBadge, { backgroundColor: PLAN_COLORS[user?.plan ?? 'FREE'] }]}>
          <Text style={styles.planText}>{user?.plan ?? 'FREE'}</Text>
        </View>
      </View>

      {/* Account */}
      <SectionHeader title="Account" />
      <View style={styles.section}>
        <SettingsRow
          icon="✏️"
          label="Edit Profile"
          onPress={() => setShowEditProfile(true)}
        />
        <SettingsRow
          icon="🔑"
          label="Change Password"
          onPress={() => Alert.alert('Coming Soon', 'Password reset will be sent to your email')}
        />
        <SettingsRow
          icon="📧"
          label="Email"
          value={user?.email}
        />
      </View>

      {/* Subscription */}
      <SectionHeader title="Subscription" />
      <View style={styles.section}>
        <SettingsRow
          icon="⭐"
          label="Current Plan"
          value={user?.plan ?? 'FREE'}
        />
        {user?.plan === 'FREE' && (
          <SettingsRow
            icon="🚀"
            label="Upgrade to PRO"
            onPress={() => Alert.alert('Upgrade', 'Subscription management coming soon!')}
          />
        )}
        {user?.subscription?.currentPeriodEnd && (
          <SettingsRow
            icon="📅"
            label="Renews"
            value={new Date(user.subscription.currentPeriodEnd).toLocaleDateString()}
          />
        )}
      </View>

      {/* Preferences */}
      <SectionHeader title="Preferences" />
      <View style={styles.section}>
        <SettingsRow
          icon="🔔"
          label="Live Match Notifications"
          rightElement={
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ false: 'rgba(99,102,241,0.10)', true: '#A5B4FC' }}
              thumbColor={notifications ? '#6366F1' : '#A0A8C8'}
            />
          }
        />
      </View>

      {/* About */}
      <SectionHeader title="About" />
      <View style={styles.section}>
        <SettingsRow icon="📱" label="App Version" value="1.0.0" />
        <SettingsRow icon="🏏" label="Engine" value="MyCricketScoreEngine_v1" />
        <SettingsRow
          icon="📋"
          label="Privacy Policy"
          onPress={() => Alert.alert('Privacy Policy', 'Privacy policy will be shown here')}
        />
        <SettingsRow
          icon="📄"
          label="Terms of Service"
          onPress={() => Alert.alert('Terms', 'Terms of service will be shown here')}
        />
      </View>

      {/* Logout */}
      <View style={styles.section}>
        <SettingsRow
          icon="🚪"
          label="Sign Out"
          onPress={handleLogout}
          destructive
        />
      </View>

      <Text style={styles.footer}>
        My Cricket Score · created_by MyCricketScoreEngine_v1
      </Text>

      <EditProfileModal
        visible={showEditProfile}
        onClose={() => setShowEditProfile(false)}
        onSaved={(name) => dispatch(updateUser({ name }))}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4FF' },
  content: { paddingBottom: 40 },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1F36',
    padding: 24,
    marginBottom: 20,
  },
  avatarCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.20)',
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    fontFamily: typography.display,
  },
  profileInfo: { flex: 1 },
  profileName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: typography.display,
  },
  profileEmail: {
    fontSize: 13,
    color: '#A5B4FC',
    marginTop: 3,
    fontFamily: typography.body,
  },
  profileUsername: {
    fontSize: 12,
    color: 'rgba(165,180,252,0.70)',
    marginTop: 2,
    fontFamily: typography.body,
  },
  planBadge: {
    borderRadius: radius.full,
    paddingHorizontal: 14,
    paddingVertical: 5,
  },
  planText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '800',
    fontFamily: typography.display,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: '#A0A8C8',
    textTransform: 'uppercase',
    letterSpacing: 1.1,
    paddingHorizontal: 20,
    paddingBottom: 8,
    paddingTop: 16,
    fontFamily: typography.body,
  },
  section: {
    backgroundColor: 'rgba(255,255,255,0.76)',
    marginHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.50)',
    overflow: 'hidden',
    marginBottom: 12,
    shadowColor: 'rgba(26,31,54,0.06)',
    shadowOpacity: 1,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(99,102,241,0.06)',
  },
  rowIconWrap: {
    width: 36,
    alignItems: 'center',
  },
  rowIcon: {
    fontSize: 24,
  },
  rowContent: { flex: 1, marginLeft: 4 },
  rowLabel: {
    fontSize: 15,
    color: '#1A1F36',
    fontWeight: '600',
    fontFamily: typography.body,
  },
  rowLabelDestructive: { color: '#EF4444' },
  rowValue: {
    fontSize: 13,
    color: '#6B7394',
    marginTop: 2,
    fontFamily: typography.body,
  },
  chevron: {
    fontSize: 20,
    color: '#A0A8C8',
  },
  footer: {
    textAlign: 'center',
    fontSize: 11,
    color: '#A0A8C8',
    marginTop: 32,
    paddingBottom: 16,
    fontFamily: typography.body,
  },
});
