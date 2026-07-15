import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radii, Shadows } from '@/src/constants/theme';
import { useUser } from '@/src/store';
import {
  formatDisplayDate,
} from '@/src/utils/helpers';
import { useOperationalContext } from '@/src/hooks/useOperationalContext';
import { useOperationalMenuStatus } from '@/src/hooks/useMenu';
import { useDashboardMetrics } from '@/src/services/dashboard';
import { EmptyState } from '@/src/components/ui';
import { useRouter } from 'expo-router';

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const user = useUser();
  const router = useRouter();

  const { calendarDate, resolvedOperationalDate, isResolving } = useOperationalContext();

  const { data: menuStatus } = useOperationalMenuStatus(resolvedOperationalDate, isResolving);
  const { data: metrics, isPending, isLoading, error } = useDashboardMetrics(calendarDate, resolvedOperationalDate, isResolving);

  const greeting = getGreeting();

  if (isResolving || isPending) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (error || !metrics) {
    console.error("Dashboard Load Error:", error);
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <EmptyState icon="alert-circle-outline" title="Dashboard Error" subtitle="Failed to load live metrics." />
      </View>
    );
  }

  const renderExecutionSection = () => (
    <View style={styles.sectionContainer}>
      <View style={styles.domainHeader}>
        <Text style={styles.domainTitle}>
          OPERATIONS • {formatDisplayDate(new Date(calendarDate)).toUpperCase()}
        </Text>
      </View>

      {metrics.holidayExecution ? (
        <View style={styles.holidayBanner}>
          <Ionicons name="warning" size={20} color={Colors.error} style={{ marginRight: Spacing.sm }} />
          <Text style={styles.holidayBannerText}>
            CLOSED FOR HOLIDAY: {metrics.holidayExecution.title.toUpperCase()}
          </Text>
        </View>
      ) : (
        <View style={styles.metricsRow}>
          <View style={styles.mainMetricCard}>
            <Text style={styles.mainMetricValue}>{metrics.executionOrders.total}</Text>
            <Text style={styles.mainMetricLabel}>Total Orders</Text>
          </View>
          <View style={styles.subMetricsCol}>
            <View style={styles.subMetricRow}>
              <View style={styles.statusIndicator} />
              <Text style={styles.subMetricLabel}>Pending</Text>
              <Text style={styles.subMetricValue}>{metrics.executionOrders.pending}</Text>
            </View>
            <View style={styles.subMetricRow}>
              <View style={[styles.statusIndicator, { backgroundColor: Colors.info }]} />
              <Text style={styles.subMetricLabel}>Accepted</Text>
              <Text style={styles.subMetricValue}>{metrics.executionOrders.accepted}</Text>
            </View>
            <View style={styles.subMetricRow}>
              <View style={[styles.statusIndicator, { backgroundColor: Colors.success }]} />
              <Text style={styles.subMetricLabel}>Ready</Text>
              <Text style={styles.subMetricValue}>{metrics.executionOrders.ready}</Text>
            </View>
            <View style={styles.subMetricRow}>
              <View style={[styles.statusIndicator, { backgroundColor: Colors.textSecondary }]} />
              <Text style={styles.subMetricLabel}>Collected</Text>
              <Text style={styles.subMetricValue}>{metrics.executionOrders.collected}</Text>
            </View>
          </View>
        </View>
      )}

      {/* Quick Insights tied to Execution */}
      {!metrics.holidayExecution && (
        <>
          <View style={[styles.insightsGrid, { marginTop: Spacing.base }]}>
            <View style={styles.insightCard}>
              <Ionicons name="flame-outline" size={20} color={Colors.accent} style={styles.insightIcon} />
              <Text style={styles.insightValue}>{metrics.insights.mostOrderedMeal || 'N/A'}</Text>
              <Text style={styles.insightLabel}>Most Ordered Today</Text>
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
        </>
      )}
    </View>
  );

  const renderPlanningSection = () => (
    <View style={styles.sectionContainer}>
      <View style={styles.domainHeader}>
        <Text style={styles.domainTitle}>
          PREPARATION • {formatDisplayDate(new Date(resolvedOperationalDate)).toUpperCase()}
        </Text>
      </View>

      {metrics.holidayOperational ? (
        <View style={styles.holidayBanner}>
          <Ionicons name="alert-circle" size={20} color={Colors.error} style={{ marginRight: Spacing.sm }} />
          <Text style={styles.holidayBannerText}>
            NO OPERATIONS: {metrics.holidayOperational.title.toUpperCase()}
          </Text>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.7}
          onPress={() => router.push('/(app)/(dashboard)/reservations' as any)}
        >
          <View style={[styles.cardIconWrap, { backgroundColor: Colors.primaryMuted }]}>
            <Ionicons name="bookmark-outline" size={24} color={Colors.primary} />
          </View>
          <View style={[styles.cardBody, { flexDirection: 'row', alignItems: 'center' }]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardLabel}>Reservations</Text>
              <Text style={styles.cardValue}>{metrics.operationalReservations}</Text>
            </View>
            <View style={{ width: 1, height: '80%', backgroundColor: Colors.borderLight, marginHorizontal: Spacing.base }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.cardLabel}>Items</Text>
              <Text style={styles.cardValue}>{metrics.operationalTotalMeals}</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.borderLight} />
        </TouchableOpacity>
      )}

      {/* Menu Config status is tied to Planning */}
      <TouchableOpacity
        style={[styles.card, { marginTop: Spacing.sm }]}
        activeOpacity={0.7}
        onPress={() => router.push('/(app)/(menu)')}
      >
        <View style={[styles.cardIconWrap, { backgroundColor: menuStatus?.isConfigured ? Colors.successMuted : Colors.warningMuted }]}>
          <Ionicons name="restaurant-outline" size={24} color={menuStatus?.isConfigured ? Colors.success : Colors.warning} />
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardValue}>{menuStatus?.isConfigured ? 'Configured' : 'Action Required'}</Text>
          <Text style={styles.cardLabel}>
            {menuStatus?.isConfigured ? `${menuStatus.itemCount} Items on Menu` : 'Operational menu is not set'}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={Colors.borderLight} />
      </TouchableOpacity>

      {/* Subscriptions can also sit in Planning to evaluate overall numbers */}
      <TouchableOpacity
        style={[styles.card, { marginTop: Spacing.sm }]}
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

    </View>
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + Spacing.base, paddingBottom: Spacing['3xl'] },
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
              name="time-outline"
              size={14}
              color={Colors.brandBrown}
            />
            <Text style={styles.dateText}>Live Data</Text>
          </View>
        </View>
      </View>

      {/* Global Status Bar is removed because it's replaced by the split domain banners */}

      {renderExecutionSection()}
      
      {/* Visual Divider */}
      <View style={styles.divider} />

      {renderPlanningSection()}

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
    fontSize: Typography.size.xl,
    color: Colors.textPrimary,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  dateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryMuted,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.full,
  },
  dateText: {
    fontFamily: Typography.family.medium,
    fontSize: Typography.size.xs,
    color: Colors.brandBrown,
    marginLeft: 4,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: Spacing.lg,
  },
  sectionContainer: {
    marginBottom: Spacing.base,
  },
  domainHeader: {
    marginBottom: Spacing.base,
  },
  domainTitle: {
    fontFamily: Typography.family.bold,
    fontSize: Typography.size.base,
    color: Colors.primary,
    letterSpacing: 1,
  },
  domainSubtitle: {
    fontFamily: Typography.family.medium,
    fontSize: Typography.size.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  holidayBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.error + '15',
    padding: Spacing.base,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.error + '40',
  },
  holidayBannerText: {
    fontFamily: Typography.family.bold,
    color: Colors.error,
    fontSize: Typography.size.sm,
    flex: 1,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  mainMetricCard: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: Radii.lg,
    padding: Spacing.base,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
    ...Shadows.md,
  },
  mainMetricValue: {
    fontFamily: Typography.family.bold,
    fontSize: 42,
    color: Colors.surface,
    marginBottom: 4,
  },
  mainMetricLabel: {
    fontFamily: Typography.family.medium,
    fontSize: Typography.size.sm,
    color: 'rgba(255,255,255,0.8)',
  },
  subMetricsCol: {
    flex: 1.2,
    justifyContent: 'space-between',
  },
  subMetricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: Spacing.sm,
    borderRadius: Radii.sm,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  statusIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.warning,
    marginRight: Spacing.sm,
  },
  subMetricLabel: {
    flex: 1,
    fontFamily: Typography.family.medium,
    fontSize: Typography.size.sm,
    color: Colors.textSecondary,
  },
  subMetricValue: {
    fontFamily: Typography.family.bold,
    fontSize: Typography.size.base,
    color: Colors.textPrimary,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: Spacing.base,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadows.sm,
  },
  cardIconWrap: {
    width: 48,
    height: 48,
    borderRadius: Radii.md,
    backgroundColor: Colors.successMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.base,
  },
  cardBody: {
    flex: 1,
  },
  cardValue: {
    fontFamily: Typography.family.bold,
    fontSize: Typography.size.lg,
    color: Colors.textPrimary,
  },
  cardLabel: {
    fontFamily: Typography.family.regular,
    fontSize: Typography.size.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  insightsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  insightCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.surface,
    padding: Spacing.base,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadows.sm,
  },
  insightIcon: {
    marginBottom: Spacing.sm,
  },
  insightValue: {
    fontFamily: Typography.family.bold,
    fontSize: Typography.size.lg,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  insightLabel: {
    fontFamily: Typography.family.regular,
    fontSize: Typography.size.xs,
    color: Colors.textSecondary,
  },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.warning + '15',
    padding: Spacing.base,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.warning + '50',
    marginTop: Spacing.base,
  },
  alertTextWrap: {
    marginLeft: Spacing.sm,
  },
  alertTitle: {
    fontFamily: Typography.family.bold,
    fontSize: Typography.size.sm,
    color: Colors.warning,
  },
  alertDesc: {
    fontFamily: Typography.family.medium,
    fontSize: Typography.size.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});
