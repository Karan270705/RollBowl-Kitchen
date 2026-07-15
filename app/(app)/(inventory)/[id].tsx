import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { supabase } from '@/src/lib/supabase';
import { getPrimaryStallId } from '@/src/services/menu';

import { Colors, Typography, Spacing, Radii } from '@/src/constants/theme';
import { Button } from '@/src/components/ui/Button';
import { Card } from '@/src/components/ui/Card';
import { formatDisplayDate, formatTimeSlot } from '@/src/utils/helpers';
import { parseTimeToDateIST } from '@/src/utils/operationalDate';
import { fetchPublishedMenuMeals } from '@/src/services/inventory';
import { enableMeal, removeMealFromMenu } from '@/src/services/menu';
import { useQueryClient } from '@tanstack/react-query';
import { 
  useInventoryBatch, 
  useInventoryBatchItems, 
  useLiveInventoryStatus,
  useUpdateDraftBatch,
  useUpdateDraftItem,
  useRemoveDraftItem,
  useAddDraftItem
} from '@/src/hooks/useInventory';

import { ActivationModal, CloseModal, CancelModal, MovementModal } from '@/src/components/inventory/InventoryModals';

export default function InventoryBatchDetailScreen() {
  const { id } = useLocalSearchParams();
  const batchId = id as string;
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { data: batch, isLoading: isBatchLoading, refetch: refetchBatch } = useInventoryBatch(batchId);
  const { data: items, isLoading: isItemsLoading } = useInventoryBatchItems(batchId);
  const { data: liveStatus, isLoading: isLiveLoading } = useLiveInventoryStatus(batchId);

  const { mutateAsync: updateDraft } = useUpdateDraftBatch();
  const { mutateAsync: updateDraftItem } = useUpdateDraftItem();
  const { mutateAsync: removeDraftItem } = useRemoveDraftItem();
  const { mutateAsync: addDraftItem } = useAddDraftItem();

  const [stallId, setStallId] = useState<string>();
  const [scheduleId, setScheduleId] = useState<string | undefined>();
  const [availableMeals, setAvailableMeals] = useState<any[]>([]);
  const [isMealsLoading, setIsMealsLoading] = useState(false);
  const [mealsError, setMealsError] = useState(false);
  const queryClient = useQueryClient();

  // Modals
  const [showActivation, setShowActivation] = useState(false);
  const [showClose, setShowClose] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [showMovement, setShowMovement] = useState(false);
  const [selectedMovementItem, setSelectedMovementItem] = useState<any>(null);
  const [movementMode, setMovementMode] = useState<'add' | 'remove'>('remove');
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  // Draft Edit State
  const [windowStart, setWindowStart] = useState<Date>(new Date());
  const [windowEnd, setWindowEnd] = useState<Date>(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [showAddMealSelector, setShowAddMealSelector] = useState(false);

  useEffect(() => {
    getPrimaryStallId().then(sid => {
      setStallId(sid);
      if (batch?.status === 'draft') {
        fetchMeals(sid);
      }
    });
  }, [batch?.status]);

  useEffect(() => {
    if (batch && batch.status === 'draft') {
      const start = parseTimeToDateIST(batch.inventory_date, batch.window_start);
      let end = parseTimeToDateIST(batch.inventory_date, batch.window_end);
      
      // Handle overnight windows
      if (end < start) {
        end.setDate(end.getDate() + 1);
      }
      
      setWindowStart(start);
      setWindowEnd(end);
    }
  }, [batch]);

  const fetchMeals = async (sid: string) => {
    if (!batch) return;
    setIsMealsLoading(true);
    setMealsError(false);
    try {
      const { scheduleId: sid2, meals } = await fetchPublishedMenuMeals(sid, batch.inventory_date);
      setAvailableMeals(meals);
      setScheduleId(sid2);
    } catch (e) {
      setMealsError(true);
    } finally {
      setIsMealsLoading(false);
    }
  };

  const verifyDraftStatus = async (): Promise<boolean> => {
    const { data } = await refetchBatch();
    if (data?.status !== 'draft') {
      Alert.alert('Status Changed', 'This batch is no longer a draft. The screen will be refreshed.');
      return false;
    }
    return true;
  };

  const handleUpdateWindow = async (newStart: Date, newEnd: Date) => {
    if (!(await verifyDraftStatus())) return;
    if (newEnd <= newStart) {
      Alert.alert('Validation Error', 'Window end time must be after the start time.');
      return;
    }
    try {
      await updateDraft({ batchId, windowStart: newStart, windowEnd: newEnd });
    } catch (e: any) {
      Alert.alert('Update Failed', e.message);
    }
  };

  const handleUpdateItemQty = async (itemId: string, newQty: number) => {
    if (!(await verifyDraftStatus())) return;
    if (newQty < 0) return;
    if (newQty === 0) {
      handleRemoveItem(itemId);
      return;
    }
    try {
      await updateDraftItem({ itemId, loadedQuantity: newQty, batchId });
    } catch (e: any) {
      Alert.alert('Update Failed', e.message);
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    if (!(await verifyDraftStatus())) return;
    Alert.alert('Remove Item', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        try {
          await removeDraftItem({ itemId, batchId });
        } catch (e: any) {
          Alert.alert('Remove Failed', e.message);
        }
      }}
    ]);
  };

  const handleAddMeal = async (mealId: string) => {
    if (!(await verifyDraftStatus())) return;
    if (items?.some(i => i.meal_id === mealId)) {
      Alert.alert('Error', 'Meal is already in the batch.');
      return;
    }
    try {
      await addDraftItem({ batchId, mealId, loadedQuantity: 1 });
      setShowAddMealSelector(false);
    } catch (e: any) {
      Alert.alert('Add Failed', e.message);
    }
  };

  const handleEnableMeal = async (mealId: string, mealName: string) => {
    try {
      await enableMeal(mealId);
      Alert.alert('Success', `${mealName} enabled.`);
      queryClient.invalidateQueries({ queryKey: ['mealsPool'] });
      queryClient.invalidateQueries({ queryKey: ['menu'] });
      if (stallId) await fetchMeals(stallId);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const handleRemoveFromMenu = (mealId: string) => {
    Alert.alert('Remove Item', 'Are you sure you want to remove this item from the published menu?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          if (!scheduleId) return;
          try {
            await removeMealFromMenu(scheduleId, mealId);
            Alert.alert('Success', 'Meal removed from published menu.');
            queryClient.invalidateQueries({ queryKey: ['menu'] });
            if (stallId) await fetchMeals(stallId);
          } catch (e: any) {
            Alert.alert('Error', e.message);
          }
        },
      },
    ]);
  };

  if (isBatchLoading) return <ActivityIndicator style={{ flex: 1 }} />;
  if (!batch) return <View style={styles.container}><Text>Batch not found.</Text></View>;

  const isDraft = batch.status === 'draft';
  const isActive = batch.status === 'active';
  const isReadOnly = batch.status === 'closed' || batch.status === 'cancelled';

  // Cross reference draft items
  const invalidItems = items?.filter(item => !availableMeals.some(m => m.id === item.meal_id)) || [];
  const unresolvedMeals = availableMeals.filter(m => !m.is_available);
  const hasInvalidItems = invalidItems.length > 0;
  const hasUnresolvedMeals = unresolvedMeals.length > 0;

  return (
    <View key={batchId} style={[styles.container, { paddingTop: insets.top + Spacing.base, paddingBottom: insets.bottom || Spacing.base }]}>
      <View style={styles.header}>
        <Button variant="ghost" title="Back" onPress={() => router.back()} style={styles.backBtn as any} />
        <View>
          <Text style={styles.screenTitle}>{formatDisplayDate(new Date(batch.inventory_date))}</Text>
          <Text style={styles.subTitle}>Status: {batch.status.toUpperCase()}</Text>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 140 }]}>
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery Window</Text>
          {isDraft ? (
            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: Spacing.xs }}>
                <Text style={styles.label}>Start Time</Text>
                <Button variant="outline" title={windowStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} onPress={() => setShowStartPicker(true)} />
              </View>
              <View style={{ flex: 1, marginLeft: Spacing.xs }}>
                <Text style={styles.label}>End Time</Text>
                <Button variant="outline" title={windowEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} onPress={() => setShowEndPicker(true)} />
              </View>
            </View>
          ) : (
            <Text style={styles.valueText}>
              {formatTimeSlot(batch.window_start)} - {formatTimeSlot(batch.window_end)}
            </Text>
          )}
        </Card>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Items</Text>
          {isDraft && hasInvalidItems && (
            <View style={styles.warningBox}>
              <Text style={styles.warningText}>Warning: Some items in this draft are no longer in the published menu.</Text>
            </View>
          )}
          {isDraft && hasUnresolvedMeals && (
            <View style={[styles.warningBox, { backgroundColor: '#fff5f5', borderColor: Colors.error }]}>
              <Text style={[styles.warningText, { color: Colors.error }]}>Warning: Activation blocked. {hasUnresolvedMeals} published meal(s) are unavailable.</Text>
            </View>
          )}
          {isDraft ? (
            <>
              {items?.map(item => {
                const mealObj = availableMeals.find(m => m.id === item.meal_id);
                const isInvalid = !mealObj;
                const isUnavailable = mealObj && !mealObj.is_available;
                
                return (
                  <View key={item.id} style={[styles.mealRow, (isInvalid || isUnavailable) && styles.invalidMealRow]}>
                    <View style={styles.mealInfo}>
                      <Text style={[styles.mealName, (isInvalid || isUnavailable) && styles.invalidMealText]}>
                        {item.meals?.name} {isUnavailable ? '— unavailable' : ''}
                      </Text>
                      {isInvalid && <Text style={styles.invalidMealSubText}>Not in published menu</Text>}
                      {isUnavailable && (
                        <View style={{ flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xs }}>
                          <TouchableOpacity onPress={() => handleEnableMeal(item.meal_id, item.meals?.name || 'Meal')}>
                             <Text style={styles.enableActionText}>Enable Meal</Text>
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => handleRemoveFromMenu(item.meal_id)}>
                             <Text style={[styles.enableActionText, { color: Colors.error }]}>Remove from Published Menu</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                    <View style={styles.stepper}>
                      <Button variant="outline" title="-" onPress={() => handleUpdateItemQty(item.id, item.loaded_quantity - 1)} disabled={isUnavailable} style={styles.stepBtn as any} />
                      <Text style={styles.qtyText}>{item.loaded_quantity}</Text>
                      <Button variant="outline" title="+" onPress={() => handleUpdateItemQty(item.id, item.loaded_quantity + 1)} disabled={isUnavailable} style={styles.stepBtn as any} />
                    </View>
                  </View>
                );
              })}

              {hasUnresolvedMeals && (
                <View style={{ marginTop: Spacing.xl }}>
                  <Text style={[styles.sectionTitle, { color: Colors.error }]}>Unresolved Published Meals</Text>
                  {unresolvedMeals.map(meal => (
                    <View key={meal.id} style={[styles.mealRow, styles.invalidMealRow]}>
                      <View style={styles.mealInfo}>
                        <Text style={[styles.mealName, {color: Colors.error}]}>
                          {meal.name}
                        </Text>
                        <Text style={styles.mealCategory}>{meal.category}</Text>
                        <View style={{ flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm }}>
                          <Button 
                            title="Enable Meal" 
                            variant="primary" 
                            onPress={() => handleEnableMeal(meal.id, meal.name)} 
                            style={{ paddingHorizontal: 12, paddingVertical: 6, minHeight: 0 } as any}
                            textStyle={{ fontSize: 12 }}
                          />
                          <Button 
                            title="Remove from Menu" 
                            variant="outline" 
                            onPress={() => handleRemoveFromMenu(meal.id)}
                            style={{ paddingHorizontal: 12, paddingVertical: 6, minHeight: 0, borderColor: Colors.error } as any}
                            textStyle={{ fontSize: 12, color: Colors.error }}
                          />
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {!showAddMealSelector ? (
                <Button title="+ Add Meal" variant="outline" onPress={() => setShowAddMealSelector(true)} style={{ marginTop: Spacing.md }} />
              ) : (
                <View style={styles.mealSelector}>
                  <Text style={styles.label}>Select Meal:</Text>
                  {isMealsLoading ? (
                    <Text style={styles.infoText}>Loading meals...</Text>
                  ) : mealsError ? (
                    <Text style={styles.errorText}>Failed to load meals</Text>
                  ) : availableMeals.filter(m => !items?.some(i => i.meal_id === m.id)).length === 0 ? (
                    <Text style={styles.infoText}>No additional eligible meals</Text>
                  ) : (
                    <>
                      {/* Eligible Published Meals */}
                      {availableMeals.filter(m => !items?.some(i => i.meal_id === m.id) && m.is_available).map(meal => (
                        <View key={meal.id} style={styles.mealOptionContainer}>
                          <TouchableOpacity 
                            style={[styles.mealOption, { flex: 1 }]} 
                            onPress={() => handleAddMeal(meal.id)}
                          >
                            <Text style={styles.mealOptionText}>{meal.name}</Text>
                          </TouchableOpacity>
                        </View>
                      ))}

                      {/* Published but unavailable meals */}
                      {availableMeals.filter(m => !items?.some(i => i.meal_id === m.id) && !m.is_available).map(meal => (
                        <View key={meal.id} style={styles.mealOptionContainer}>
                          <TouchableOpacity 
                            style={[styles.mealOption, { opacity: 0.5, flex: 1 }]} 
                            disabled={true}
                          >
                            <Text style={styles.mealOptionText}>{meal.name} — Enable meal</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.enableBtn} onPress={() => handleEnableMeal(meal.id, meal.name)}>
                            <Text style={styles.enableActionText}>Enable</Text>
                          </TouchableOpacity>
                        </View>
                      ))}
                    </>
                  )}
                  <Button title="Cancel" variant="ghost" onPress={() => setShowAddMealSelector(false)} style={{ marginTop: Spacing.sm }} />
                </View>
              )}
            </>
          ) : (
            <View style={{ gap: Spacing.md }}>
              {liveStatus?.map(ls => {
                const isExpanded = expandedItems[ls.inventory_batch_item_id];
                
                // Determine stock status details
                let statusLabel = 'In Stock';
                let statusColor = Colors.success;
                if (ls.customer_available === 0) {
                  statusLabel = 'Sold Out';
                  statusColor = Colors.error;
                } else if (ls.customer_available <= 5) {
                  statusLabel = 'Low Stock';
                  statusColor = Colors.warning;
                }

                return (
                  <Card key={ls.inventory_batch_item_id} style={styles.itemCard}>
                    <View style={styles.cardHeader}>
                      <Text style={styles.cardMealName}>{ls.item_name}</Text>
                      <View style={[styles.statusBadge, { backgroundColor: statusColor + '1A', borderColor: statusColor + '40' }]}>
                        <Text style={[styles.statusText, { color: statusColor }]}>
                          {statusLabel.toUpperCase()}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.cardStatsRow}>
                      <View style={styles.cardStatCol}>
                        <Text style={styles.cardStatVal}>{ls.remaining_physical}</Text>
                        <Text style={styles.cardStatLbl}>Remaining</Text>
                      </View>
                      <View style={styles.cardStatCol}>
                        <Text style={styles.cardStatVal}>{ls.active_reserved}</Text>
                        <Text style={styles.cardStatLbl}>Reserved</Text>
                      </View>
                      <View style={styles.cardStatCol}>
                        <Text style={[styles.cardStatVal, { color: Colors.primary }]}>{ls.customer_available}</Text>
                        <Text style={styles.cardStatLbl}>Available</Text>
                      </View>
                    </View>

                    {isActive && (
                      <View style={styles.cardActions}>
                        <Button 
                          title="Remove Stock" 
                          variant="outline" 
                          onPress={() => {
                            setSelectedMovementItem(ls);
                            setMovementMode('remove');
                            setShowMovement(true);
                          }} 
                          style={styles.cardBtn}
                          textStyle={{ fontSize: Typography.size.sm }}
                        />
                        <Button 
                          title="Add Stock" 
                          variant="outline" 
                          onPress={() => {
                            setSelectedMovementItem(ls);
                            setMovementMode('add');
                            setShowMovement(true);
                          }} 
                          style={styles.cardBtn}
                          textStyle={{ fontSize: Typography.size.sm }}
                        />
                      </View>
                    )}

                    {/* Expandable Details Section */}
                    <TouchableOpacity 
                      style={styles.detailsToggle} 
                      onPress={() => setExpandedItems(prev => ({ ...prev, [ls.inventory_batch_item_id]: !prev[ls.inventory_batch_item_id] }))}
                    >
                      <Text style={styles.detailsToggleText}>
                        {isExpanded ? "Hide Details" : "View Details"}
                      </Text>
                      <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={16} color={Colors.primary} />
                    </TouchableOpacity>

                    {isExpanded && (
                      <View style={styles.detailsContainer}>
                        <View style={styles.detailRow}><Text style={styles.detailLabel}>Initial Loaded</Text><Text style={styles.detailValue}>{ls.loaded_quantity}</Text></View>
                        <View style={styles.detailRow}><Text style={styles.detailLabel}>Manual Additions (Inflows)</Text><Text style={styles.detailValue}>{ls.manual_inflow}</Text></View>
                        <View style={styles.detailRow}><Text style={styles.detailLabel}>Manual Reductions (Outflows)</Text><Text style={styles.detailValue}>{ls.manual_outflow}</Text></View>
                        <View style={styles.detailRow}><Text style={styles.detailLabel}>App Order Reservations</Text><Text style={styles.detailValue}>{ls.active_reserved}</Text></View>
                        <View style={styles.detailRow}><Text style={styles.detailLabel}>Fulfilled App Orders</Text><Text style={styles.detailValue}>{ls.fulfilled}</Text></View>
                        <View style={styles.detailRow}><Text style={styles.detailLabel}>Cancelled App Orders</Text><Text style={styles.detailValue}>{ls.cancelled}</Text></View>
                      </View>
                    )}
                  </Card>
                );
              })}
            </View>
          )}
        </Card>
      </ScrollView>

      {!isReadOnly && (
        <View style={styles.footer}>
          {isDraft && (
            <View style={styles.actionRow}>
              <Button title="Cancel Batch" variant="outline" onPress={() => setShowCancel(true)} style={[styles.flexBtn, { borderColor: Colors.error }] as any} textStyle={{ color: Colors.error }} />
              <Button title="Activate Batch" onPress={() => setShowActivation(true)} style={styles.flexBtn} disabled={hasInvalidItems || hasUnresolvedMeals} />
            </View>
          )}
          {isActive && (
            <View style={styles.actionRow}>
              <Button title="Cancel Batch" variant="outline" onPress={() => setShowCancel(true)} style={[styles.flexBtn, { borderColor: Colors.error }] as any} textStyle={{ color: Colors.error }} />
              <Button title="Close Batch" onPress={() => setShowClose(true)} style={styles.flexBtn} />
            </View>
          )}
        </View>
      )}

      {/* Pickers */}
      {showStartPicker && (
        <DateTimePicker
          value={windowStart} mode="time" display="default"
          onChange={(e, d) => { setShowStartPicker(false); if(d) handleUpdateWindow(d, windowEnd); }}
        />
      )}
      {showEndPicker && (
        <DateTimePicker
          value={windowEnd} mode="time" display="default"
          onChange={(e, d) => { setShowEndPicker(false); if(d) handleUpdateWindow(windowStart, d); }}
        />
      )}

      {/* Modals */}
      <ActivationModal 
        visible={showActivation} 
        onClose={() => setShowActivation(false)} 
        batchId={batchId} 
        items={items} 
        windowStr={`${formatTimeSlot(batch.window_start)} - ${formatTimeSlot(batch.window_end)}`}
        dateStr={formatDisplayDate(new Date(batch.inventory_date))}
      />
      <CloseModal visible={showClose} onClose={() => setShowClose(false)} batchId={batchId} />
      <CancelModal visible={showCancel} onClose={() => setShowCancel(false)} batchId={batchId} />
      <MovementModal 
        visible={showMovement} 
        onClose={() => setShowMovement(false)} 
        batchId={batchId} 
        item={selectedMovementItem} 
        mode={movementMode}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.sm, marginBottom: Spacing.base },
  backBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center', marginRight: Spacing.xs },
  screenTitle: { fontFamily: Typography.family.bold, fontSize: Typography.size.xl, color: Colors.textPrimary },
  subTitle: { fontFamily: Typography.family.medium, fontSize: Typography.size.sm, color: Colors.textSecondary },
  content: { paddingHorizontal: Spacing.base, paddingBottom: Spacing['4xl'] },
  section: { marginBottom: Spacing.lg, padding: Spacing.base },
  sectionTitle: { fontFamily: Typography.family.bold, fontSize: Typography.size.lg, color: Colors.textPrimary, marginBottom: Spacing.base },
  label: { fontFamily: Typography.family.medium, fontSize: Typography.size.sm, color: Colors.textSecondary, marginBottom: Spacing.xs },
  row: { flexDirection: 'row', marginTop: Spacing.base },
  valueText: { fontFamily: Typography.family.semiBold, fontSize: Typography.size.lg, color: Colors.textPrimary },
  mealRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border },
  mealInfo: { flex: 1 },
  mealName: { fontFamily: Typography.family.semiBold, fontSize: Typography.size.base, color: Colors.textPrimary },
  mealCategory: { fontFamily: Typography.family.regular, fontSize: Typography.size.sm, color: Colors.textTertiary, textTransform: 'capitalize' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  stepBtn: { width: 36, height: 36, paddingHorizontal: 0, paddingVertical: 0 },
  qtyText: { fontFamily: Typography.family.bold, fontSize: Typography.size.lg, color: Colors.textPrimary, minWidth: 24, textAlign: 'center' },
  mealSelector: { marginTop: Spacing.md, padding: Spacing.base, backgroundColor: Colors.surface, borderRadius: Radii.md, borderWidth: 1, borderColor: Colors.border },
  mealOption: { paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border },
  mealOptionText: { fontFamily: Typography.family.medium, fontSize: Typography.size.base, color: Colors.primary },
  footer: { padding: Spacing.base, backgroundColor: Colors.surface, borderTopWidth: 1, borderColor: Colors.border },
  actionRow: { flexDirection: 'row', gap: Spacing.sm },
  flexBtn: { flex: 1 },
  warningBox: { backgroundColor: '#fff3cd', padding: Spacing.sm, borderRadius: Radii.sm, marginBottom: Spacing.md, borderWidth: 1, borderColor: '#ffe69c' },
  warningText: { color: '#664d03', fontFamily: Typography.family.medium, fontSize: Typography.size.sm },
  invalidMealRow: { backgroundColor: '#fff5f5' },
  invalidMealText: { color: Colors.error },
  invalidMealSubText: { color: Colors.error, fontSize: Typography.size.xs, fontFamily: Typography.family.regular },
  enableActionText: { color: Colors.primary, fontSize: Typography.size.sm, fontFamily: Typography.family.bold, marginTop: Spacing.xs },
  mealOptionContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: Colors.border },
  enableBtn: { padding: Spacing.sm },
  infoText: { fontFamily: Typography.family.medium, fontSize: Typography.size.sm, color: Colors.textSecondary, fontStyle: 'italic', marginVertical: Spacing.sm },
  errorText: { fontFamily: Typography.family.medium, fontSize: Typography.size.sm, color: Colors.error, marginVertical: Spacing.sm },
  itemCard: { marginBottom: Spacing.md, padding: Spacing.base },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.base },
  cardMealName: { flex: 1, flexWrap: 'wrap', marginRight: Spacing.sm, fontFamily: Typography.family.bold, fontSize: Typography.size.base, color: Colors.textPrimary },
  cardStatsRow: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: Colors.background, paddingVertical: Spacing.sm, borderRadius: Radii.sm, marginBottom: Spacing.md },
  cardStatCol: { alignItems: 'center' },
  cardStatVal: { fontFamily: Typography.family.bold, fontSize: Typography.size.base, color: Colors.textPrimary },
  cardStatLbl: { fontFamily: Typography.family.medium, fontSize: Typography.size.xs, color: Colors.textTertiary, marginTop: 2 },
  cardActions: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm },
  cardBtn: { flex: 1, height: 40 },
  detailsToggle: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: Spacing.xs, paddingVertical: Spacing.xs },
  detailsToggleText: { fontFamily: Typography.family.medium, fontSize: Typography.size.sm, color: Colors.primary },
  detailsContainer: { marginTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: Spacing.sm },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  detailLabel: { fontFamily: Typography.family.regular, fontSize: Typography.size.sm, color: Colors.textSecondary },
  detailValue: { fontFamily: Typography.family.semiBold, fontSize: Typography.size.sm, color: Colors.textPrimary },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radii.full,
    borderWidth: 1,
  },
  statusText: {
    fontFamily: Typography.family.bold,
    fontSize: Typography.size.xs,
  }
});

