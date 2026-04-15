/**
 * App theme — colors, spacing, typography
 * Soft pastel glassmorphism design language
 * created_by: MyCricketScoreEngine_v1
 */

import { Platform } from 'react-native';

export const colors = {
  // Primary palette - soft indigo
  primary: '#6366F1',
  primaryDark: '#1A1F36',
  primaryLight: '#A5B4FC',
  primaryMuted: '#EEF2FF',

  // Accent - soft pink
  accent: '#EC4899',
  accentLight: '#FCE7F3',
  accentStrong: '#DB2777',

  white: '#FFFFFF',
  background: '#F0F4FF',
  backgroundSoft: '#F8FAFF',
  surface: 'rgba(255,255,255,0.76)',
  surfaceStrong: '#FFFFFF',
  surfaceDark: '#1A1F36',
  glass: 'rgba(255,255,255,0.32)',
  glassStrong: 'rgba(255,255,255,0.50)',
  border: 'rgba(99,102,241,0.10)',
  borderStrong: 'rgba(99,102,241,0.18)',

  text: '#1A1F36',
  textSecondary: '#6B7394',
  textMuted: '#A0A8C8',
  textInverse: '#FFFFFF',
  textOnDark: '#F8F9FF',

  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',

  gradientStart: '#E8F0FE',
  gradientMid: '#E8E0F0',
  gradientEnd: '#F0E0EC',
  heroStart: '#F8FAFF',
  heroEnd: '#F3F0FF',
  glow: 'rgba(165,180,252,0.20)',
  shadow: 'rgba(26,31,54,0.06)',
  grainDark: 'rgba(99,102,241,0.06)',
  grainLight: 'rgba(255,255,255,0.30)',

  // ball result colours
  dot: '#CBD5E1',
  single: '#3B82F6',
  four: '#10B981',
  six: '#F59E0B',
  wide: '#F97316',
  noBall: '#EF4444',
  wicket: '#DC2626',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radius = {
  sm: 8,
  md: 14,
  lg: 20,
  xl: 24,
  xxl: 32,
  full: 999,
};

export const font = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 18,
  xl: 22,
  xxl: 28,
  xxxl: 34,
};

export const typography = {
  display: Platform.select({
    ios: 'Avenir Next',
    android: 'sans-serif-medium',
    default: 'System',
  }),
  body: Platform.select({
    ios: 'Avenir Next',
    android: 'sans-serif',
    default: 'System',
  }),
};

export const gradients = {
  appBackground: ['#E8F0FE', '#E8E0F0', '#F0E0EC'],
  hero: ['rgba(255,255,255,0.90)', 'rgba(248,250,255,0.85)', 'rgba(243,240,255,0.80)'],
  accent: ['#FCE7F3', '#EDE9FE', '#DBEAFE'],
  darkGlass: ['rgba(255,255,255,0.85)', 'rgba(248,250,255,0.70)'],
  surfaceGlow: ['rgba(255,255,255,0.95)', 'rgba(248,250,255,0.75)'],
};

export const shadows = {
  soft: {
    shadowColor: 'rgba(26,31,54,0.06)',
    shadowOpacity: 1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  card: {
    shadowColor: 'rgba(26,31,54,0.08)',
    shadowOpacity: 1,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  glow: {
    shadowColor: 'rgba(99,102,241,0.15)',
    shadowOpacity: 1,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
};
