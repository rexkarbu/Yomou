/**
 * Semantic Tri-Theme Design System Tokens
 * Strictly compliant with PRD Section 1.3 & anti-patterns-ui.md Section 4
 */

export type ThemeMode = 'light' | 'dark' | 'sepia';

export interface ThemeColors {
  surfaceBackground: string;
  surfaceRaised: string;
  surfaceOverlay: string;
  textPrimary: string;
  textSecondary: string;
  borderSubtle: string;
  borderStrong: string;
  accentPrimary: string;
  accentOnPrimary: string;
  accentPressed: string;
  statusError: string;
  statusSuccess: string;
}

export const THEME_COLORS: Record<ThemeMode, ThemeColors> = {
  light: {
    surfaceBackground: '#FFFFFF',
    surfaceRaised: '#F9FAFB',
    surfaceOverlay: '#FFFFFF',
    textPrimary: '#111827',
    textSecondary: '#4B5563',
    borderSubtle: '#E5E7EB',
    borderStrong: '#D1D5DB',
    accentPrimary: '#2563EB',
    accentOnPrimary: '#FFFFFF',
    accentPressed: '#1F54C8',
    statusError: '#DC2626',
    statusSuccess: '#15803D',
  },
  dark: {
    surfaceBackground: '#121212',
    surfaceRaised: '#1E1E1E',
    surfaceOverlay: '#242424',
    textPrimary: '#F3F4F6',
    textSecondary: '#9CA3AF',
    borderSubtle: '#27272A',
    borderStrong: '#3F3F46',
    accentPrimary: '#60A5FA',
    accentOnPrimary: '#121212',
    accentPressed: '#78B3FB',
    statusError: '#F87171',
    statusSuccess: '#22C55E',
  },
  sepia: {
    surfaceBackground: '#F4ECD8',
    surfaceRaised: '#EAE0C8',
    surfaceOverlay: '#E6DCB8',
    textPrimary: '#2D241E',
    textSecondary: '#655344',
    borderSubtle: '#DDD2B8',
    borderStrong: '#C8BCA0',
    accentPrimary: '#8B4513',
    accentOnPrimary: '#FFFFFF',
    accentPressed: '#763B10',
    statusError: '#991B1B',
    statusSuccess: '#1B5E20',
  },
};

export const SPACING = {
  space1: 4,
  space2: 8,
  space3: 12,
  space4: 16,
  space6: 24,
  space8: 32,
} as const;

export const RADIUS = {
  small: 4,
  medium: 8,
  large: 12,
  sheet: 16,
} as const;

export const TYPOGRAPHY = {
  headline: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '600' as const,
  },
  title: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600' as const,
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400' as const,
  },
  label: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500' as const,
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400' as const,
  },
} as const;

export const ELEVATION = {
  level0: 0,
  level1: 1,
  level2: 3,
  level3: 8,
} as const;
