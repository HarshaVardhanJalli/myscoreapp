/**
 * Navigation — React Navigation stack + bottom tabs
 * created_by: MyCricketScoreEngine_v1
 *
 * UI: soft pastel glassmorphism
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useAppSelector } from '../store';
import { typography } from '../theme';

// Auth screens
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';

// Main screens
import HomeScreen from '../screens/home/HomeScreen';
import MatchListScreen from '../screens/match/MatchListScreen';
import MatchDetailScreen from '../screens/match/MatchDetailScreen';
import NewMatchScreen from '../screens/match/NewMatchScreen';
import ScoringScreen from '../screens/match/ScoringScreen';
import ScorecardScreen from '../screens/match/ScorecardScreen';
import TeamsScreen from '../screens/team/TeamsScreen';
import TeamDetailScreen from '../screens/team/TeamDetailScreen';
import TournamentListScreen from '../screens/tournament/TournamentListScreen';
import TournamentDetailScreen from '../screens/tournament/TournamentDetailScreen';
import AnalyticsScreen from '../screens/analytics/AnalyticsScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';

/* ── Pastel glassmorphism palette ─────────────────────────── */
const palette = {
  primary: '#6366F1',
  primaryDark: '#1A1F36',
  text: '#1A1F36',
  textMuted: '#A0A8C8',
  background: '#F0F4FF',
  surfaceStrong: '#FFFFFF',
  accent: '#EC4899',
  border: 'rgba(99,102,241,0.10)',
} as const;

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  Scoring: { matchId: string; inningsId: string };
  Scorecard: { matchId: string };
  MatchDetail: { matchId: string };
  NewMatch: undefined;
  TeamDetail: { teamId: string };
  TournamentDetail: { tournamentId: string };
};

export type TabParamList = {
  Home: undefined;
  Matches: undefined;
  Teams: undefined;
  Tournaments: undefined;
  Analytics: undefined;
  Settings: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();

const TAB_ICONS: Record<keyof TabParamList, { active: string; inactive: string }> = {
  Home: { active: 'home', inactive: 'home-outline' },
  Matches: { active: 'albums', inactive: 'albums-outline' },
  Teams: { active: 'people', inactive: 'people-outline' },
  Tournaments: { active: 'trophy', inactive: 'trophy-outline' },
  Analytics: { active: 'stats-chart', inactive: 'stats-chart-outline' },
  Settings: { active: 'person-circle', inactive: 'person-circle-outline' },
};

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: palette.primary,
        tabBarInactiveTintColor: palette.textMuted,
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarItemStyle: styles.tabBarItem,
        tabBarIcon: ({ color, focused }) => (
          <View style={[styles.tabIconWrap, focused && styles.tabIconWrapActive]}>
            <Ionicons
              name={focused ? TAB_ICONS[route.name as keyof TabParamList].active : TAB_ICONS[route.name as keyof TabParamList].inactive}
              size={20}
              color={color}
            />
          </View>
        ),
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Matches" component={MatchListScreen} />
      <Tab.Screen name="Teams" component={TeamsScreen} />
      <Tab.Screen name="Tournaments" component={TournamentListScreen} />
      <Tab.Screen name="Analytics" component={AnalyticsScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

export default function Navigation() {
  const { isAuthenticated, isLoading } = useAppSelector((s) => s.auth);

  if (isLoading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={palette.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer
      theme={{
        dark: false,
        colors: {
          primary: palette.primary,
          background: palette.background,
          card: palette.surfaceStrong,
          text: palette.text,
          border: palette.border,
          notification: palette.accent,
        },
      }}
    >
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: palette.background },
          headerShadowVisible: false,
          headerStyle: { backgroundColor: palette.surfaceStrong },
          headerTintColor: palette.text,
          headerTitleStyle: { fontWeight: '800', fontFamily: typography.display },
        }}
      >
        {isAuthenticated ? (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen name="Scoring" component={ScoringScreen} options={{ headerShown: true, title: 'Live Scoring' }} />
            <Stack.Screen name="Scorecard" component={ScorecardScreen} options={{ headerShown: true, title: 'Scorecard' }} />
            <Stack.Screen name="MatchDetail" component={MatchDetailScreen} options={{ headerShown: true, title: 'Match' }} />
            <Stack.Screen name="NewMatch" component={NewMatchScreen} options={{ headerShown: true, title: 'New Match' }} />
            <Stack.Screen name="TeamDetail" component={TeamDetailScreen} options={{ headerShown: true, title: 'Team' }} />
            <Stack.Screen name="TournamentDetail" component={TournamentDetailScreen} options={{ headerShown: true, title: 'Tournament' }} />
          </>
        ) : (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

/* ── Styles ────────────────────────────────────────────────── */
const styles = StyleSheet.create({
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: palette.background,
  },

  /* Frosted-glass pill tab bar */
  tabBar: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 14,
    height: 70,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderTopWidth: 0,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.55)',
    paddingTop: 8,
    paddingBottom: 8,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 8,
  },

  tabBarItem: {
    borderRadius: 24,
    marginHorizontal: 2,
  },

  tabBarLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 0,
    fontFamily: typography.body,
  },

  /* Icon container — plain by default, soft indigo pill when active */
  tabIconWrap: {
    width: 34,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconWrapActive: {
    backgroundColor: 'rgba(99,102,241,0.12)',
  },
});
