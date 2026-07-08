import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radii, Shadows } from '@/src/constants/theme';
import { useTomorrowReservationsDetailed } from '@/src/services/dashboard';
import { EmptyState } from '@/src/components/ui';
import { getKitchenTomorrow, formatDisplayDate } from '@/src/utils/helpers';

export default function TomorrowReservationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data, isLoading, error } = useTomorrowReservationsDetailed();

  const tomorrow = getKitchenTomorrow();

  const SLOT_ORDER = [
    '12:00–12:30',
    '12:30–1:00',
    '1:00–1:30',
    '1:30–2:00',
    'Not Sure',
    'Not Scheduled'
  ];

  const groupedCustomers = useMemo(() => {
    if (!data) return [];
    
    const groups: Record<string, typeof data.customerBreakdown> = {};
    
    data.customerBreakdown.forEach(c => {
      const slot = c.expectedPickupSlot || 'Not Scheduled';
      if (!groups[slot]) groups[slot] = [];
      groups[slot].push(c);
    });

    // Sort customers alphabetically within groups
    Object.keys(groups).forEach(slot => {
      groups[slot].sort((a, b) => a.customerName.localeCompare(b.customerName));
    });

    // Sort groups chronologically based on SLOT_ORDER
    return Object.entries(groups).sort(([slotA], [slotB]) => {
      const indexA = SLOT_ORDER.indexOf(slotA);
      const indexB = SLOT_ORDER.indexOf(slotB);
      const rankA = indexA === -1 ? 999 : indexA;
      const rankB = indexB === -1 ? 999 : indexB;
      return rankA - rankB;
    });
  }, [data]);

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

  if (error || !data) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>
        <EmptyState icon="alert-circle-outline" title="Error" subtitle="Could not load reservations." />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerTitles}>
          <Text style={styles.headerTitle}>Reservations</Text>
          <Text style={styles.headerSubtitle}>{formatDisplayDate(tomorrow)}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        
        {/* Summary Card */}
        <Text style={styles.sectionTitle}>Summary</Text>
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryCol}>
              <Text style={styles.summaryValue}>{data.totalReservations}</Text>
              <Text style={styles.summaryLabel}>Total Orders</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryCol}>
              <Text style={styles.summaryValue}>{data.totalMealsReserved}</Text>
              <Text style={styles.summaryLabel}>Total Items</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryCol}>
              <Text style={styles.summaryValue}>{data.uniqueCustomers}</Text>
              <Text style={styles.summaryLabel}>Customers</Text>
            </View>
          </View>
        </View>

        {/* Item Breakdown */}
        <Text style={styles.sectionTitle}>Item Breakdown</Text>
        {Object.keys(data.mealBreakdown).length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No items to prepare yet.</Text>
          </View>
        ) : (
          <View style={styles.breakdownCard}>
            {Object.entries(data.mealBreakdown).map(([mealName, count], index, arr) => (
              <View key={mealName}>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownMeal}>{mealName}</Text>
                  <Text style={styles.breakdownCount}>{count}</Text>
                </View>
                {index < arr.length - 1 && <View style={styles.divider} />}
              </View>
            ))}
          </View>
        )}

        {/* Customer Breakdown */}
        <Text style={styles.sectionTitle}>Customer Breakdown</Text>
        {groupedCustomers.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No reservations for tomorrow.</Text>
          </View>
        ) : (
          <View style={styles.customersList}>
            {groupedCustomers.map(([slot, customers]) => (
              <View key={slot} style={styles.slotGroup}>
                <View style={styles.slotHeader}>
                  <Ionicons name="time-outline" size={16} color={Colors.primary} />
                  <Text style={styles.slotHeaderText}>{slot}</Text>
                </View>
                {customers.map((customer) => (
                  <View key={customer.id} style={styles.customerCard}>
                    <View style={styles.customerHeader}>
                      <Text style={styles.customerName}>{customer.customerName}</Text>
                      <View style={styles.orderNumberBadge}>
                        <Text style={styles.orderNumberText}>#{customer.orderNumber}</Text>
                      </View>
                    </View>
                    
                    <View style={styles.contactRow}>
                      <Ionicons name="call-outline" size={14} color={Colors.textTertiary} />
                      <Text style={styles.contactText}>{customer.phone}</Text>
                    </View>

                    <View style={styles.mealsList}>
                      {customer.reservedMeals.map((meal, idx) => (
                        <View key={idx} style={styles.mealItem}>
                          <Ionicons name="restaurant-outline" size={14} color={Colors.primary} />
                          <Text style={styles.mealText}>{meal}</Text>
                        </View>
                      ))}
                    </View>

                    <View style={styles.totalRow}>
                      <Text style={styles.totalLabel}>Total Items</Text>
                      <Text style={styles.totalValue}>{customer.quantity}</Text>
                    </View>
                  </View>
                ))}
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
    width: 40,
  },
  headerTitles: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: Typography.size.lg,
    fontFamily: Typography.family.bold,
    color: Colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: Typography.size.sm,
    fontFamily: Typography.family.medium,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  content: {
    padding: Spacing.base,
    paddingBottom: Spacing['4xl'],
  },
  sectionTitle: {
    fontSize: Typography.size.sm,
    fontFamily: Typography.family.semiBold,
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.sm,
    marginLeft: Spacing.xs,
    marginTop: Spacing.lg,
  },
  summaryCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryCol: {
    alignItems: 'center',
    flex: 1,
  },
  summaryValue: {
    fontSize: Typography.size['2xl'],
    fontFamily: Typography.family.bold,
    color: Colors.primary,
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: Typography.size.xs,
    fontFamily: Typography.family.medium,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: Colors.divider,
  },
  breakdownCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  breakdownMeal: {
    fontSize: Typography.size.base,
    fontFamily: Typography.family.medium,
    color: Colors.textPrimary,
  },
  breakdownCount: {
    fontSize: Typography.size.lg,
    fontFamily: Typography.family.bold,
    color: Colors.primary,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginVertical: Spacing.sm,
  },
  emptyCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: Typography.size.sm,
    fontFamily: Typography.family.medium,
    color: Colors.textTertiary,
  },
  customersList: {
    gap: Spacing.xl,
  },
  slotGroup: {
    gap: Spacing.md,
  },
  slotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingLeft: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  slotHeaderText: {
    fontSize: Typography.size.base,
    fontFamily: Typography.family.bold,
    color: Colors.textPrimary,
  },
  customerCard: {
    backgroundColor: Colors.surfaceHighlight,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    padding: Spacing.base,
  },
  customerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  customerName: {
    fontSize: Typography.size.lg,
    fontFamily: Typography.family.bold,
    color: Colors.textPrimary,
  },
  orderNumberBadge: {
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radii.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  orderNumberText: {
    fontSize: Typography.size.xs,
    fontFamily: Typography.family.bold,
    color: Colors.textSecondary,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  contactText: {
    fontSize: Typography.size.sm,
    fontFamily: Typography.family.medium,
    color: Colors.textSecondary,
  },
  mealsList: {
    backgroundColor: Colors.surface,
    padding: Spacing.sm,
    borderRadius: Radii.md,
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  mealItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  mealText: {
    fontSize: Typography.size.sm,
    fontFamily: Typography.family.medium,
    color: Colors.textPrimary,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingTop: Spacing.sm,
  },
  totalLabel: {
    fontSize: Typography.size.sm,
    fontFamily: Typography.family.semiBold,
    color: Colors.textSecondary,
  },
  totalValue: {
    fontSize: Typography.size.base,
    fontFamily: Typography.family.bold,
    color: Colors.primary,
  },
});
