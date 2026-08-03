import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Colors, Radii, Spacing, Shadows } from '@/src/constants/theme';

export interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  elevated?: boolean;
}

export function Card({ children, style, elevated = false }: CardProps) {
  return (
    <View
      style={[
        styles.card,
        elevated && styles.elevated,
        elevated && Shadows.md,
        style,
      ]}
    >
      {children}
    </View>
  );
}

export const AppCard = Card;

export interface CompactCardProps extends CardProps {
  noBorder?: boolean;
}

export function CompactCard({
  children,
  style,
  elevated = false,
  noBorder = false,
}: CompactCardProps) {
  return (
    <View
      style={[
        styles.compactCard,
        elevated && styles.elevated,
        elevated && Shadows.sm,
        noBorder && styles.noBorder,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.lg,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  compactCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  elevated: {
    backgroundColor: Colors.surfaceElevated,
    borderColor: Colors.borderLight,
  },
  noBorder: {
    borderWidth: 0,
  },
});
