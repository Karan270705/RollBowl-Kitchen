import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { Colors, Typography, Spacing } from '@/src/constants/theme';

/**
 * Row — layout primitive for horizontal operational alignment
 */
export interface RowProps {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  justifyContent?: ViewStyle['justifyContent'];
  alignItems?: ViewStyle['alignItems'];
  spacing?: number;
}

export const Row: React.FC<RowProps> = ({
  children,
  style,
  justifyContent = 'space-between',
  alignItems = 'center',
  spacing = 0,
}) => {
  return (
    <View
      style={[
        styles.row,
        { justifyContent, alignItems, gap: spacing },
        style,
      ]}
    >
      {children}
    </View>
  );
};

/**
 * BoundedPriceColumn — right-aligned numeric column that never escapes card boundaries
 */
export interface BoundedPriceColumnProps {
  value: string | number;
  label?: string;
  style?: ViewStyle | ViewStyle[];
  textStyle?: TextStyle | TextStyle[];
}

export const BoundedPriceColumn: React.FC<BoundedPriceColumnProps> = ({
  value,
  label,
  style,
  textStyle,
}) => {
  return (
    <View style={[styles.boundedColumn, style]}>
      {label && <Text style={styles.columnLabel}>{label}</Text>}
      <Text
        style={[styles.priceText, textStyle]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.85}
      >
        {typeof value === 'number' ? `₹${value.toFixed(2)}` : value}
      </Text>
    </View>
  );
};

/**
 * FlexibleNameColumn — text column that shrinks and ellipsizes so prices stay visible
 */
export interface FlexibleNameColumnProps {
  name: string;
  subtitle?: string;
  style?: ViewStyle | ViewStyle[];
  textStyle?: TextStyle | TextStyle[];
  numberOfLines?: number;
}

export const FlexibleNameColumn: React.FC<FlexibleNameColumnProps> = ({
  name,
  subtitle,
  style,
  textStyle,
  numberOfLines = 1,
}) => {
  return (
    <View style={[styles.flexibleColumn, style]}>
      <Text
        style={[styles.nameText, textStyle]}
        numberOfLines={numberOfLines}
        ellipsizeMode="tail"
      >
        {name}
      </Text>
      {subtitle && (
        <Text
          style={styles.subtitleText}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {subtitle}
        </Text>
      )}
    </View>
  );
};

/**
 * AlignedLabelValue — clean label-value pairing for operational cards
 */
export interface AlignedLabelValueProps {
  label: string;
  value: React.ReactNode;
  orientation?: 'horizontal' | 'vertical';
  style?: ViewStyle | ViewStyle[];
}

export const AlignedLabelValue: React.FC<AlignedLabelValueProps> = ({
  label,
  value,
  orientation = 'horizontal',
  style,
}) => {
  if (orientation === 'vertical') {
    return (
      <View style={[styles.verticalPair, style]}>
        <Text style={styles.pairLabel}>{label}</Text>
        {typeof value === 'string' || typeof value === 'number' ? (
          <Text style={styles.pairValue}>{value}</Text>
        ) : (
          value
        )}
      </View>
    );
  }

  return (
    <View style={[styles.horizontalPair, style]}>
      <Text style={styles.pairLabel}>{label}</Text>
      <View style={styles.rightValueWrap}>
        {typeof value === 'string' || typeof value === 'number' ? (
          <Text style={styles.pairValue}>{value}</Text>
        ) : (
          value
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
  },
  boundedColumn: {
    flexShrink: 0,
    minWidth: 70,
    maxWidth: 110,
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginLeft: Spacing.sm,
  },
  columnLabel: {
    fontFamily: Typography.family.medium,
    fontSize: Typography.size.xs,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  priceText: {
    fontFamily: Typography.family.bold,
    fontSize: Typography.size.lg,
    color: Colors.textPrimary,
    fontVariant: ['tabular-nums'],
    textAlign: 'right',
  },
  flexibleColumn: {
    flex: 1,
    flexShrink: 1,
    marginRight: Spacing.sm,
  },
  nameText: {
    fontFamily: Typography.family.semiBold,
    fontSize: Typography.size.base,
    color: Colors.textPrimary,
  },
  subtitleText: {
    fontFamily: Typography.family.regular,
    fontSize: Typography.size.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  horizontalPair: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  verticalPair: {
    alignItems: 'flex-start',
    paddingVertical: 2,
  },
  pairLabel: {
    fontFamily: Typography.family.medium,
    fontSize: Typography.size.xs,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pairValue: {
    fontFamily: Typography.family.semiBold,
    fontSize: Typography.size.sm,
    color: Colors.textPrimary,
  },
  rightValueWrap: {
    flexShrink: 1,
    alignItems: 'flex-end',
  },
});
