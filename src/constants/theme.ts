/**
 * RollBowl Kitchen — Theme Constants
 * Defines the design system tokens for the Kitchen application.
 */

export const Colors = {
  // Base - Dark Onyx / Charcoal
  background: '#0A0A0A',
  surface: '#121212',
  surfaceHighlight: '#1A1A1A',
  
  // Brand - Extracted from RollBowl Logo
  primary: '#C8102E', // Brand Red
  primaryMuted: 'rgba(200, 16, 46, 0.15)',
  accent: '#F5A623', // Brand Orange/Yellow
  accentMuted: 'rgba(245, 166, 35, 0.15)',
  brandBrown: '#795548', // From circle outline
  
  // Status
  success: '#2E7D32', // Brand Green (Healthy Choice)
  successMuted: 'rgba(46, 125, 50, 0.15)',
  warning: '#F57C00',
  warningMuted: 'rgba(245, 124, 0, 0.15)',
  error: '#C8102E',
  errorMuted: 'rgba(200, 16, 46, 0.15)',
  info: '#1565C0',
  infoMuted: 'rgba(21, 101, 192, 0.15)',
  secondary: '#795548', // Shifted secondary to brand brown
  secondaryMuted: 'rgba(121, 85, 72, 0.15)',
  transparent: 'transparent',
  white: '#FFFFFF',
  
  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#A3A3A3',
  textTertiary: '#737373',
  textInverse: '#0A0A0A',
  
  // UI Elements
  border: '#262626',
  borderLight: '#404040',
  divider: '#171717',
  overlay: 'rgba(10, 10, 10, 0.8)',
  surfaceElevated: '#171717',
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
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 24,
  xl: 32,
  '2xl': 40,
  '3xl': 48,
  '4xl': 64,
  '5xl': 80,
};

export const Radii = {
  none: 0,
  sm: 4,
  base: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
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
