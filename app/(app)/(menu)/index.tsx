import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radii } from '@/src/constants/theme';
import { CalendarStrip } from '@/src/components/ui/CalendarStrip';
import { MenuItemCard } from '@/src/components/menu/MenuItemCard';
import { MealSelectionModal } from '@/src/components/menu/MealSelectionModal';
import { Button } from '@/src/components/ui/Button';
import { getOperationalContext, isMenuLocked, formatDateKey } from '@/src/utils/helpers';
import {
  useMenuForDate,
  useMealsPool,
  useSaveMenuMeals,
  useRemoveMealFromMenu,
  useCopyMenu,
} from '@/src/hooks/useMenu';
import { useHolidayForDate } from '@/src/hooks/useHolidays';
import { Ionicons } from '@expo/vector-icons';

export default function MenuScreen() {
  const insets = useSafeAreaInsets();
  const [selectedDateStr, setSelectedDateStr] = useState<string>(
    formatDateKey(getOperationalContext().operationalDate)
  );
  const [modalVisible, setModalVisible] = useState(false);

  const { data: holidayData } = useHolidayForDate(selectedDateStr);

  const isLocked = isMenuLocked(selectedDateStr) || !!holidayData;

  // Queries
  const { data: menuData, isLoading: menuLoading } = useMenuForDate(selectedDateStr);
  const { data: mealsPool = [], isLoading: poolLoading } = useMealsPool();

  // Mutations
  const { mutate: saveMeals, isPending: saving } = useSaveMenuMeals(selectedDateStr);
  const { mutate: removeMeal } = useRemoveMealFromMenu(selectedDateStr);
  const { mutate: copyMenuMutate, isPending: copying } = useCopyMenu(selectedDateStr);

  const schedule = menuData?.schedule;
  const items = menuData?.items || [];
  
  const currentItemIds = items.map((i) => i.mealId);

  const handleSaveMeals = (mealIds: string[]) => {
    saveMeals({ scheduleId: schedule?.id || null, mealIds });
  };

  const handleRemoveMeal = (mealId: string) => {
    if (!schedule?.id) return;
    
    if (schedule.isPublished) {
      Alert.alert('Remove Item', 'Are you sure you want to remove this item from the menu?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => removeMeal({ scheduleId: schedule.id, mealId }),
        },
      ]);
    } else {
      removeMeal({ scheduleId: schedule.id, mealId });
    }
  };

  const handleCopyFromToday = () => {
    const todayStr = formatDateKey(getOperationalContext().executionDate);
    if (todayStr === selectedDateStr) {
      Alert.alert('Invalid', 'Cannot copy today to today.');
      return;
    }
    copyMenuMutate(todayStr, {
      onError: (err: any) => Alert.alert('Error', err.message),
    });
  };

  const formattedHeaderDate = new Date(selectedDateStr).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Menu Planner</Text>
      </View>

      <CalendarStrip
        selectedDate={selectedDateStr}
        onSelectDate={setSelectedDateStr}
        daysAhead={14}
      />

      <View style={styles.contentHeader}>
        <Text style={styles.dateLabel}>{formattedHeaderDate}</Text>
        <Text style={styles.itemCount}>
          {menuLoading ? '...' : `${items.length} Items`}
        </Text>
      </View>

      {holidayData ? (
        <View style={[styles.lockedBanner, { backgroundColor: Colors.error + '20', borderColor: Colors.error }]}>
          <Ionicons name="warning" size={16} color={Colors.error} />
          <Text style={[styles.lockedText, { color: Colors.error, fontFamily: Typography.family.bold }]}>
            Holiday: {holidayData.title.toUpperCase()}. No menu can be published.
          </Text>
        </View>
      ) : isLocked ? (
        <View style={styles.lockedBanner}>
          <Ionicons name="lock-closed" size={16} color={Colors.warning} />
          <Text style={styles.lockedText}>Menu Locked: Orders have already closed for this date.</Text>
        </View>
      ) : null}

      {menuLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
          {items.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="restaurant-outline" size={48} color={Colors.textTertiary} />
              <Text style={styles.emptyTitle}>No Menu Configured</Text>
              <Text style={styles.emptyDesc}>
                {isLocked 
                  ? 'Menu is locked for this date. No items can be added.'
                  : `Add items to publish the menu for ${formattedHeaderDate}.`}
              </Text>
              {!isLocked && (
                <View style={styles.emptyActions}>
                  <Button 
                    title="Add Items" 
                    onPress={() => setModalVisible(true)} 
                    style={styles.actionBtn}
                  />
                  <Button 
                    title="Copy Today's Menu" 
                    variant="outline"
                    onPress={handleCopyFromToday}
                    loading={copying}
                    style={styles.actionBtn}
                  />
                </View>
              )}
            </View>
          ) : (
            items.map((item) => (
              <MenuItemCard
                key={item.id}
                item={item}
                onRemove={handleRemoveMeal}
                isLocked={isLocked}
              />
            ))
          )}
        </ScrollView>
      )}

      {items.length > 0 && !isLocked && (
        <View style={styles.floatingAction}>
          <Button 
            title="Add Items" 
            onPress={() => setModalVisible(true)} 
            fullWidth
            style={styles.fab}
          />
        </View>
      )}

      <MealSelectionModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        availableMeals={mealsPool}
        initialSelectedIds={currentItemIds}
        onSave={handleSaveMeals}
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
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.background,
  },
  headerTitle: {
    fontFamily: Typography.family.bold,
    fontSize: Typography.size.xl,
    color: Colors.textPrimary,
  },
  contentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.base,
    backgroundColor: Colors.background,
  },
  dateLabel: {
    fontFamily: Typography.family.bold,
    fontSize: Typography.size.lg,
    color: Colors.textPrimary,
  },
  itemCount: {
    fontFamily: Typography.family.medium,
    fontSize: Typography.size.sm,
    color: Colors.primary,
    backgroundColor: Colors.primaryMuted,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radii.full,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing['5xl'],
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
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.xl,
  },
  emptyActions: {
    width: '100%',
    gap: Spacing.base,
  },
  actionBtn: {
    width: '100%',
  },
  floatingAction: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.base,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  fab: {
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  lockedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.warningMuted,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.base,
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.base,
    borderRadius: Radii.md,
    gap: Spacing.xs,
  },
  lockedText: {
    fontFamily: Typography.family.medium,
    fontSize: Typography.size.sm,
    color: Colors.warning,
    flex: 1,
  },
});
