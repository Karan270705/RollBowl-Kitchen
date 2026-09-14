import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
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
  useUpdateMenuSchedule,
  useRemoveMealFromMenu,
  useCopyMenu,
} from '@/src/hooks/useMenu';
import { enableMeal } from '@/src/services/menu';
import { generateMenuScheduleTimestamps } from '@/src/utils/operationalDate';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useHolidayForDate } from '@/src/hooks/useHolidays';
import { Ionicons } from '@expo/vector-icons';
import { StallSelector } from '@/src/components/stall/StallSelector';

export default function MenuScreen() {
  const insets = useSafeAreaInsets();
  const [selectedDateStr, setSelectedDateStr] = useState<string>(
    formatDateKey(getOperationalContext().operationalDate)
  );
  const [modalVisible, setModalVisible] = useState(false);
  const queryClient = useQueryClient();

  const { data: holidayData } = useHolidayForDate(selectedDateStr);

  const isLocked = isMenuLocked(selectedDateStr) || !!holidayData;

  // Queries
  const { data: menuData, isLoading: menuLoading } = useMenuForDate(selectedDateStr);
  const { data: mealsPool = [], isLoading: poolLoading } = useMealsPool();

  // Mutations
  const { mutate: saveMeals, isPending: saving } = useSaveMenuMeals(
    selectedDateStr,
    () => {
      console.log('[Menu] Meals saved successfully');
      setModalVisible(false);
    },
    (error: Error) => {
      console.error('[Menu] Failed to save meals:', error);
      Alert.alert(
        'Failed to Add Items',
        `Could not add items to menu: ${error.message}\n\nPlease try again or contact support if the issue persists.`,
        [{ text: 'OK' }]
      );
    }
  );
  
  const { mutate: updateMenu } = useUpdateMenuSchedule(
    selectedDateStr,
    undefined,
    (error: Error) => {
      console.error('[Menu] Failed to update menu schedule:', error);
      Alert.alert(
        'Failed to Update Menu',
        `Could not update menu schedule: ${error.message}\n\nPlease try again or contact support if the issue persists.`,
        [{ text: 'OK' }]
      );
    }
  );
  
  const { mutate: removeMeal } = useRemoveMealFromMenu(
    selectedDateStr,
    undefined,
    (error: Error) => {
      console.error('[Menu] Failed to remove item:', error);
      Alert.alert(
        'Failed to Remove Item',
        `Could not remove item: ${error.message}\n\nPlease try again or contact support if the issue persists.`,
        [{ text: 'OK' }]
      );
    }
  );
  
  const { mutate: copyMenuMutate, isPending: copying } = useCopyMenu(
    selectedDateStr,
    undefined,
    (error: Error) => {
      console.error('[Menu] Failed to copy menu:', error);
      Alert.alert(
        'Failed to Copy Menu',
        `Could not copy menu: ${error.message}\n\nPlease try again or contact support if the issue persists.`,
        [{ text: 'OK' }]
      );
    }
  );

  const schedule = menuData?.schedule;
  const items = menuData?.items || [];
  
  // Local State for Scheduling
  const [orderingStart, setOrderingStart] = useState<Date | null>(null);
  const [orderingEnd, setOrderingEnd] = useState<Date | null>(null);
  const [deliveryStart, setDeliveryStart] = useState<Date | null>(null);
  const [deliveryEnd, setDeliveryEnd] = useState<Date | null>(null);
  const [showStartPicker, setShowStartPicker] = useState<{ mode: 'date' | 'time', visible: boolean }>({ mode: 'date', visible: false });
  const [showEndPicker, setShowEndPicker] = useState<{ mode: 'date' | 'time', visible: boolean }>({ mode: 'date', visible: false });
  const [showDeliveryStartPicker, setShowDeliveryStartPicker] = useState<{ mode: 'date' | 'time', visible: boolean }>({ mode: 'date', visible: false });
  const [showDeliveryEndPicker, setShowDeliveryEndPicker] = useState<{ mode: 'date' | 'time', visible: boolean }>({ mode: 'date', visible: false });
  const [isEditingSchedule, setIsEditingSchedule] = useState(false);

  React.useEffect(() => {
    if (schedule?.visibleFrom && schedule?.orderCutoff && schedule?.deliveryStartAt && schedule?.deliveryEndAt) {
      setOrderingStart(new Date(schedule.visibleFrom));
      setOrderingEnd(new Date(schedule.orderCutoff));
      setDeliveryStart(new Date(schedule.deliveryStartAt));
      setDeliveryEnd(new Date(schedule.deliveryEndAt));
    } else {
      const defaults = generateMenuScheduleTimestamps(selectedDateStr);
      setOrderingStart(new Date(defaults.visibleFrom));
      setOrderingEnd(new Date(defaults.orderCutoff));
      setDeliveryStart(new Date(defaults.deliveryStartAt));
      setDeliveryEnd(new Date(defaults.deliveryEndAt));
    }
    setIsEditingSchedule(false);
  }, [schedule, selectedDateStr]);

  const handleSaveSchedule = () => {
    if (!orderingStart || !orderingEnd || !deliveryStart || !deliveryEnd) return;
    if (orderingEnd <= orderingStart) {
      Alert.alert('Validation Error', 'Ordering End must be after Ordering Start.');
      return;
    }
    if (deliveryEnd <= deliveryStart) {
      Alert.alert('Validation Error', 'Delivery End must be after Delivery Start.');
      return;
    }
    if (schedule?.id) {
      updateMenu({
        scheduleId: schedule.id,
        visibleFrom: orderingStart.toISOString(),
        orderCutoff: orderingEnd.toISOString(),
        deliveryStartAt: deliveryStart.toISOString(),
        deliveryEndAt: deliveryEnd.toISOString()
      }, {
        onSuccess: () => setIsEditingSchedule(false),
        onError: (err: any) => Alert.alert('Error', err.message)
      });
    } else {
      setIsEditingSchedule(false);
    }
  };
  
  const currentItemIds = items.map((i: any) => i.mealId);

  const handleSaveMeals = async (mealIds: string[]) => {
    const unavailableSelected = mealsPool.filter((m: any) => mealIds.includes(m.id) && !m.isAvailable);
    if (unavailableSelected.length > 0) {
      const names = unavailableSelected.map((m: any) => m.name).join(', ');
      Alert.alert(
        'Unavailable Meals Selected',
        `${names} is currently disabled in the catalogue. Enable it before publishing.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Enable and Publish', 
            onPress: async () => {
              try {
                for (const m of unavailableSelected) {
                  await enableMeal(m.id);
                }
                saveMeals({ 
                  scheduleId: schedule?.id || null, 
                  mealIds,
                  orderingStart: orderingStart?.toISOString(),
                  orderingEnd: orderingEnd?.toISOString(),
                  deliveryStart: deliveryStart?.toISOString(),
                  deliveryEnd: deliveryEnd?.toISOString()
                });
              } catch (e: any) {
                Alert.alert('Error', e.message);
              }
            } 
          }
        ]
      );
      return;
    }
    saveMeals({ 
      scheduleId: schedule?.id || null, 
      mealIds,
      orderingStart: orderingStart?.toISOString(),
      orderingEnd: orderingEnd?.toISOString(),
      deliveryStart: deliveryStart?.toISOString(),
      deliveryEnd: deliveryEnd?.toISOString()
    });
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

  const handleEnableMeal = async (mealId: string) => {
    try {
      await enableMeal(mealId);
      Alert.alert('Success', 'Meal enabled successfully.');
      queryClient.invalidateQueries({ queryKey: ['meals'] });
      queryClient.invalidateQueries({ queryKey: ['menu', selectedDateStr] });
    } catch (e: any) {
      Alert.alert('Error', e.message);
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
        <View>
          <Text style={styles.headerTitle}>Menu Planner</Text>
          <View style={{ marginTop: 4 }}>
            <StallSelector />
          </View>
        </View>
      </View>

      <CalendarStrip
        selectedDate={selectedDateStr}
        onSelectDate={setSelectedDateStr}
        daysAhead={14}
      />

      <View style={styles.contentHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
          <Text style={styles.dateLabel}>{formattedHeaderDate}</Text>
          {schedule?.isPublished && items.length > 0 && (
            <View style={{ backgroundColor: Colors.success + '20', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, borderWidth: 1, borderColor: Colors.success }}>
              <Text style={{ color: Colors.success, fontSize: 12, fontFamily: Typography.family.bold }}>PUBLISHED</Text>
            </View>
          )}
        </View>
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

      {!menuLoading && (
        <View style={styles.scheduleCard}>
          <View style={styles.scheduleHeader}>
            <Ionicons name="time-outline" size={20} color={Colors.textPrimary} />
            <Text style={styles.scheduleTitle}>Ordering Window</Text>
            {!isLocked && (
              isEditingSchedule ? (
                <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                  <Button variant="ghost" title="Cancel" onPress={() => setIsEditingSchedule(false)} style={{ paddingHorizontal: Spacing.sm, minHeight: 0 }} />
                  <Button variant="primary" title="Save" onPress={handleSaveSchedule} style={{ paddingHorizontal: Spacing.sm, minHeight: 0 }} />
                </View>
              ) : (
                <Button variant="outline" title="Edit" onPress={() => setIsEditingSchedule(true)} style={{ paddingHorizontal: Spacing.sm, minHeight: 0 }} />
              )
            )}
          </View>
          
          <View style={styles.scheduleRow}>
            <View style={styles.scheduleCol}>
              <Text style={styles.scheduleLabel}>Start</Text>
              {isEditingSchedule ? (
                <View style={{ flexDirection: 'row', gap: Spacing.xs }}>
                  <Button variant="outline" title={orderingStart ? orderingStart.toLocaleDateString([], { month: 'short', day: 'numeric' }) : '...'} onPress={() => setShowStartPicker({ mode: 'date', visible: true })} style={{ paddingHorizontal: Spacing.xs, minHeight: 0, flex: 1 }} />
                  <Button variant="outline" title={orderingStart ? orderingStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'} onPress={() => setShowStartPicker({ mode: 'time', visible: true })} style={{ paddingHorizontal: Spacing.xs, minHeight: 0, flex: 1 }} />
                </View>
              ) : (
                <Text style={styles.scheduleValue}>
                  {orderingStart ? `${orderingStart.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${orderingStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : '...'}
                </Text>
              )}
            </View>
            <View style={styles.scheduleCol}>
              <Text style={styles.scheduleLabel}>End</Text>
              {isEditingSchedule ? (
                <View style={{ flexDirection: 'row', gap: Spacing.xs }}>
                  <Button variant="outline" title={orderingEnd ? orderingEnd.toLocaleDateString([], { month: 'short', day: 'numeric' }) : '...'} onPress={() => setShowEndPicker({ mode: 'date', visible: true })} style={{ paddingHorizontal: Spacing.xs, minHeight: 0, flex: 1 }} />
                  <Button variant="outline" title={orderingEnd ? orderingEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'} onPress={() => setShowEndPicker({ mode: 'time', visible: true })} style={{ paddingHorizontal: Spacing.xs, minHeight: 0, flex: 1 }} />
                </View>
              ) : (
                <Text style={styles.scheduleValue}>
                  {orderingEnd ? `${orderingEnd.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${orderingEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : '...'}
                </Text>
              )}
            </View>
          </View>
          
          <View style={[styles.scheduleHeader, { marginTop: Spacing.base }]}>
            <Ionicons name="bicycle-outline" size={20} color={Colors.textPrimary} />
            <Text style={styles.scheduleTitle}>Delivery Window</Text>
          </View>
          
          <View style={styles.scheduleRow}>
            <View style={styles.scheduleCol}>
              <Text style={styles.scheduleLabel}>Start</Text>
              {isEditingSchedule ? (
                <View style={{ flexDirection: 'row', gap: Spacing.xs }}>
                  <Button variant="outline" title={deliveryStart ? deliveryStart.toLocaleDateString([], { month: 'short', day: 'numeric' }) : '...'} onPress={() => setShowDeliveryStartPicker({ mode: 'date', visible: true })} style={{ paddingHorizontal: Spacing.xs, minHeight: 0, flex: 1 }} />
                  <Button variant="outline" title={deliveryStart ? deliveryStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'} onPress={() => setShowDeliveryStartPicker({ mode: 'time', visible: true })} style={{ paddingHorizontal: Spacing.xs, minHeight: 0, flex: 1 }} />
                </View>
              ) : (
                <Text style={styles.scheduleValue}>
                  {deliveryStart ? `${deliveryStart.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${deliveryStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : '...'}
                </Text>
              )}
            </View>
            <View style={styles.scheduleCol}>
              <Text style={styles.scheduleLabel}>End</Text>
              {isEditingSchedule ? (
                <View style={{ flexDirection: 'row', gap: Spacing.xs }}>
                  <Button variant="outline" title={deliveryEnd ? deliveryEnd.toLocaleDateString([], { month: 'short', day: 'numeric' }) : '...'} onPress={() => setShowDeliveryEndPicker({ mode: 'date', visible: true })} style={{ paddingHorizontal: Spacing.xs, minHeight: 0, flex: 1 }} />
                  <Button variant="outline" title={deliveryEnd ? deliveryEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'} onPress={() => setShowDeliveryEndPicker({ mode: 'time', visible: true })} style={{ paddingHorizontal: Spacing.xs, minHeight: 0, flex: 1 }} />
                </View>
              ) : (
                <Text style={styles.scheduleValue}>
                  {deliveryEnd ? `${deliveryEnd.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${deliveryEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : '...'}
                </Text>
              )}
            </View>
          </View>
        </View>
      )}

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
            items.map((item: any) => (
              <MenuItemCard
                key={item.id}
                item={item}
                onRemove={handleRemoveMeal}
                onEnable={handleEnableMeal}
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

      {showStartPicker.visible && orderingStart && (
        <DateTimePicker
          value={orderingStart}
          mode={showStartPicker.mode}
          display="default"
          onValueChange={(event, d) => {
            setShowStartPicker({ ...showStartPicker, visible: false });
            if (d) {
              const newDate = new Date(orderingStart);
              if (showStartPicker.mode === 'date') {
                newDate.setFullYear(d.getFullYear(), d.getMonth(), d.getDate());
              } else {
                newDate.setHours(d.getHours(), d.getMinutes());
              }
              setOrderingStart(newDate);
            }
          }}
          onDismiss={() => setShowStartPicker({ ...showStartPicker, visible: false })}
        />
      )}
      {showEndPicker.visible && orderingEnd && (
        <DateTimePicker
          value={orderingEnd}
          mode={showEndPicker.mode}
          display="default"
          onValueChange={(event, d) => {
            setShowEndPicker({ ...showEndPicker, visible: false });
            if (d) {
              const newDate = new Date(orderingEnd);
              if (showEndPicker.mode === 'date') {
                newDate.setFullYear(d.getFullYear(), d.getMonth(), d.getDate());
              } else {
                newDate.setHours(d.getHours(), d.getMinutes());
              }
              setOrderingEnd(newDate);
            }
          }}
          onDismiss={() => setShowEndPicker({ ...showEndPicker, visible: false })}
        />
      )}
      {showDeliveryStartPicker.visible && deliveryStart && (
        <DateTimePicker
          value={deliveryStart}
          mode={showDeliveryStartPicker.mode}
          display="default"
          onValueChange={(event, d) => {
            setShowDeliveryStartPicker({ ...showDeliveryStartPicker, visible: false });
            if (d) {
              const newDate = new Date(deliveryStart);
              if (showDeliveryStartPicker.mode === 'date') {
                newDate.setFullYear(d.getFullYear(), d.getMonth(), d.getDate());
              } else {
                newDate.setHours(d.getHours(), d.getMinutes());
              }
              setDeliveryStart(newDate);
            }
          }}
          onDismiss={() => setShowDeliveryStartPicker({ ...showDeliveryStartPicker, visible: false })}
        />
      )}
      {showDeliveryEndPicker.visible && deliveryEnd && (
        <DateTimePicker
          value={deliveryEnd}
          mode={showDeliveryEndPicker.mode}
          display="default"
          onValueChange={(event, d) => {
            setShowDeliveryEndPicker({ ...showDeliveryEndPicker, visible: false });
            if (d) {
              const newDate = new Date(deliveryEnd);
              if (showDeliveryEndPicker.mode === 'date') {
                newDate.setFullYear(d.getFullYear(), d.getMonth(), d.getDate());
              } else {
                newDate.setHours(d.getHours(), d.getMinutes());
              }
              setDeliveryEnd(newDate);
            }
          }}
          onDismiss={() => setShowDeliveryEndPicker({ ...showDeliveryEndPicker, visible: false })}
        />
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
  scheduleCard: {
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.base,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.base,
  },
  scheduleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  scheduleTitle: {
    fontFamily: Typography.family.semiBold,
    fontSize: Typography.size.base,
    color: Colors.textPrimary,
    flex: 1,
    marginLeft: Spacing.sm,
  },
  scheduleRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  scheduleCol: {
    flex: 1,
    gap: 4,
  },
  scheduleLabel: {
    fontFamily: Typography.family.medium,
    fontSize: Typography.size.xs,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
  },
  scheduleValue: {
    fontFamily: Typography.family.medium,
    fontSize: Typography.size.sm,
    color: Colors.textPrimary,
  },
});
