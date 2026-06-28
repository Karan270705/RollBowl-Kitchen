import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radii, Shadows } from '@/src/constants/theme';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
  accentColor: string;
  accentBg: string;
  style?: ViewStyle;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  accentColor,
  accentBg,
  style,
}: StatCardProps) {
  return (
    <View style={[styles.container, Shadows.md, style]}>
      <LinearGradient
        colors={[Colors.surfaceElevated, Colors.surface]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {/* Accent bar at top */}
        <View style={[styles.accentBar, { backgroundColor: accentColor }]} />

        <View style={styles.content}>
          {/* Icon */}
          <View style={[styles.iconContainer, { backgroundColor: accentBg }]}>
            <Ionicons name={icon} size={22} color={accentColor} />
          </View>

          {/* Value */}
          <Text style={styles.value}>{value}</Text>

          {/* Title */}
          <Text style={styles.title}>{title}</Text>

          {/* Subtitle */}
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: Radii.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  gradient: {
    borderRadius: Radii.lg,
  },
  accentBar: {
    height: 3,
    borderTopLeftRadius: Radii.lg,
    borderTopRightRadius: Radii.lg,
  },
  content: {
    padding: Spacing.base,
    paddingTop: Spacing.md,
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  value: {
    fontFamily: Typography.family.bold,
    fontSize: Typography.size['2xl'],
    color: Colors.textPrimary,
    lineHeight: Typography.lineHeight['2xl'],
  },
  title: {
    fontFamily: Typography.family.medium,
    fontSize: Typography.size.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  subtitle: {
    fontFamily: Typography.family.regular,
    fontSize: Typography.size.xs,
    color: Colors.textTertiary,
    marginTop: Spacing.xs,
  },
});
