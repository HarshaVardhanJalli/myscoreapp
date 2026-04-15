import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAppDispatch, useAppSelector } from '../../store';
import { login } from '../../store/slices/authSlice';
import { AuthStackParamList } from '../../navigation';
import { colors, font, gradients, radius, shadows, spacing, typography } from '../../theme';
import { ScreenShell } from '../../components/ui';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

const showAlert = (title: string, msg: string) => {
  if (Platform.OS === 'web') {
    window.alert(msg);
  } else {
    Alert.alert(title, msg);
  }
};

export default function LoginScreen({ navigation }: Props) {
  const dispatch = useAppDispatch();
  const { isLoading } = useAppSelector((state) => state.auth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

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
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={['#FCE7F3', '#EDE9FE', '#DBEAFE'] as any}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.buttonFill}
            >
              {isLoading ? (
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

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.lg,
    paddingVertical: 40,
  },

  /* Hero card — frosted glass */
  hero: {
    backgroundColor: 'rgba(255,255,255,0.76)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.50)',
    borderRadius: 24,
    padding: 28,
    ...shadows.card,
  },
  eyebrow: {
    color: '#6366F1',
    textTransform: 'uppercase',
    letterSpacing: 1.4,
    fontWeight: '700',
    fontSize: font.xs,
    marginBottom: 8,
    fontFamily: typography.body,
  },
  title: {
    color: '#1A1F36',
    fontSize: 34,
    fontWeight: '900',
    fontFamily: typography.display,
  },
  subtitle: {
    color: '#6B7394',
    fontSize: font.md,
    lineHeight: 22,
    marginTop: 10,
    fontFamily: typography.body,
  },

  /* Form card — frosted glass */
  form: {
    backgroundColor: 'rgba(255,255,255,0.76)',
    borderRadius: 24,
    padding: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.50)',
    ...shadows.card,
  },
  formTitle: {
    color: '#1A1F36',
    fontSize: font.xxl,
    fontWeight: '800',
    fontFamily: typography.display,
  },
  formHint: {
    color: '#6B7394',
    lineHeight: 21,
    marginTop: 6,
    fontFamily: typography.body,
  },

  /* Inputs */
  input: {
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.10)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: 'rgba(255,255,255,0.60)',
    color: '#1A1F36',
    fontSize: font.md,
    marginBottom: 16,
    fontFamily: typography.body,
  },

  /* Button — pill */
  button: {
    borderRadius: 9999,
    overflow: 'hidden',
    ...shadows.glow,
  },
  buttonFill: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: 14,
    borderRadius: 9999,
  },
  buttonDisabled: { opacity: 0.65 },
  buttonText: {
    color: '#1A1F36',
    fontSize: font.md,
    fontWeight: '800',
    fontFamily: typography.display,
  },

  /* Link */
  linkButton: {
    alignItems: 'center' as const,
    marginTop: 20,
  },
  linkText: {
    color: '#6B7394',
    fontSize: font.sm,
    fontFamily: typography.body,
  },
  linkStrong: {
    color: '#6366F1',
    fontWeight: '800',
    fontFamily: typography.display,
  },
});
