import React, { ReactNode } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Rect } from 'react-native-svg';
import { colors, font, gradients, radius, shadows, spacing, typography } from '../theme';

const NOISE_POINTS = Array.from({ length: 90 }, (_, index) => ({
  x: `${(index * 37) % 100}%`,
  y: `${(index * 19 + 7) % 100}%`,
  r: ((index % 3) + 1) * 0.35,
  opacity: index % 2 === 0 ? 0.18 : 0.1,
}));

function NoiseOverlay({ subtle = false }: { subtle?: boolean }) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%" preserveAspectRatio="none">
        <Rect width="100%" height="100%" fill={subtle ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.05)'} />
        {NOISE_POINTS.map((point, index) => (
          <Circle
            key={`${point.x}-${point.y}-${index}`}
            cx={point.x}
            cy={point.y}
            r={point.r}
            fill={index % 4 === 0 ? colors.grainDark : colors.grainLight}
            opacity={point.opacity}
          />
        ))}
      </Svg>
    </View>
  );
}

export function ScreenShell({
  children,
  scroll = false,
  contentStyle,
}: {
  children: ReactNode;
  scroll?: boolean;
  contentStyle?: ViewStyle;
}) {
  const body = scroll ? (
    <ScrollView contentContainerStyle={[styles.scrollContent, contentStyle]} showsVerticalScrollIndicator={false}>
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.content, contentStyle]}>{children}</View>
  );

  return (
    <LinearGradient colors={gradients.appBackground} style={styles.background}>
      <View style={styles.orbTop} />
      <View style={styles.orbBottom} />
      <NoiseOverlay />
      <SafeAreaView style={styles.safe}>{body}</SafeAreaView>
    </LinearGradient>
  );
}

export function GlassCard({
  children,
  style,
  dark = false,
}: {
  children: ReactNode;
  style?: ViewStyle;
  dark?: boolean;
}) {
  return (
    <View style={[
      styles.card,
      dark ? styles.cardDark : styles.cardLight,
      style,
    ]}>
      <NoiseOverlay subtle />
      {children}
    </View>
  );
}

export function GradientButton({
  label,
  onPress,
  accent = false,
  style,
  textStyle,
}: {
  label: string;
  onPress: () => void;
  accent?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.88} style={style}>
      <LinearGradient
        colors={accent ? gradients.accent : gradients.hero}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.button, accent ? shadows.glow : shadows.card]}
      >
        <Text style={[styles.buttonText, textStyle]}>{label}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  action,
}: {
  eyebrow?: string;
  title: string;
  action?: ReactNode;
}) {
  return (
    <View style={styles.sectionRow}>
      <View>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {action}
    </View>
  );
}

export function Pill({
  label,
  active = false,
}: {
  label: string;
  active?: boolean;
}) {
  return (
    <View style={[styles.pill, active ? styles.pillActive : styles.pillMuted]}>
      <Text style={[styles.pillText, active ? styles.pillTextActive : undefined]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1 },
  safe: { flex: 1 },
  content: { flex: 1, paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
  scrollContent: { paddingHorizontal: spacing.lg, paddingBottom: 100 },
  orbTop: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(165,180,252,0.18)',
    top: -40,
    right: -60,
  },
  orbBottom: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(236,72,153,0.10)',
    bottom: -60,
    left: -80,
  },
  card: {
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: spacing.lg,
    overflow: 'hidden',
  },
  cardLight: {
    backgroundColor: colors.surface,
    borderColor: 'rgba(255,255,255,0.50)',
    ...shadows.card,
  },
  cardDark: {
    backgroundColor: 'rgba(255,255,255,0.68)',
    borderColor: 'rgba(255,255,255,0.36)',
    ...shadows.card,
  },
  button: {
    borderRadius: radius.full,
    paddingHorizontal: spacing.xl,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: colors.primaryDark,
    fontSize: font.md,
    fontWeight: '800',
    letterSpacing: 0.4,
    fontFamily: typography.display,
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: spacing.md,
  },
  eyebrow: {
    color: colors.textMuted,
    textTransform: 'uppercase',
    fontSize: font.xs,
    fontWeight: '700',
    marginBottom: 2,
    letterSpacing: 1.2,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: font.xl,
    fontWeight: '800',
    fontFamily: typography.display,
  },
  pill: {
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: 7,
    borderRadius: radius.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  pillMuted: {
    backgroundColor: 'rgba(255,255,255,0.48)',
    borderColor: colors.border,
  },
  pillActive: {
    backgroundColor: 'rgba(238,242,255,0.90)',
    borderColor: 'rgba(99,102,241,0.16)',
  },
  pillText: {
    color: colors.textSecondary,
    fontSize: font.xs,
    fontWeight: '700',
    fontFamily: typography.body,
  },
  pillTextActive: {
    color: colors.primary,
  },
});
