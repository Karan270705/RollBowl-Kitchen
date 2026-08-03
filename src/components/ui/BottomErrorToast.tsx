import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radii } from '@/src/constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export interface BottomErrorToastProps {
  visible: boolean;
  message: string;
  onClose: () => void;
  onRetry?: () => void;
}

export const BottomErrorToast: React.FC<BottomErrorToastProps> = ({
  visible,
  message,
  onClose,
  onRetry,
}) => {
  const insets = useSafeAreaInsets();

  if (!visible || !message) return null;

  // Clean production message logic: never expose raw SQL/JSON to production
  const displayMessage = (() => {
    if (
      message.includes('22007') ||
      message.includes('invalid input syntax') ||
      message.includes('walk_in')
    ) {
      return 'Could not load walk-in sales.';
    }
    if (message.includes('fetchOrders') || message.includes('orders')) {
      return 'Could not refresh orders.';
    }
    if (message.startsWith('{') || message.includes('Error:')) {
      return 'Something went wrong while loading this section.';
    }
    return message;
  })();

  return (
    <View
      style={[
        styles.toastContainer,
        { bottom: Math.max(insets.bottom, 12) + Spacing.sm },
      ]}
      accessibilityRole="alert"
    >
      <View style={styles.iconContainer}>
        <Ionicons name="alert-circle" size={22} color="#EF4444" />
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.toastText} numberOfLines={3} ellipsizeMode="tail">
          {displayMessage}
        </Text>
      </View>
      {onRetry && (
        <TouchableOpacity
          style={styles.retryButton}
          onPress={onRetry}
          activeOpacity={0.7}
        >
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity
        style={styles.closeButton}
        onPress={onClose}
        activeOpacity={0.7}
        accessibilityLabel="Close alert"
      >
        <Ionicons name="close" size={20} color={Colors.textSecondary} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    left: Spacing.base,
    right: Spacing.base,
    backgroundColor: '#1E293B', // Dark slate surface
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
    zIndex: 1000,
  },
  iconContainer: {
    marginRight: Spacing.sm,
  },
  textContainer: {
    flex: 1,
    flexShrink: 1,
    marginRight: Spacing.sm,
  },
  toastText: {
    fontFamily: Typography.family.medium,
    fontSize: 13,
    color: Colors.textPrimary,
    lineHeight: 18,
  },
  retryButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radii.sm,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    marginRight: Spacing.xs,
  },
  retryText: {
    fontFamily: Typography.family.bold,
    fontSize: 12,
    color: '#3B82F6',
  },
  closeButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radii.sm,
  },
});
