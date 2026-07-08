import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radii, Shadows } from '@/src/constants/theme';
import { useSubscriberDetails } from '@/src/services/subscriptions';
import { EmptyState } from '@/src/components/ui';
import { formatDisplayDate } from '@/src/utils/helpers';

export default function SubscriberDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: sub, isLoading, error } = useSubscriberDetails(id as string);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return Colors.success;
      case 'paused': return Colors.warning;
      case 'expired': return Colors.textTertiary;
      case 'cancelled': return Colors.error;
      default: return Colors.textSecondary;
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: Spacing['4xl'] }} />
      </View>
    );
  }

  if (error || !sub) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>
        <EmptyState icon="alert-circle-outline" title="Error" subtitle="Could not load subscriber details." />
      </View>
    );
  }

  const progressPercent = Math.min(100, Math.max(0, (sub.consumedMeals / sub.totalMeals) * 100));

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Subscriber Details</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileAvatar}>
            <Text style={styles.avatarText}>{sub.customerName.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.customerName}>{sub.customerName}</Text>
          {sub.customerName === 'No Profile Name' && (
            <Text style={styles.userIdText}>ID: {sub.userId}</Text>
          )}

          <View style={styles.contactInfo}>
            <View style={styles.contactRow}>
              <Ionicons name="mail-outline" size={16} color={Colors.textTertiary} />
              <Text style={styles.contactText}>{sub.email || 'Not Provided'}</Text>
            </View>
            <View style={styles.contactRow}>
              <Ionicons name="call-outline" size={16} color={Colors.textTertiary} />
              <Text style={styles.contactText}>{sub.phone || 'Not Provided'}</Text>
            </View>
          </View>

          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(sub.status) + '15', borderColor: getStatusColor(sub.status) + '40' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(sub.status) }]}>{sub.status.toUpperCase()}</Text>
          </View>
        </View>

        {/* Plan Details Card */}
        <Text style={styles.sectionTitle}>Plan Details</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.label}>Plan</Text>
              <Text style={styles.value}>{sub.planName}</Text>
            </View>
            <View style={styles.colRight}>
              <Text style={styles.label}>Daily Limit</Text>
              <Text style={styles.value}>{sub.mealsPerDay} meals/day</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.label}>Start Date</Text>
              <Text style={styles.value}>{formatDisplayDate(new Date(sub.startDate))}</Text>
            </View>
            <View style={styles.colRight}>
              <Text style={styles.label}>End Date</Text>
              <Text style={styles.value}>{formatDisplayDate(new Date(sub.endDate))}</Text>
            </View>
          </View>
        </View>

        {/* Credits Card */}
        <Text style={styles.sectionTitle}>Credit Usage</Text>
        <View style={styles.card}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>
              {sub.consumedMeals} of {sub.totalMeals} credits used
            </Text>
            <Text style={[styles.progressLabel, { color: Colors.primary, fontFamily: Typography.family.bold }]}>
              {sub.remainingMeals} remaining
            </Text>
          </View>
          
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
          </View>
        </View>

        {/* Usage History */}
        <Text style={styles.sectionTitle}>Recent Usage History</Text>
        {sub.usageHistory.length === 0 ? (
          <View style={styles.emptyHistory}>
            <Text style={styles.emptyHistoryText}>No meals consumed yet.</Text>
          </View>
        ) : (
          <View style={styles.card}>
            {sub.usageHistory.map((history, index) => (
              <View key={history.id}>
                <View style={styles.historyRow}>
                  <View style={styles.historyIcon}>
                    <Ionicons name="restaurant-outline" size={16} color={Colors.primary} />
                  </View>
                  <View style={styles.historyDetails}>
                    <Text style={styles.historyMeal}>{history.mealName}</Text>
                    <Text style={styles.historyDate}>{formatDisplayDate(new Date(history.date))}</Text>
                  </View>
                </View>
                {index < sub.usageHistory.length - 1 && <View style={styles.divider} />}
              </View>
            ))}
          </View>
        )}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    padding: Spacing.xs,
  },
  headerTitle: {
    fontSize: Typography.size.lg,
    fontFamily: Typography.family.semiBold,
    color: Colors.textPrimary,
  },
  content: {
    padding: Spacing.base,
    paddingBottom: Spacing['4xl'],
  },
  profileCard: {
    alignItems: 'center',
    padding: Spacing.xl,
    backgroundColor: Colors.surface,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.xl,
  },
  profileAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.primary + '40',
  },
  avatarText: {
    fontSize: Typography.size['2xl'],
    fontFamily: Typography.family.bold,
    color: Colors.primary,
  },
  customerName: {
    fontSize: Typography.size.xl,
    fontFamily: Typography.family.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  userIdText: {
    fontSize: Typography.size.xs,
    fontFamily: Typography.family.medium,
    color: Colors.textTertiary,
    marginBottom: Spacing.sm,
  },
  contactInfo: {
    alignItems: 'center',
    gap: 4,
    marginBottom: Spacing.md,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  contactText: {
    fontSize: Typography.size.sm,
    fontFamily: Typography.family.medium,
    color: Colors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radii.full,
    borderWidth: 1,
  },
  statusText: {
    fontSize: Typography.size.xs,
    fontFamily: Typography.family.bold,
  },
  sectionTitle: {
    fontSize: Typography.size.sm,
    fontFamily: Typography.family.semiBold,
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.sm,
    marginLeft: Spacing.xs,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.base,
    marginBottom: Spacing.xl,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  col: {
    flex: 1,
  },
  colRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginVertical: Spacing.md,
  },
  label: {
    fontSize: Typography.size.xs,
    fontFamily: Typography.family.medium,
    color: Colors.textSecondary,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  value: {
    fontSize: Typography.size.base,
    fontFamily: Typography.family.semiBold,
    color: Colors.textPrimary,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  progressLabel: {
    fontSize: Typography.size.sm,
    fontFamily: Typography.family.medium,
    color: Colors.textSecondary,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: Colors.surfaceHighlight,
    borderRadius: Radii.full,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: Radii.full,
  },
  emptyHistory: {
    padding: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptyHistoryText: {
    fontSize: Typography.size.sm,
    fontFamily: Typography.family.medium,
    color: Colors.textTertiary,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  historyDetails: {
    flex: 1,
  },
  historyMeal: {
    fontSize: Typography.size.base,
    fontFamily: Typography.family.medium,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  historyDate: {
    fontSize: Typography.size.xs,
    fontFamily: Typography.family.regular,
    color: Colors.textSecondary,
  },
});
