import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radii } from '@/src/constants/theme';
import { StatCard } from '@/src/components/dashboard/StatCard';
import { useUser } from '@/src/store';
import {
  getKitchenDate,
  getKitchenTomorrow,
  formatDisplayDate,
} from '@/src/utils/helpers';
import { useTomorrowMenuStatus } from '@/src/hooks/useMenu';

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const user = useUser();
  const today = getKitchenDate();
  const tomorrow = getKitchenTomorrow();
  
  const { data: menuStatus, isLoading: menuLoading } = useTomorrowMenuStatus();

  const greeting = getGreeting();

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
              color={Colors.secondary}
            />
            <Text style={styles.dateText}>{formatDisplayDate(today)}</Text>
          </View>
        </View>
      </View>

      {/* Kitchen Status */}
      <View style={styles.statusBar}>
        <View style={styles.statusDot} />
        <Text style={styles.statusText}>Kitchen Active</Text>
      </View>

      {/* Section: Today */}
      <Text style={styles.sectionTitle}>
        Today · {formatDisplayDate(today)}
      </Text>

      <View style={styles.cardGrid}>
        <StatCard
          title="Today's Orders"
          value="—"
          subtitle="Awaiting data"
          icon="receipt-outline"
          accentColor={Colors.primary}
          accentBg={Colors.primaryMuted}
          style={styles.gridCard}
        />
        <StatCard
          title="Active Subscribers"
          value="—"
          subtitle="Awaiting data"
          icon="people-outline"
          accentColor={Colors.info}
          accentBg={Colors.infoMuted}
          style={styles.gridCard}
        />
      </View>

      {/* Section: Tomorrow */}
      <Text style={styles.sectionTitle}>
        Tomorrow · {formatDisplayDate(tomorrow)}
      </Text>

      <View style={styles.cardGrid}>
        <StatCard
          title="Tomorrow Reservations"
          value="—"
          subtitle="Awaiting data"
          icon="bookmark-outline"
          accentColor={Colors.accent}
          accentBg={Colors.accentMuted}
          style={styles.gridCard}
        />
        <StatCard
          title="Tomorrow Menu"
          value={menuLoading ? '...' : menuStatus?.isConfigured ? 'Configured' : 'Not Configured'}
          subtitle={menuStatus?.isConfigured ? `${menuStatus.itemCount} Meals Available` : 'Requires action'}
          icon="fast-food-outline"
          accentColor={menuStatus?.isConfigured ? Colors.success : Colors.warning}
          accentBg={menuStatus?.isConfigured ? Colors.successMuted : Colors.warningMuted}
          style={styles.gridCard}
        />
      </View>

      {/* Bottom padding */}
      <View style={{ height: Spacing['3xl'] }} />
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
    fontSize: Typography.size.base,
    color: Colors.textSecondary,
  },
  userName: {
    fontFamily: Typography.family.bold,
    fontSize: Typography.size.xl,
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
    borderColor: Colors.secondary,
  },
  dateText: {
    fontFamily: Typography.family.medium,
    fontSize: Typography.size.xs,
    color: Colors.secondary,
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.successMuted,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radii.md,
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.success,
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
    color: Colors.success,
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
  cardGrid: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  gridCard: {
    flex: 1,
  },
});
