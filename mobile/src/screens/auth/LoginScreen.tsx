import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAppDispatch, useAppSelector } from '../../store';
import { login, googleLogin } from '../../store/slices/authSlice';
import { storeTokens, BASE_URL } from '../../services/api';
import { loadUser } from '../../store/slices/authSlice';
import { AuthStackParamList } from '../../navigation';
import { colors, font, shadows, spacing, typography } from '../../theme';
import { ScreenShell } from '../../components/ui';

// The backend URL used for starting the Google OAuth flow in a browser.
// After the user approves on Google, the backend redirects to myscoreapp://auth?accessToken=...
// which WebBrowser.openAuthSessionAsync intercepts and returns to the app.
const GOOGLE_START_URL = `${BASE_URL}/auth/google/start`;

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

const showAlert = (title: string, msg: string) => {
  if (Platform.OS === 'web') { window.alert(msg); }
  else { Alert.alert(title, msg); }
};

export default function LoginScreen({ navigation }: Props) {
  const dispatch = useAppDispatch();
  const { isLoading } = useAppSelector((state) => state.auth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);

  // ── Google Sign-In via backend-mediated OAuth ──────────────────────────────
  // Flow:
  //  1. Open backend's /auth/google/start in a browser tab
  //  2. Backend redirects to Google consent screen
  //  3. User approves → Google redirects to backend callback
  //  4. Backend issues JWT and redirects to myscoreapp://auth?accessToken=...
  //  5. WebBrowser detects the myscoreapp:// deep link, closes, and returns the URL
  //  6. We extract the tokens from the URL and log the user in
  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const result = await WebBrowser.openAuthSessionAsync(GOOGLE_START_URL, 'myscoreapp://');

      if (result.type !== 'success') {
        // User cancelled or browser was dismissed
        return;
      }

      const url = result.url;
      const params = new URL(url).searchParams;
      const error = params.get('error');
      const accessToken = params.get('accessToken');
      const refreshToken = params.get('refreshToken');

      if (error || !accessToken || !refreshToken) {
        showAlert('Sign-In Failed', error ?? 'Could not get tokens from Google');
        return;
      }

      await storeTokens(accessToken, refreshToken);
      await dispatch(loadUser());
    } catch (err: any) {
      showAlert('Error', err?.message ?? 'Google sign-in failed');
    } finally {
      setGoogleLoading(false);
    }
  };

  // ── Email / password login ─────────────────────────────────────────────────
  const handleLogin = async () => {
    if (!email.trim() || !password) {
      showAlert('Error', 'Please fill in all fields');
      return;
    }
    const result = await dispatch(login({ email: email.trim().toLowerCase(), password }));
    if (login.rejected.match(result)) {
      showAlert('Login Failed', result.payload as string);
    }
  };

  const isAnyLoading = isLoading || googleLoading;

  return (
    <ScreenShell scroll contentStyle={styles.scroll}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

        {/* Hero card */}
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>Beautiful live scoring</Text>
          <Text style={styles.title}>My Cricket Score</Text>
          <Text style={styles.subtitle}>
            Elegant match setup, sleek scoreboards, and a smoother scorer
            workflow from first tap to final ball.
          </Text>
        </View>

        <View style={{ height: 24 }} />

        {/* Form card */}
        <View style={styles.form}>
          <Text style={styles.formTitle}>Sign In</Text>
          <Text style={styles.formHint}>
            Welcome back. Pick up right where your last match left off.
          </Text>

          <View style={{ height: 20 }} />

          {/* Google Sign-In button */}
          <TouchableOpacity
            style={[styles.googleButton, isAnyLoading && styles.buttonDisabled]}
            onPress={handleGoogleSignIn}
            disabled={isAnyLoading}
            activeOpacity={0.85}
          >
            {googleLoading ? (
              <ActivityIndicator color="#1A1F36" />
            ) : (
              <View style={styles.googleInner}>
                <GoogleIcon />
                <Text style={styles.googleText}>Continue with Google</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerLabel}>or sign in with email</Text>
            <View style={styles.dividerLine} />
          </View>

          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#A0A8C8"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#A0A8C8"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <View style={{ height: 8 }} />

          <TouchableOpacity
            style={[styles.button, isAnyLoading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={isAnyLoading}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={['#FCE7F3', '#EDE9FE', '#DBEAFE'] as any}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.buttonFill}
            >
              {isLoading && !googleLoading ? (
                <ActivityIndicator color="#6366F1" />
              ) : (
                <Text style={styles.buttonText}>Sign In</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.linkButton} onPress={() => navigation.navigate('Register')}>
            <Text style={styles.linkText}>
              Don&apos;t have an account?{' '}
              <Text style={styles.linkStrong}>Create one</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </ScreenShell>
  );
}

function GoogleIcon() {
  return (
    <View style={gStyles.wrap}>
      <Text style={gStyles.g}>G</Text>
    </View>
  );
}
const gStyles = StyleSheet.create({
  wrap: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
    marginRight: 10,
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 }, elevation: 1,
  },
  g: { fontSize: 14, fontWeight: '800', color: '#4285F4', lineHeight: 18 },
});

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1, justifyContent: 'center',
    padding: spacing.lg, paddingVertical: 40,
  },

  hero: {
    backgroundColor: 'rgba(255,255,255,0.76)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.50)',
    borderRadius: 24, padding: 28, ...shadows.card,
  },
  eyebrow: {
    color: '#6366F1', textTransform: 'uppercase', letterSpacing: 1.4,
    fontWeight: '700', fontSize: font.xs, marginBottom: 8, fontFamily: typography.body,
  },
  title: { color: '#1A1F36', fontSize: 34, fontWeight: '900', fontFamily: typography.display },
  subtitle: { color: '#6B7394', fontSize: font.md, lineHeight: 22, marginTop: 10, fontFamily: typography.body },

  form: {
    backgroundColor: 'rgba(255,255,255,0.76)',
    borderRadius: 24, padding: 28,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.50)', ...shadows.card,
  },
  formTitle: { color: '#1A1F36', fontSize: font.xxl, fontWeight: '800', fontFamily: typography.display },
  formHint: { color: '#6B7394', lineHeight: 21, marginTop: 6, fontFamily: typography.body },

  googleButton: {
    backgroundColor: '#fff', borderRadius: 14,
    borderWidth: 1.5, borderColor: 'rgba(99,102,241,0.15)',
    paddingVertical: 14, paddingHorizontal: 20,
    alignItems: 'center', justifyContent: 'center', ...shadows.card,
  },
  googleInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  googleText: { color: '#1A1F36', fontSize: font.md, fontWeight: '700', fontFamily: typography.display },

  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 20, gap: 10 },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(99,102,241,0.10)' },
  dividerLabel: { color: '#A0A8C8', fontSize: font.xs, fontWeight: '600', fontFamily: typography.body },

  input: {
    borderWidth: 1, borderColor: 'rgba(99,102,241,0.10)',
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 16,
    backgroundColor: 'rgba(255,255,255,0.60)', color: '#1A1F36',
    fontSize: font.md, marginBottom: 16, fontFamily: typography.body,
  },

  button: { borderRadius: 9999, overflow: 'hidden', ...shadows.glow },
  buttonFill: {
    alignItems: 'center' as const, justifyContent: 'center' as const,
    paddingVertical: 14, borderRadius: 9999,
  },
  buttonDisabled: { opacity: 0.65 },
  buttonText: { color: '#1A1F36', fontSize: font.md, fontWeight: '800', fontFamily: typography.display },

  linkButton: { alignItems: 'center' as const, marginTop: 20 },
  linkText: { color: '#6B7394', fontSize: font.sm, fontFamily: typography.body },
  linkStrong: { color: '#6366F1', fontWeight: '800', fontFamily: typography.display },
});
