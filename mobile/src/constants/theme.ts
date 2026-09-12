// mobile/src/constants/theme.ts
import '@/global.css';
import { Platform } from 'react-native';

/*
|--------------------------------------------------------------------------
| EXPO STARTER TOKENS (kept for backward compat with existing screens)
|--------------------------------------------------------------------------
*/
export const Colors = {
  light: {
    text: '#000000',
    background: '#ffffff',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    textSecondary: '#60646C',
  },
  dark: {
    text: '#ffffff',
    background: '#000000',
    backgroundElement: '#212225',
    backgroundSelected: '#2E3135',
    textSecondary: '#B0B4BA',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;

// mobile/src/constants/theme.ts (bottom of file — REPLACE the last block)

/*
|--------------------------------------------------------------------------
| FLUX PALETTE — mirrors the web client's CSS variables
|--------------------------------------------------------------------------
| Any screen that touches Flux domain data should use FluxColors, not
| the Expo starter Colors above.
|
| The `FluxPalette` type is a SHAPE (all string values), not a literal
| copy of the dark theme — that way FluxColors.light also satisfies it.
|--------------------------------------------------------------------------
*/
const darkPalette = {
  bgMain: '#07090e',
  bgPanel: '#0d1117',
  bgSubpanel: '#141923',
  bgCard: '#161c28',
  bgHover: '#1e2638',
  bgActive: '#252f44',

  border: '#1e2538',
  borderSubtle: 'rgba(255, 255, 255, 0.07)',

  textMain: '#e2e8f0',
  textMuted: '#94a3b8',
  textDim: '#64748b',

  accent: '#6366f1',
  accentHover: '#4f46e5',
  accentGlow: 'rgba(99, 102, 241, 0.25)',

  online: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#38bdf8',
};

const lightPalette = {
  bgMain: '#f8fafc',
  bgPanel: '#ffffff',
  bgSubpanel: '#f1f5f9',
  bgCard: '#ffffff',
  bgHover: '#e2e8f0',
  bgActive: '#cbd5e1',

  border: '#e2e8f0',
  borderSubtle: 'rgba(0, 0, 0, 0.06)',

  textMain: '#0f172a',
  textMuted: '#475569',
  textDim: '#64748b',

  accent: '#4f46e5',
  accentHover: '#4338ca',
  accentGlow: 'rgba(79, 70, 229, 0.15)',

  online: '#059669',
  warning: '#d97706',
  danger: '#dc2626',
  info: '#0284c7',
};

export type FluxPalette = typeof darkPalette;

export const FluxColors: { dark: FluxPalette; light: FluxPalette } = {
  dark: darkPalette,
  light: lightPalette,
};