import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Colors, Spacing } from '@/src/constants/theme';

export interface DividerProps {
  orientation?: 'horizontal' | 'vertical';
  spacing?: number;
  color?: string;
  style?: ViewStyle | ViewStyle[];
}

export const Divider: React.FC<DividerProps> = ({
  orientation = 'horizontal',
  spacing = Spacing.md,
  color = Colors.divider,
  style,
}) => {
  const isHorizontal = orientation === 'horizontal';

  return (
    <View
      style={[
        isHorizontal
          ? {
              height: 1,
              width: '100%',
              marginVertical: spacing,
              backgroundColor: color,
            }
          : {
              width: 1,
              height: '100%',
              marginHorizontal: spacing,
              backgroundColor: color,
            },
        style,
      ]}
    />
  );
};
