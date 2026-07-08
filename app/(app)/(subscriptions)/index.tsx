import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radii, Shadows } from '@/src/constants/theme';
import { useSubscribersList } from '@/src/services/subscriptions';
import { EmptyState, Input } from '@/src/components/ui';
import { useRouter } from 'expo-router';
import { formatDisplayDate, isExpiringSoon } from '@/src/utils/helpers';

export default function SubscriptionsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: subscribers = [], isLoading, error } = useSubscribersList();

  const activeCount = subscribers.filter(s => s.status === 'active').length;
  const expiredCount = subscribers.filter(s => s.status === 'expired').length;
  const totalCredits = subscribers
    .filter(s => s.status === 'active')
    .reduce((sum, s) => sum + s.remainingMeals, 0);

  const expiringSoonCount = subscribers.filter(s => isExpiringSoon(s.endDate) && s.status === 'active').length;

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('All');
  const [sortBy, setSortBy] = useState<'expiry' | 'credits' | 'name'>('expiry');

  const filteredAndSortedSubscribers = useMemo(() => {
    let result = [...subscribers];

    // Filter by Search
    if (searchQuery.trim()) {
      const lowerQ = searchQuery.toLowerCase();
      result = result.filter(s => 
        s.customerName.toLowerCase().includes(lowerQ) ||
        (s.email && s.email.toLowerCase().includes(lowerQ)) ||
        (s.phone && s.phone.toLowerCase().includes(lowerQ))
      );
    }

    // Filter by Tab
    if (activeTab === 'Expiring Soon') {
      result = result.filter(s => isExpiringSoon(s.endDate) && s.status === 'active');
    } else if (activeTab !== 'All') {
      result = result.filter(s => s.status === activeTab.toLowerCase());
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === 'expiry') {
        return new Date(a.endDate).getTime() - new Date(b.endDate).getTime();
      } else if (sortBy === 'credits') {
        return a.remainingMeals - b.remainingMeals;
      } else {
        return a.customerName.localeCompare(b.customerName);
      }
    });

    return result;
  }, [subscribers, searchQuery, activeTab, sortBy]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return Colors.success;
      case 'paused': return Colors.warning;
      case 'expired': return Colors.textTertiary;
      case 'cancelled': return Colors.error;
      default: return Colors.textSecondary;
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Subscribers</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        
        {/* Metrics Row */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.metricsContainer}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Active</Text>
            <Text style={[styles.metricValue, { color: Colors.success }]}>{activeCount}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Expiring Soon</Text>
            <Text style={[styles.metricValue, { color: Colors.warning }]}>{expiringSoonCount}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Expired</Text>
            <Text style={[styles.metricValue, { color: Colors.textTertiary }]}>{expiredCount}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Total Outstanding</Text>
            <Text style={[styles.metricValue, { color: Colors.primary }]}>{totalCredits} <Text style={{fontSize: 14, color: Colors.textSecondary}}>Credits</Text></Text>
          </View>
        </ScrollView>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Input 
            label="Search"
            placeholder="Search by name, email, or phone..." 
            value={searchQuery} 
            onChangeText={setSearchQuery} 
          />
        </View>

        {/* Filters and Sorting */}
        <View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsContainer}>
            {['All', 'Active', 'Expiring Soon', 'Paused', 'Expired', 'Cancelled'].map(tab => (
              <TouchableOpacity 
                key={tab} 
                style={[styles.tabChip, activeTab === tab && styles.tabChipActive]}
                onPress={() => setActiveTab(tab)}
              >
                <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <View style={styles.sortContainer}>
            <Text style={styles.sortLabel}>Sort by:</Text>
            {['expiry', 'credits', 'name'].map((sortKey) => (
              <TouchableOpacity key={sortKey} onPress={() => setSortBy(sortKey as any)}>
                <Text style={[styles.sortOption, sortBy === sortKey && styles.sortOptionActive]}>
                  {sortKey.charAt(0).toUpperCase() + sortKey.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.listHeader}>
          <Text style={styles.sectionTitle}>{activeTab} Subscribers ({filteredAndSortedSubscribers.length})</Text>
        </View>

        {isLoading ? (
          <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: Spacing['2xl'] }} />
        ) : error ? (
          <EmptyState icon="alert-circle-outline" title="Error Loading Data" subtitle="Failed to load subscribers." />
        ) : filteredAndSortedSubscribers.length === 0 ? (
          <EmptyState icon="people-outline" title="No Subscribers Found" subtitle="Try adjusting your search or filters." />
        ) : (
          <View style={styles.listContainer}>
            {filteredAndSortedSubscribers.map((sub) => (
              <TouchableOpacity 
                key={sub.id} 
                style={styles.subscriberCard}
                activeOpacity={0.7}
                onPress={() => router.push(`/(app)/(subscriptions)/${sub.id}` as any)}
              >
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.customerName}>{sub.customerName}</Text>
                    {sub.customerName === 'No Profile Name' && (
                      <Text style={styles.userIdText}>ID: {sub.userId}</Text>
                    )}
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(sub.status) + '15', borderColor: getStatusColor(sub.status) + '40' }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(sub.status) }]}>{sub.status.toUpperCase()}</Text>
                  </View>
                </View>

                  <View style={styles.contactInfo}>
                    <View style={styles.detailItem}>
                      <Ionicons name="mail-outline" size={14} color={Colors.textTertiary} />
                      <Text style={styles.detailText}>{sub.email || 'Not Provided'}</Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Ionicons name="call-outline" size={14} color={Colors.textTertiary} />
                      <Text style={styles.detailText}>{sub.phone || 'Not Provided'}</Text>
                    </View>
                  </View>

                  <View style={styles.cardDetails}>
                    <View style={styles.detailItem}>
                      <Ionicons name="card-outline" size={14} color={Colors.textTertiary} />
                      <Text style={styles.detailText}>{sub.planName}</Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Ionicons name="calendar-outline" size={14} color={Colors.textTertiary} />
                      <Text style={styles.detailText}>Expires: {formatDisplayDate(new Date(sub.endDate))}</Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Ionicons name="nutrition-outline" size={14} color={Colors.textTertiary} />
                      <Text style={[styles.detailText, { fontFamily: Typography.family.semiBold, color: Colors.textPrimary }]}>
                        {sub.remainingMeals} Credits Remaining
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
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
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: Typography.size['2xl'],
    fontFamily: Typography.family.bold,
    color: Colors.textPrimary,
  },
  content: {
    paddingBottom: Spacing['3xl'],
  },
  metricsContainer: {
    padding: Spacing.base,
    gap: Spacing.sm,
  },
  metricCard: {
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.border,
    minWidth: 130,
    justifyContent: 'space-between',
  },
  metricLabel: {
    fontSize: Typography.size.xs,
    fontFamily: Typography.family.medium,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metricValue: {
    fontSize: Typography.size['2xl'],
    fontFamily: Typography.family.bold,
  },
  sectionTitle: {
    fontSize: Typography.size.sm,
    fontFamily: Typography.family.semiBold,
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginHorizontal: Spacing.base,
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
  },
  listContainer: {
    paddingHorizontal: Spacing.base,
    gap: Spacing.sm,
  },
  subscriberCard: {
    backgroundColor: Colors.surfaceHighlight,
    padding: Spacing.base,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  searchContainer: {
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.sm,
  },
  tabsContainer: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    gap: Spacing.xs,
  },
  tabChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  tabChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  tabText: {
    fontSize: Typography.size.sm,
    fontFamily: Typography.family.medium,
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: '#FFF',
    fontFamily: Typography.family.bold,
  },
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  sortLabel: {
    fontSize: Typography.size.xs,
    color: Colors.textTertiary,
  },
  sortOption: {
    fontSize: Typography.size.xs,
    fontFamily: Typography.family.medium,
    color: Colors.textSecondary,
    paddingHorizontal: Spacing.xs,
  },
  sortOptionActive: {
    color: Colors.primary,
    fontFamily: Typography.family.bold,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  customerName: {
    fontSize: Typography.size.lg,
    fontFamily: Typography.family.bold,
    color: Colors.textPrimary,
  },
  userIdText: {
    fontSize: Typography.size.xs,
    fontFamily: Typography.family.medium,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radii.full,
    borderWidth: 1,
  },
  statusText: {
    fontSize: Typography.size.xs,
    fontFamily: Typography.family.bold,
  },
  contactInfo: {
    marginBottom: Spacing.sm,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    gap: 4,
  },
  cardDetails: {
    gap: Spacing.xs,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  detailText: {
    fontSize: Typography.size.sm,
    fontFamily: Typography.family.medium,
    color: Colors.textSecondary,
  },
});
