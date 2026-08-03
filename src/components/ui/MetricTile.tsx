import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radii, Shadows } from '@/src/constants/theme';
import { NumericTransition } from './motion';

export interface MetricTileProps {
  label: string;
  value: string | number;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  accentColor?: string;
  style?: ViewStyle | ViewStyle[];
  compact?: boolean;
}

export const MetricTile: React.FC<MetricTileProps> = ({
  label,
  value,
  subtitle,
  icon,
  accentColor = Colors.primary,
  style,
  compact = false,
}) => {
  return (
    <View
      style={[
        styles.tile,
        compact ? styles.compactTile : styles.standardTile,
        Shadows.sm,
        style,
      ]}
    >
      <View style={[styles.accentTop, { backgroundColor: accentColor }]} />
      <View style={styles.headerRow}>
        <Text style={styles.label} numberOfLines={1}>
          {label}
        </Text>
        {icon && (
          <Ionicons
            name={icon}
            size={18}
            color={accentColor}
            style={styles.icon}
          />
        )}
      </View>
      <NumericTransition value={value}>
        <Text style={styles.value} numberOfLines={1}>
          {value}
        </Text>
      </NumericTransition>
      {subtitle && (
        <Text style={styles.subtitle} numberOfLines={1}>
          {subtitle}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  tile: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  standardTile: {
    padding: Spacing.base,
  },
  compactTile: {
    padding: Spacing.md,
  },
  accentTop: {
    height: 2,
    width: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  label: {
    fontFamily: Typography.family.medium,
    fontSize: Typography.size.xs,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    flexShrink: 1,
  },
  icon: {
    marginLeft: Spacing.xs,
  },
  value: {
    fontFamily: Typography.family.bold,
    fontSize: Typography.size['2xl'],
    color: Colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  subtitle: {
    fontFamily: Typography.family.regular,
    fontSize: Typography.size.xs,
    color: Colors.textTertiary,
    marginTop: 2,
  },
});
