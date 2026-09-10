import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radii } from '@/src/constants/theme';
import { OrderCard } from '@/src/components/orders/OrderCard';
import { WalkInCard } from '@/src/components/orders/WalkInCard';
import { CompactFilterChip } from '@/src/components/orders/OrderPrimitives';
import { BottomErrorToast } from '@/src/components/ui/BottomErrorToast';
import { useOrderHistory } from '@/src/hooks/useOrders';
import { useOperationalContext } from '@/src/hooks/useOperationalContext';
import { HistoryEntry } from '@/src/types/models';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { StallSelector } from '@/src/components/stall/StallSelector';

type SectionFilter = 'active' | 'completed';
type TypeFilter = 'all' | 'direct' | 'subscription' | 'walk_in';

export default function OrdersScreen() {
  const insets = useSafeAreaInsets();
  const { stallId, resolvedOperationalDate } = useOperationalContext();
  const {
    data: history,
    isLoading,
    refetch,
    isRefetching,
    isError,
  } = useOrderHistory(stallId, resolvedOperationalDate);

  const [sectionFilter, setSectionFilter] = useState<SectionFilter>('active');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [dismissedError, setDismissedError] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const handleRefresh = useCallback(() => {
    setDismissedError(false);
    refetch();
  }, [refetch]);

  // Filter entries matching section (Active vs Completed)
  const sectionEntries = useMemo(() => {
    return history.filter((entry) => {
      if (entry.type === 'walk_in') {
        // Walk-in sales are always completed
        return sectionFilter === 'completed';
      }
      const order = entry.data;
      return sectionFilter === 'active'
        ? ['pending', 'confirmed', 'preparing', 'ready'].includes(
            order.status
          )
        : ['picked_up', 'delivered', 'cancelled'].includes(order.status);
    });
  }, [history, sectionFilter]);

  // Compute category counts for operational filter chips
  const counts = useMemo(() => {
    let allCount = 0;
    let directCount = 0;
    let subscriptionCount = 0;
    let walkInCount = 0;

    for (const entry of sectionEntries) {
      allCount++;
      if (entry.type === 'walk_in') {
        walkInCount++;
      } else {
        if (entry.data.orderType === 'subscription') {
          subscriptionCount++;
        } else {
          directCount++;
        }
      }
    }

    return { allCount, directCount, subscriptionCount, walkInCount };
  }, [sectionEntries]);

  // Filter by order type and group by date
  const groupedEntries = useMemo(() => {
    let filtered = sectionEntries;

    if (typeFilter === 'direct') {
      filtered = filtered.filter(
        (e) => e.type === 'order' && e.data.orderType !== 'subscription'
      );
    } else if (typeFilter === 'subscription') {
      filtered = filtered.filter(
        (e) => e.type === 'order' && e.data.orderType === 'subscription'
      );
    } else if (typeFilter === 'walk_in') {
      filtered = filtered.filter((e) => e.type === 'walk_in');
    }

    const groups = filtered.reduce((acc, entry) => {
      let date: string;
      if (entry.type === 'order') {
        date = entry.data.pickupDate || 'No Date';
      } else {
        date = entry.data.inventoryDate || 'No Date';
      }
      if (!acc[date]) acc[date] = [];
      acc[date].push(entry);
      return acc;
    }, {} as Record<string, HistoryEntry[]>);

    const sortedGroups = Object.entries(groups).sort(([dateA], [dateB]) => {
      if (dateA === 'No Date') return 1;
      if (dateB === 'No Date') return -1;
      return dateB.localeCompare(dateA); // Newest date first
    });

    // Ensure within each date group, newest orders are at the top
    for (const [, entries] of sortedGroups) {
      entries.sort((a, b) => {
        const aTime = new Date(a.data.createdAt).getTime();
        const bTime = new Date(b.data.createdAt).getTime();
        return bTime - aTime;
      });
    }

    return sortedGroups;
  }, [sectionEntries, typeFilter]);

  const FilterTab = ({
    label,
    active,
    onPress,
  }: {
    label: string;
    active: boolean;
    onPress: () => void;
  }) => (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[styles.filterTab, active && styles.filterTabActive]}
    >
      <Text
        style={[styles.filterTabText, active && styles.filterTabTextActive]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Orders</Text>
          <View style={{ marginTop: 4 }}>
            <StallSelector />
          </View>
        </View>
        {resolvedOperationalDate ? (
          <View style={styles.dateBadge}>
            <Ionicons
              name="calendar-outline"
              size={14}
              color={Colors.primary}
            />
            <Text style={styles.dateBadgeText}>
              {resolvedOperationalDate}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Filters Area */}
      <View style={styles.filtersContainer}>
        <View style={styles.sectionFilters}>
          <FilterTab
            label="Active Orders"
            active={sectionFilter === 'active'}
            onPress={() => setSectionFilter('active')}
          />
          <FilterTab
            label="Completed"
            active={sectionFilter === 'completed'}
            onPress={() => setSectionFilter('completed')}
          />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.typeFiltersScroll}
        >
          <CompactFilterChip
            label="All Types"
            count={counts.allCount}
            active={typeFilter === 'all'}
            onPress={() => setTypeFilter('all')}
            activeColor={Colors.primary}
          />
          <CompactFilterChip
            label="Direct"
            count={counts.directCount}
            active={typeFilter === 'direct'}
            onPress={() => setTypeFilter('direct')}
            activeColor="#3B82F6"
          />
          <CompactFilterChip
            label="Subscription"
            count={counts.subscriptionCount}
            active={typeFilter === 'subscription'}
            onPress={() => setTypeFilter('subscription')}
            activeColor="#8B5CF6"
          />
          <CompactFilterChip
            label="Walk-in"
            count={counts.walkInCount}
            active={typeFilter === 'walk_in'}
            onPress={() => setTypeFilter('walk_in')}
            activeColor="#06B6D4"
          />
        </ScrollView>
      </View>

      {/* List / Main Body */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={handleRefresh}
              tintColor={Colors.primary}
            />
          }
        >
          {groupedEntries.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons
                name="receipt-outline"
                size={48}
                color={Colors.textTertiary}
              />
              <Text style={styles.emptyTitle}>No Orders Found</Text>
              <Text style={styles.emptyDesc}>
                There are no {sectionFilter}{' '}
                {typeFilter === 'all'
                  ? ''
                  : typeFilter === 'walk_in'
                  ? 'walk-in'
                  : typeFilter}{' '}
                orders in the queue.
              </Text>
            </View>
          ) : (
            groupedEntries.map(([date, dateEntries]) => {
              const formattedDate = new Date(date).toLocaleDateString(
                'en-US',
                {
                  weekday: 'long',
                  month: 'short',
                  day: 'numeric',
                }
              );

              return (
                <View key={date} style={styles.dateGroup}>
                  <View style={styles.dateHeader}>
                    <Ionicons
                      name="calendar"
                      size={16}
                      color={Colors.primary}
                    />
                    <Text style={styles.dateHeaderText}>
                      {date === 'No Date' ? date : formattedDate}
                    </Text>
                    <Text style={styles.dateCount}>
                      {dateEntries.length}
                    </Text>
                  </View>

                  {dateEntries.map((entry) => {
                    if (entry.type === 'walk_in') {
                      return (
                        <WalkInCard
                          key={`wi-${entry.data.id}`}
                          walkIn={entry.data}
                        />
                      );
                    }
                    return (
                      <OrderCard
                        key={`ord-${entry.data.id}`}
                        order={entry.data}
                      />
                    );
                  })}
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {/* Clean Bottom Error Toast */}
      <BottomErrorToast
        visible={isError && !dismissedError}
        message="Could not load walk-in sales."
        onClose={() => setDismissedError(true)}
        onRetry={handleRefresh}
      />
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
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.background,
  },
  headerTitle: {
    fontFamily: Typography.family.bold,
    fontSize: Typography.size.xl,
    color: Colors.textPrimary,
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radii.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dateBadgeText: {
    fontFamily: Typography.family.semiBold,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  filtersContainer: {
    paddingBottom: Spacing.sm,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  sectionFilters: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.base,
    gap: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  filterTab: {
    paddingVertical: Spacing.xs,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  filterTabActive: {
    borderBottomColor: Colors.primary,
  },
  filterTabText: {
    fontFamily: Typography.family.medium,
    fontSize: 15,
    color: Colors.textSecondary,
  },
  filterTabTextActive: {
    fontFamily: Typography.family.bold,
    color: Colors.primary,
  },
  typeFiltersScroll: {
    paddingHorizontal: Spacing.base,
    gap: Spacing.xs,
    alignItems: 'center',
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.base,
    paddingBottom: Spacing['5xl'],
  },
  dateGroup: {
    marginBottom: Spacing.lg,
  },
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  dateHeaderText: {
    fontFamily: Typography.family.bold,
    fontSize: Typography.size.base,
    color: Colors.textPrimary,
  },
  dateCount: {
    fontFamily: Typography.family.bold,
    fontSize: Typography.size.xs,
    color: Colors.textSecondary,
    backgroundColor: Colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radii.full,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing['3xl'],
  },
  emptyTitle: {
    fontFamily: Typography.family.semiBold,
    fontSize: Typography.size.lg,
    color: Colors.textPrimary,
    marginTop: Spacing.base,
    marginBottom: Spacing.xs,
  },
  emptyDesc: {
    fontFamily: Typography.family.regular,
    fontSize: Typography.size.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
    lineHeight: 20,
  },
});
