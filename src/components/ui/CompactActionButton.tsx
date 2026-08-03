import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radii } from '@/src/constants/theme';
import { ButtonVariant } from './Button';

export interface CompactActionButtonProps {
  label?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle | ViewStyle[];
  textStyle?: TextStyle | TextStyle[];
  accessibilityLabel?: string;
}

export const CompactActionButton: React.FC<CompactActionButtonProps> = ({
  label,
  icon,
  onPress,
  variant = 'secondary',
  disabled = false,
  loading = false,
  style,
  textStyle,
  accessibilityLabel,
}) => {
  const isDisabled = disabled || loading;

  const handlePress = () => {
    if (isDisabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const getBgColor = () => {
    switch (variant) {
      case 'primary':
        return Colors.primary;
      case 'danger':
        return Colors.error;
      case 'success':
        return Colors.success;
      case 'outline':
        return Colors.transparent;
      case 'ghost':
        return Colors.transparent;
      default:
        return Colors.surfaceRaised;
    }
  };

  const getTextColor = () => {
    switch (variant) {
      case 'outline':
      case 'ghost':
        return Colors.primary;
      case 'secondary':
        return Colors.textPrimary;
      default:
        return Colors.white;
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        { backgroundColor: getBgColor() },
        variant === 'outline' && styles.outline,
        isDisabled && styles.disabled,
        style,
      ]}
      onPress={handlePress}
      disabled={isDisabled}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || label || 'Action'}
    >
      {loading ? (
        <ActivityIndicator size="small" color={getTextColor()} />
      ) : (
        <>
          {icon && (
            <Ionicons
              name={icon}
              size={18}
              color={getTextColor()}
              style={label ? styles.iconWithLabel : undefined}
            />
          )}
          {label && (
            <Text
              style={[
                styles.text,
                { color: getTextColor() },
                textStyle,
              ]}
              numberOfLines={1}
            >
              {label}
            </Text>
          )}
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    minHeight: 44,
    minWidth: 44,
  },
  outline: {
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  disabled: {
    opacity: 0.5,
  },
  iconWithLabel: {
    marginRight: Spacing.xs,
  },
  text: {
    fontFamily: Typography.family.semiBold,
    fontSize: Typography.size.sm,
  },
});
