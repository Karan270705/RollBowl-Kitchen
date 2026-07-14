import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';

import { Colors, Typography, Spacing, Radii } from '@/src/constants/theme';
import { Card } from '@/src/components/ui/Card';
import { Button } from '@/src/components/ui/Button';
import { getKitchenDate, formatDateKey, formatDisplayDate } from '@/src/utils/helpers';
import { useInventoryBatches, useLiveInventoryStatus, useInventoryBatchItems, useActivateBatch, useCancelBatch, useCloseBatch } from '@/src/hooks/useInventory';
import { getPrimaryStallId } from '@/src/services/menu';

const BatchCard = ({ batch, onActivate, onCancel, onClose }: { batch: any, onActivate: (id: string) => void, onCancel: (id: string) => void, onClose: (id: string) => void }) => {
  const router = useRouter();
  const { data: items } = useInventoryBatchItems(batch.id);
  const { data: liveStatus } = useLiveInventoryStatus(batch.id);

  let itemCount = 0;
  let loaded = 0;
  let reserved = 0;
  let fulfilled = 0;
  let remaining = 0;
  let customerAvail = 0;

  if (batch.status === 'draft') {
    itemCount = items?.length || 0;
    loaded = items?.reduce((sum, i) => sum + i.loaded_quantity, 0) || 0;
  } else {
    itemCount = liveStatus?.length || 0;
    loaded = liveStatus?.reduce((sum, i) => sum + i.loaded_quantity, 0) || 0;
    reserved = liveStatus?.reduce((sum, i) => sum + i.active_reserved, 0) || 0;
    fulfilled = liveStatus?.reduce((sum, i) => sum + i.fulfilled, 0) || 0;
    remaining = liveStatus?.reduce((sum, i) => sum + i.remaining_physical, 0) || 0;
    customerAvail = liveStatus?.reduce((sum, i) => sum + i.customer_available, 0) || 0;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return Colors.success;
      case 'draft': return Colors.warning;
      case 'closed': return Colors.textSecondary;
      case 'cancelled': return Colors.error;
      default: return Colors.textPrimary;
    }
  };

  const statusColor = getStatusColor(batch.status);

  return (
    <Card style={styles.batchCard}>
      <View style={styles.batchHeader}>
        <View>
          <Text style={styles.windowText}>
            {batch.window_start && batch.window_end 
              ? `${new Date(batch.window_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date(batch.window_end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
              : 'Window Not Set'}
          </Text>
          <Text style={styles.itemCountText}>{itemCount} Items</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColor + '1A', borderColor: statusColor + '40' }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>{batch.status.toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Loaded</Text>
          <Text style={styles.statValue}>{loaded}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Reserved</Text>
          <Text style={styles.statValue}>{reserved}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Fulfilled</Text>
          <Text style={styles.statValue}>{fulfilled}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Physical</Text>
          <Text style={styles.statValue}>{batch.status === 'draft' ? '-' : remaining}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Customer Avail</Text>
          <Text style={styles.statValue}>{batch.status === 'draft' ? '-' : customerAvail}</Text>
        </View>
      </View>

      <View style={styles.actionsRow}>
        {batch.status === 'draft' && (
          <>
            <Button title="Edit Draft" variant="outline" onPress={() => router.push(`/(app)/(inventory)/${batch.id}`)} style={{ flex: 1, marginRight: Spacing.xs }} />
            <Button title="Activate" onPress={() => router.push(`/(app)/(inventory)/${batch.id}`)} style={{ flex: 1, marginLeft: Spacing.xs }} />
          </>
        )}
        {batch.status === 'active' && (
          <>
            <Button title="Live Inventory" onPress={() => router.push(`/(app)/(inventory)/${batch.id}`)} style={{ flex: 1 }} />
          </>
        )}
        {(batch.status === 'closed' || batch.status === 'cancelled') && (
          <Button title="View Summary" variant="outline" onPress={() => router.push(`/(app)/(inventory)/${batch.id}`)} style={{ flex: 1 }} />
        )}
      </View>
    </Card>
  );
};

export default function InventoryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState<Date>(getKitchenDate());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [stallId, setStallId] = useState<string>();

  useEffect(() => {
    getPrimaryStallId().then(setStallId).catch(console.error);
  }, []);

  const dateKey = formatDateKey(selectedDate);
  const { data: batches, isLoading } = useInventoryBatches(stallId, dateKey);

  return (
    <View style={[styles.container, { paddingTop: insets.top + Spacing.base }]}>
      <View style={styles.header}>
        <Text style={styles.screenTitle}>Inventory</Text>
        <TouchableOpacity 
          style={styles.dateSelector}
          onPress={() => setShowDatePicker(true)}
        >
          <Ionicons name="calendar-outline" size={20} color={Colors.primary} />
          <Text style={styles.dateSelectorText}>{formatDisplayDate(selectedDate)}</Text>
          <Ionicons name="chevron-down" size={16} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {showDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="default"
          onChange={(event, date) => {
            setShowDatePicker(false);
            if (date) setSelectedDate(date);
          }}
        />
      )}

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: Spacing.xl }} />
        ) : batches?.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="cube-outline" size={48} color={Colors.textTertiary} />
            <Text style={styles.emptyStateTitle}>No Batches Found</Text>
            <Text style={styles.emptyStateDesc}>There are no inventory batches scheduled for this date.</Text>
          </View>
        ) : (
          batches?.map(batch => (
            <BatchCard 
              key={batch.id} 
              batch={batch} 
              onActivate={() => {}} 
              onCancel={() => {}} 
              onClose={() => {}} 
            />
          ))
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom || Spacing.base }]}>
        <Button 
          title="Create Draft Batch"
          fullWidth
          onPress={() => router.push('/(app)/(inventory)/create')}
          disabled={!stallId}
        />
      </View>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.xl,
  },
  screenTitle: {
    fontFamily: Typography.family.bold,
    fontSize: Typography.size.xl,
    color: Colors.textPrimary,
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.primaryMuted,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.full,
  },
  dateSelectorText: {
    fontFamily: Typography.family.medium,
    fontSize: Typography.size.sm,
    color: Colors.primary,
  },
  content: {
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing['3xl'],
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Spacing['4xl'],
  },
  emptyStateTitle: {
    fontFamily: Typography.family.semiBold,
    fontSize: Typography.size.lg,
    color: Colors.textSecondary,
    marginTop: Spacing.base,
    marginBottom: Spacing.xs,
  },
  emptyStateDesc: {
    fontFamily: Typography.family.regular,
    fontSize: Typography.size.sm,
    color: Colors.textTertiary,
    textAlign: 'center',
  },
  footer: {
    padding: Spacing.base,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderColor: Colors.border,
  },
  batchCard: {
    marginBottom: Spacing.base,
  },
  batchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.base,
  },
  windowText: {
    fontFamily: Typography.family.bold,
    fontSize: Typography.size.lg,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  itemCountText: {
    fontFamily: Typography.family.regular,
    fontSize: Typography.size.sm,
    color: Colors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radii.full,
    borderWidth: 1,
  },
  statusText: {
    fontFamily: Typography.family.bold,
    fontSize: Typography.size.xs,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    backgroundColor: Colors.background,
    padding: Spacing.sm,
    borderRadius: Radii.sm,
    marginBottom: Spacing.lg,
  },
  statBox: {
    width: '30%',
  },
  statLabel: {
    fontFamily: Typography.family.medium,
    fontSize: Typography.size.xs,
    color: Colors.textTertiary,
    textTransform: 'uppercase',
  },
  statValue: {
    fontFamily: Typography.family.bold,
    fontSize: Typography.size.base,
    color: Colors.textPrimary,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  }
});
