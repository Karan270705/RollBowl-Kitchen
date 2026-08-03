import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Typography, Spacing, Radii } from '@/src/constants/theme';
import { getStatusVisual, StatusVisualConfig } from '@/src/constants/status';

export interface StatusBadgeProps {
  status?: string;
  label?: string;
  size?: 'sm' | 'md';
  showIcon?: boolean;
  style?: ViewStyle | ViewStyle[];
  textStyle?: TextStyle | TextStyle[];
  customConfig?: Partial<StatusVisualConfig>;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  label,
  size = 'md',
  showIcon = true,
  style,
  textStyle,
  customConfig,
}) => {
  const visual = getStatusVisual(status);
  const displayLabel = label || visual.label;
  const fg = customConfig?.foregroundColor || visual.foregroundColor;
  const bg = customConfig?.backgroundColor || visual.backgroundColor;
  const border = customConfig?.borderColor || visual.borderColor;
  const icon = customConfig?.icon || visual.icon;

  return (
    <View
      style={[
        styles.badge,
        size === 'sm' ? styles.badgeSm : styles.badgeMd,
        { backgroundColor: bg, borderColor: border },
        style,
      ]}
      accessibilityRole="text"
      accessibilityLabel={`Status: ${displayLabel}`}
    >
      {showIcon && icon && (
        <Ionicons
          name={icon}
          size={size === 'sm' ? 12 : 14}
          color={fg}
          style={styles.icon}
        />
      )}
      <Text
        style={[
          styles.text,
          size === 'sm' ? styles.textSm : styles.textMd,
          { color: fg },
          textStyle,
        ]}
        numberOfLines={1}
      >
        {displayLabel}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderWidth: 1,
  },
  badgeSm: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radii.sm,
  },
  badgeMd: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.base,
  },
  icon: {
    marginRight: 4,
  },
  text: {
    fontFamily: Typography.family.semiBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  textSm: {
    fontSize: 10,
  },
  textMd: {
    fontSize: 11,
  },
});
