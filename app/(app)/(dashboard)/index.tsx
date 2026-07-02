import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radii, Shadows } from '@/src/constants/theme';
import { useUser } from '@/src/store';
import {
  getKitchenDate,
  getKitchenTomorrow,
  formatDisplayDate,
} from '@/src/utils/helpers';
import { useTomorrowMenuStatus } from '@/src/hooks/useMenu';
import { useDashboardMetrics } from '@/src/services/dashboard';
import { EmptyState } from '@/src/components/ui';
import { useRouter } from 'expo-router';

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const user = useUser();
  const router = useRouter();
  const today = getKitchenDate();
  const tomorrow = getKitchenTomorrow();
  
  const { data: menuStatus } = useTomorrowMenuStatus();
  const { data: metrics, isLoading, error } = useDashboardMetrics();

  const greeting = getGreeting();

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (error || !metrics) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <EmptyState icon="alert-circle-outline" title="Dashboard Error" subtitle="Failed to load live metrics." />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + Spacing.base },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.greeting}>{greeting}</Text>
          <Text style={styles.userName}>{user?.name || 'Staff'}</Text>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.dateChip}>
            <Ionicons
              name="calendar-outline"
              size={14}
              color={Colors.brandBrown}
            />
            <Text style={styles.dateText}>{formatDisplayDate(today)}</Text>
          </View>
        </View>
      </View>

      {/* Kitchen Status */}
      <View style={styles.statusBar}>
        <View style={styles.statusDot} />
        <Text style={styles.statusText}>Kitchen Active · Live Sync</Text>
      </View>

      {/* Section: Today */}
      <Text style={styles.sectionTitle}>Today's Orders</Text>

      <View style={styles.metricsRow}>
        <View style={styles.mainMetricCard}>
          <Text style={styles.mainMetricValue}>{metrics.todayOrders.total}</Text>
          <Text style={styles.mainMetricLabel}>Total Orders</Text>
        </View>
        <View style={styles.subMetricsCol}>
          <View style={styles.subMetricRow}>
            <View style={styles.statusIndicator} />
            <Text style={styles.subMetricLabel}>Pending</Text>
            <Text style={styles.subMetricValue}>{metrics.todayOrders.pending}</Text>
          </View>
          <View style={styles.subMetricRow}>
            <View style={[styles.statusIndicator, { backgroundColor: Colors.accent }]} />
            <Text style={styles.subMetricLabel}>Preparing</Text>
            <Text style={styles.subMetricValue}>{metrics.todayOrders.preparing}</Text>
          </View>
          <View style={styles.subMetricRow}>
            <View style={[styles.statusIndicator, { backgroundColor: Colors.success }]} />
            <Text style={styles.subMetricLabel}>Ready</Text>
            <Text style={styles.subMetricValue}>{metrics.todayOrders.ready}</Text>
          </View>
          <View style={styles.subMetricRow}>
            <View style={[styles.statusIndicator, { backgroundColor: Colors.textSecondary }]} />
            <Text style={styles.subMetricLabel}>Collected</Text>
            <Text style={styles.subMetricValue}>{metrics.todayOrders.collected}</Text>
          </View>
        </View>
      </View>

      {/* Quick Insights */}
      <Text style={styles.sectionTitle}>Quick Insights</Text>
      <View style={styles.insightsGrid}>
        <View style={styles.insightCard}>
          <Ionicons name="flame-outline" size={20} color={Colors.accent} style={styles.insightIcon} />
          <Text style={styles.insightValue}>{metrics.insights.mostOrderedMeal || 'N/A'}</Text>
          <Text style={styles.insightLabel}>Most Ordered</Text>
        </View>
        <View style={styles.insightCard}>
          <Ionicons name="ticket-outline" size={20} color={Colors.primary} style={styles.insightIcon} />
          <Text style={styles.insightValue}>{metrics.insights.subscriptionOrders} / {metrics.insights.cashOrders}</Text>
          <Text style={styles.insightLabel}>Sub / Cash Orders</Text>
        </View>
      </View>
      
      {metrics.insights.pendingRequiresAttention > 0 && (
        <View style={styles.alertCard}>
          <Ionicons name="warning-outline" size={20} color={Colors.warning} />
          <View style={styles.alertTextWrap}>
            <Text style={styles.alertTitle}>Action Required</Text>
            <Text style={styles.alertDesc}>{metrics.insights.pendingRequiresAttention} orders pending for &gt; 15 mins</Text>
          </View>
        </View>
      )}

      {/* Subscriptions */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Subscriptions</Text>
        <TouchableOpacity onPress={() => router.push('/(app)/(subscriptions)')}>
          <Text style={styles.linkText}>View All</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity 
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => router.push('/(app)/(subscriptions)')}
      >
        <View style={styles.cardIconWrap}>
          <Ionicons name="people-outline" size={24} color={Colors.success} />
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardValue}>{metrics.activeSubscribers}</Text>
          <Text style={styles.cardLabel}>Active Subscribers</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={Colors.borderLight} />
      </TouchableOpacity>

      {/* Section: Tomorrow */}
      <Text style={styles.sectionTitle}>
        Tomorrow · {formatDisplayDate(tomorrow)}
      </Text>

      <View style={styles.card}>
        <View style={[styles.cardIconWrap, { backgroundColor: Colors.primaryMuted }]}>
          <Ionicons name="bookmark-outline" size={24} color={Colors.primary} />
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardValue}>{metrics.tomorrowReservations}</Text>
          <Text style={styles.cardLabel}>Advance Reservations</Text>
        </View>
      </View>

      <TouchableOpacity 
        style={[styles.card, { marginBottom: Spacing['3xl'] }]}
        activeOpacity={0.7}
        onPress={() => router.push('/(app)/(menu)')}
      >
        <View style={[styles.cardIconWrap, { backgroundColor: menuStatus?.isConfigured ? Colors.successMuted : Colors.warningMuted }]}>
          <Ionicons name="restaurant-outline" size={24} color={menuStatus?.isConfigured ? Colors.success : Colors.warning} />
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardValue}>{menuStatus?.isConfigured ? 'Configured' : 'Action Required'}</Text>
          <Text style={styles.cardLabel}>
            {menuStatus?.isConfigured ? `${menuStatus.itemCount} Meals on Menu` : 'Tomorrow\'s menu is not set'}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={Colors.borderLight} />
      </TouchableOpacity>

    </ScrollView>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning,';
  if (hour < 17) return 'Good afternoon,';
  return 'Good evening,';
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.base,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.lg,
  },
  headerLeft: {
    flex: 1,
  },
  greeting: {
    fontFamily: Typography.family.regular,
    fontSize: Typography.size.sm,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  userName: {
    fontFamily: Typography.family.bold,
    fontSize: Typography.size['2xl'],
    color: Colors.textPrimary,
    marginTop: Spacing.xs,
  },
  headerRight: {
    paddingTop: Spacing.xs,
  },
  dateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.secondaryMuted,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radii.full,
    gap: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.brandBrown + '40',
  },
  dateText: {
    fontFamily: Typography.family.medium,
    fontSize: Typography.size.xs,
    color: Colors.brandBrown,
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radii.md,
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.success,
  },
  statusText: {
    fontFamily: Typography.family.medium,
    fontSize: Typography.size.sm,
    color: Colors.textSecondary,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  linkText: {
    fontFamily: Typography.family.medium,
    fontSize: Typography.size.sm,
    color: Colors.accent,
  },
  sectionTitle: {
    fontFamily: Typography.family.semiBold,
    fontSize: Typography.size.sm,
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.md,
    marginTop: Spacing.sm,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  mainMetricCard: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: Radii.lg,
    padding: Spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.md,
  },
  mainMetricValue: {
    fontSize: Typography.size['4xl'],
    fontFamily: Typography.family.bold,
    color: Colors.white,
    marginBottom: Spacing.xs,
  },
  mainMetricLabel: {
    fontSize: Typography.size.sm,
    fontFamily: Typography.family.medium,
    color: Colors.white,
    opacity: 0.9,
  },
  subMetricsCol: {
    flex: 1.2,
    backgroundColor: Colors.surface,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'space-between',
  },
  subMetricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.textSecondary,
    marginRight: Spacing.sm,
  },
  subMetricLabel: {
    flex: 1,
    fontSize: Typography.size.sm,
    fontFamily: Typography.family.medium,
    color: Colors.textSecondary,
  },
  subMetricValue: {
    fontSize: Typography.size.base,
    fontFamily: Typography.family.bold,
    color: Colors.textPrimary,
  },
  insightsGrid: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  insightCard: {
    flex: 1,
    backgroundColor: Colors.surfaceHighlight,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  insightIcon: {
    marginBottom: Spacing.sm,
  },
  insightValue: {
    fontSize: Typography.size.lg,
    fontFamily: Typography.family.bold,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  insightLabel: {
    fontSize: Typography.size.xs,
    fontFamily: Typography.family.medium,
    color: Colors.textSecondary,
  },
  alertCard: {
    flexDirection: 'row',
    backgroundColor: Colors.warningMuted,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.warning + '40',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  alertTextWrap: {
    marginLeft: Spacing.sm,
    flex: 1,
  },
  alertTitle: {
    fontSize: Typography.size.sm,
    fontFamily: Typography.family.bold,
    color: Colors.warning,
    marginBottom: 2,
  },
  alertDesc: {
    fontSize: Typography.size.xs,
    fontFamily: Typography.family.medium,
    color: Colors.warning,
    opacity: 0.9,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
  },
  cardIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.successMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  cardBody: {
    flex: 1,
  },
  cardValue: {
    fontSize: Typography.size.lg,
    fontFamily: Typography.family.bold,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  cardLabel: {
    fontSize: Typography.size.sm,
    fontFamily: Typography.family.medium,
    color: Colors.textSecondary,
  },
});
