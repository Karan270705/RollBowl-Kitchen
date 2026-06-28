import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing } from '@/src/constants/theme';

export default function SubscriptionsScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + Spacing.base }]}>
      <Text style={styles.screenTitle}>Subscriptions</Text>
      <View style={styles.placeholder}>
        <View style={styles.iconWrap}>
          <Ionicons name="card-outline" size={48} color={Colors.textTertiary} />
        </View>
        <Text style={styles.comingSoon}>Coming Soon</Text>
        <Text style={styles.description}>
          View active subscribers, daily reservation counts, and manage subscription fulfillment by date.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: Spacing.base,
  },
  screenTitle: {
    fontFamily: Typography.family.bold,
    fontSize: Typography.size.xl,
    color: Colors.textPrimary,
    marginBottom: Spacing.xl,
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: Spacing['5xl'],
  },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.lg,
  },
  comingSoon: {
    fontFamily: Typography.family.semiBold,
    fontSize: Typography.size.lg,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  description: {
    fontFamily: Typography.family.regular,
    fontSize: Typography.size.sm,
    color: Colors.textTertiary,
    textAlign: 'center',
    paddingHorizontal: Spacing['2xl'],
    lineHeight: Typography.lineHeight.base,
  },
});
