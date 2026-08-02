import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radii } from '@/src/constants/theme';
import { OrderCard } from '@/src/components/orders/OrderCard';
import { WalkInCard } from '@/src/components/orders/WalkInCard';
import { useOrderHistory } from '@/src/hooks/useOrders';
import { useOperationalContext } from '@/src/hooks/useOperationalContext';
import { HistoryEntry } from '@/src/types/models';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';

type SectionFilter = 'active' | 'completed';
type TypeFilter = 'all' | 'direct' | 'subscription' | 'walk_in';

export default function OrdersScreen() {
  const insets = useSafeAreaInsets();
  const { stallId, resolvedOperationalDate } = useOperationalContext();
  const { data: history, isLoading, refetch, isRefetching } = useOrderHistory(stallId, resolvedOperationalDate);

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const [sectionFilter, setSectionFilter] = useState<SectionFilter>('active');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');

  // Group entries by date
  const groupedEntries = useMemo(() => {
    // 1. Filter by section (Active vs Completed)
    let filtered = history.filter(entry => {
      if (entry.type === 'walk_in') {
        // Walk-in sales are always completed
        return sectionFilter === 'completed';
      }
      // Order entries
      const order = entry.data;
      return sectionFilter === 'active'
        ? ['pending', 'confirmed', 'preparing', 'ready'].includes(order.status)
        : ['picked_up', 'delivered'].includes(order.status);
    });

    // 2. Filter by order type
    if (typeFilter === 'direct') {
      filtered = filtered.filter(e => e.type === 'order' && e.data.orderType !== 'subscription');
    } else if (typeFilter === 'subscription') {
      filtered = filtered.filter(e => e.type === 'order' && e.data.orderType === 'subscription');
    } else if (typeFilter === 'walk_in') {
      filtered = filtered.filter(e => e.type === 'walk_in');
    }

    // 3. Group by date
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

    // Sort dates ascending
    return Object.entries(groups).sort(([dateA], [dateB]) => dateA.localeCompare(dateB));
  }, [history, sectionFilter, typeFilter]);

  const FilterTab = ({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) => (
    <Text 
      onPress={onPress} 
      style={[styles.filterTab, active && styles.filterTabActive]}
    >
      {label}
    </Text>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Orders</Text>
      </View>

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

        <View style={styles.typeFilters}>
          <Text 
            onPress={() => setTypeFilter('all')}
            style={[styles.typeBadge, typeFilter === 'all' && styles.typeBadgeActive]}
          >
            All Types
          </Text>
          <Text 
            onPress={() => setTypeFilter('direct')}
            style={[styles.typeBadge, typeFilter === 'direct' && styles.typeBadgeActive]}
          >
            Direct
          </Text>
          <Text 
            onPress={() => setTypeFilter('subscription')}
            style={[styles.typeBadge, typeFilter === 'subscription' && styles.typeBadgeActive]}
          >
            Subscription
          </Text>
          <Text 
            onPress={() => setTypeFilter('walk_in')}
            style={[
              styles.typeBadge, 
              typeFilter === 'walk_in' && styles.typeBadgeWalkInActive,
            ]}
          >
            Walk-in
          </Text>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <ScrollView 
          style={styles.list} 
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.primary} />}
        >
          {groupedEntries.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={48} color={Colors.textTertiary} />
              <Text style={styles.emptyTitle}>No Orders Found</Text>
              <Text style={styles.emptyDesc}>
                There are no {sectionFilter} {typeFilter === 'all' ? '' : typeFilter === 'walk_in' ? 'walk-in' : typeFilter} orders in the queue.
              </Text>
            </View>
          ) : (
            groupedEntries.map(([date, dateEntries]) => {
              const formattedDate = new Date(date).toLocaleDateString('en-US', {
                weekday: 'long', month: 'short', day: 'numeric'
              });
              
              return (
                <View key={date} style={styles.dateGroup}>
                  <View style={styles.dateHeader}>
                    <Ionicons name="calendar" size={16} color={Colors.primary} />
                    <Text style={styles.dateHeaderText}>{date === 'No Date' ? date : formattedDate}</Text>
                    <Text style={styles.dateCount}>{dateEntries.length}</Text>
                  </View>
                  
                  {dateEntries.map(entry => {
                    if (entry.type === 'walk_in') {
                      return <WalkInCard key={`wi-${entry.data.id}`} walkIn={entry.data} />;
                    }
                    return <OrderCard key={`ord-${entry.data.id}`} order={entry.data} />;
                  })}
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.background,
  },
  headerTitle: {
    fontFamily: Typography.family.bold,
    fontSize: Typography.size.xl,
    color: Colors.textPrimary,
  },
  filtersContainer: {
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.sm,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  sectionFilters: {
    flexDirection: 'row',
    gap: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  filterTab: {
    fontFamily: Typography.family.semiBold,
    fontSize: Typography.size.base,
    color: Colors.textSecondary,
    paddingBottom: Spacing.xs,
  },
  filterTabActive: {
    color: Colors.primary,
    borderBottomWidth: 2,
    borderBottomColor: Colors.primary,
  },
  typeFilters: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  typeBadge: {
    fontFamily: Typography.family.medium,
    fontSize: Typography.size.xs,
    color: Colors.textSecondary,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radii.full,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  typeBadgeActive: {
    color: Colors.background,
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  typeBadgeWalkInActive: {
    color: Colors.textInverse,
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
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
    marginBottom: Spacing.xl,
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
    fontFamily: Typography.family.medium,
    fontSize: Typography.size.xs,
    color: Colors.textSecondary,
    backgroundColor: Colors.surface,
    paddingHorizontal: 6,
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
  },
});
