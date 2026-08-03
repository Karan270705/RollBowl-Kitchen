import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors, Typography, Spacing, Radii } from '@/src/constants/theme';

export interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  badgeCount?: number | string;
  rightAction?: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  badgeCount,
  rightAction,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.titleArea}>
        <View style={styles.row}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {badgeCount !== undefined && badgeCount !== null && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{badgeCount}</Text>
            </View>
          )}
        </View>
        {subtitle && (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>
      {rightAction && <View style={styles.rightAction}>{rightAction}</View>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
  },
  titleArea: {
    flex: 1,
    marginRight: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontFamily: Typography.family.bold,
    fontSize: Typography.size.lg,
    color: Colors.textPrimary,
  },
  subtitle: {
    fontFamily: Typography.family.regular,
    fontSize: Typography.size.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  badge: {
    backgroundColor: Colors.surfaceRaised,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radii.full,
    marginLeft: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  badgeText: {
    fontFamily: Typography.family.semiBold,
    fontSize: Typography.size.xs,
    color: Colors.textPrimary,
  },
  rightAction: {
    flexShrink: 0,
  },
});
