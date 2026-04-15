import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAppDispatch, useAppSelector } from '../../store';
import { register } from '../../store/slices/authSlice';
import { AuthStackParamList } from '../../navigation';
import { colors, font, gradients, radius, shadows, spacing, typography } from '../../theme';
import { ScreenShell } from '../../components/ui';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

const showAlert = (title: string, msg: string) => {
  if (Platform.OS === 'web') {
    window.alert(msg);
  } else {
    Alert.alert(title, msg);
  }
};

export default function RegisterScreen({ navigation }: Props) {
  const dispatch = useAppDispatch();
  const { isLoading } = useAppSelector((state) => state.auth);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !username.trim() || !password) {
      showAlert('Error', 'Please fill in all fields');
      return;
    }
    if (password.length < 8) {
      showAlert('Error', 'Password must be at least 8 characters');
      return;
    }
    const result = await dispatch(register({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      username: username.trim().toLowerCase(),
      password,
    }));
    if (register.rejected.match(result)) {
      showAlert('Registration Failed', result.payload as string);
    }
  };

  return (
    <ScreenShell scroll contentStyle={styles.scroll}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Hero card */}
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>Elegant onboarding</Text>
          <Text style={styles.title}>Create your scorer profile</Text>
          <Text style={styles.subtitle}>
            Set up a cleaner, more modern scoring workspace with saved teams,
            premium match setup, and smoother live control.
          </Text>
        </View>

        <View style={{ height: 24 }} />

        {/* Form card */}
        <View style={styles.form}>
          <Text style={styles.formTitle}>Join the app</Text>
          <Text style={styles.formHint}>
            Your account unlocks teams, match history, and collaborative
            scoring flows.
          </Text>

          <View style={{ height: 20 }} />

          {[
            { key: 'name', value: name, setter: setName, placeholder: 'Full name' },
            { key: 'email', value: email, setter: setEmail, placeholder: 'Email', keyboard: 'email-address' as const },
            { key: 'username', value: username, setter: setUsername, placeholder: 'Username' },
            { key: 'password', value: password, setter: setPassword, placeholder: 'Password', secure: true },
          ].map((field) => (
            <TextInput
              key={field.key}
              style={styles.input}
              placeholder={field.placeholder}
              placeholderTextColor="#A0A8C8"
              value={field.value}
              onChangeText={field.setter}
              keyboardType={field.keyboard}
              secureTextEntry={field.secure}
              autoCapitalize="none"
            />
          ))}

          <View style={{ height: 8 }} />

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleRegister}
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
                <Text style={styles.buttonText}>Create Account</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.linkButton} onPress={() => navigation.goBack()}>
            <Text style={styles.linkText}>
              Already have an account?{' '}
              <Text style={styles.linkStrong}>Sign in</Text>
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
    lineHeight: 40,
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
