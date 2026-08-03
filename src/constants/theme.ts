/**
 * RollBowl Kitchen — Dark-Only Theme Constants
 * Comprehensive dark-mode design system tokens for internal operations.
 */

export const Colors = {
  // Base - Layered Dark Charcoal Tones (Not Pure Black)
  background: '#0F1117',
  surface: '#1A1D24',
  surfaceRaised: '#242832',
  surfaceHighlight: '#2A2E39',
  surfaceElevated: '#242832',
  card: '#1A1D24',

  // Brand
  primary: '#C8102E',
  primaryPressed: '#A00C24',
  primaryMuted: 'rgba(200, 16, 46, 0.15)',
  accent: '#F5A623',
  accentMuted: 'rgba(245, 166, 35, 0.15)',
  brandBrown: '#795548',

  // Status Colors
  success: '#10B981',
  successMuted: 'rgba(16, 185, 129, 0.15)',
  warning: '#F59E0B',
  warningMuted: 'rgba(245, 158, 11, 0.15)',
  danger: '#EF4444',
  error: '#EF4444',
  errorMuted: 'rgba(239, 68, 68, 0.15)',
  info: '#3B82F6',
  infoMuted: 'rgba(59, 130, 246, 0.15)',
  secondary: '#795548',
  secondaryMuted: 'rgba(121, 85, 72, 0.15)',
  disabled: '#374151',
  transparent: 'transparent',
  white: '#FFFFFF',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#A3A8B4',
  textTertiary: '#6B7280',
  textMuted: '#6B7280',
  textInverse: '#0F1117',

  // UI Elements & Borders
  border: '#2D323E',
  borderLight: '#3F4656',
  divider: '#1E222C',
  overlay: 'rgba(15, 17, 23, 0.85)',
  focusRing: '#3B82F6',
};

export const Spacing = {
  // Direct numeric scale
  4: 4,
  8: 8,
  12: 12,
  16: 16,
  20: 20,
  24: 24,
  32: 32,
  40: 40,
  48: 48,

  // Alias scale for backward compatibility
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
  '5xl': 64,
};

export const Radii = {
  // Requested scale
  small: 4,
  medium: 8,
  large: 12,
  extraLarge: 16,
  pill: 9999,

  // Alias scale for backward compatibility
  none: 0,
  sm: 4,
  base: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const Typography = {
  family: {
    regular: 'Inter_400Regular',
    medium: 'Inter_500Medium',
    semiBold: 'Inter_600SemiBold',
    bold: 'Inter_700Bold',
  },
  size: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
  },
  lineHeight: {
    none: 1,
    tight: 1.25,
    base: 1.5,
    relaxed: 1.75,
    '2xl': 2.0,
  },
  // Semantic presets
  presets: {
    display: {
      fontFamily: 'Inter_700Bold',
      fontSize: 30,
      lineHeight: 36,
      color: Colors.textPrimary,
    },
    heading1: {
      fontFamily: 'Inter_700Bold',
      fontSize: 24,
      lineHeight: 30,
      color: Colors.textPrimary,
    },
    heading2: {
      fontFamily: 'Inter_600SemiBold',
      fontSize: 20,
      lineHeight: 26,
      color: Colors.textPrimary,
    },
    heading3: {
      fontFamily: 'Inter_600SemiBold',
      fontSize: 18,
      lineHeight: 24,
      color: Colors.textPrimary,
    },
    body: {
      fontFamily: 'Inter_400Regular',
      fontSize: 16,
      lineHeight: 24,
      color: Colors.textPrimary,
    },
    bodyMedium: {
      fontFamily: 'Inter_500Medium',
      fontSize: 16,
      lineHeight: 24,
      color: Colors.textPrimary,
    },
    bodySmall: {
      fontFamily: 'Inter_400Regular',
      fontSize: 14,
      lineHeight: 20,
      color: Colors.textSecondary,
    },
    caption: {
      fontFamily: 'Inter_400Regular',
      fontSize: 12,
      lineHeight: 16,
      color: Colors.textMuted,
    },
    label: {
      fontFamily: 'Inter_500Medium',
      fontSize: 12,
      lineHeight: 16,
      color: Colors.textSecondary,
      textTransform: 'uppercase' as const,
      letterSpacing: 0.5,
    },
    button: {
      fontFamily: 'Inter_600SemiBold',
      fontSize: 16,
      lineHeight: 20,
      color: Colors.textPrimary,
    },
    numericEmphasis: {
      fontFamily: 'Inter_700Bold',
      fontSize: 24,
      lineHeight: 28,
      color: Colors.textPrimary,
      fontVariant: ['tabular-nums'] as const,
    },
  },
};

export const Elevation = {
  subtleCardSeparation: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 2,
  },
  floatingAction: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  modal: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 12,
  },
};

export const Shadows = {
  sm: Elevation.subtleCardSeparation,
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  glowPrimary: {
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
};

export const Motion = {
  fast: 150,
  normal: 250,
  slow: 350,
  standardEasing: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
  emphasizedEasing: 'cubic-bezier(0.2, 0.0, 0, 1)',
};
