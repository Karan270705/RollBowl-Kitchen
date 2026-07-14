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
import { formatDisplayDate } from '@/src/utils/helpers';
import { fetchPublishedMenuMeals } from '@/src/services/inventory';
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
  const [availableMeals, setAvailableMeals] = useState<any[]>([]);

  // Modals
  const [showActivation, setShowActivation] = useState(false);
  const [showClose, setShowClose] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [showMovement, setShowMovement] = useState(false);
  const [selectedMovementItem, setSelectedMovementItem] = useState<any>(null);

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
      setWindowStart(new Date(batch.window_start));
      setWindowEnd(new Date(batch.window_end));
    }
  }, [batch]);

  const fetchMeals = async (sid: string) => {
    if (!batch) return;
    const { meals } = await fetchPublishedMenuMeals(sid, batch.inventory_date);
    setAvailableMeals(meals);
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

  if (isBatchLoading) return <ActivityIndicator style={{ flex: 1 }} />;
  if (!batch) return <View style={styles.container}><Text>Batch not found.</Text></View>;

  const isDraft = batch.status === 'draft';
  const isActive = batch.status === 'active';
  const isReadOnly = batch.status === 'closed' || batch.status === 'cancelled';

  // Cross reference draft items
  const invalidItems = items?.filter(item => !availableMeals.some(m => m.id === item.meal_id)) || [];
  const hasInvalidItems = invalidItems.length > 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top + Spacing.base, paddingBottom: insets.bottom || Spacing.base }]}>
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
              {new Date(batch.window_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(batch.window_end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
          {isDraft ? (
            <>
              {items?.map(item => {
                const isInvalid = !availableMeals.some(m => m.id === item.meal_id);
                return (
                  <View key={item.id} style={[styles.mealRow, isInvalid && styles.invalidMealRow]}>
                    <View style={styles.mealInfo}>
                      <Text style={[styles.mealName, isInvalid && styles.invalidMealText]}>{item.meals?.name}</Text>
                      {isInvalid && <Text style={styles.invalidMealSubText}>Not in published menu</Text>}
                    </View>
                    <View style={styles.stepper}>
                      <Button variant="outline" title="-" onPress={() => handleUpdateItemQty(item.id, item.loaded_quantity - 1)} style={styles.stepBtn as any} />
                      <Text style={styles.qtyText}>{item.loaded_quantity}</Text>
                      <Button variant="outline" title="+" onPress={() => handleUpdateItemQty(item.id, item.loaded_quantity + 1)} style={styles.stepBtn as any} />
                    </View>
                  </View>
                );
              })}
              {!showAddMealSelector ? (
                <Button title="+ Add Meal" variant="outline" onPress={() => setShowAddMealSelector(true)} style={{ marginTop: Spacing.md }} />
              ) : (
                <View style={styles.mealSelector}>
                  <Text style={styles.label}>Select Meal:</Text>
                  {availableMeals.filter(m => !items?.some(i => i.meal_id === m.id)).map(meal => (
                    <TouchableOpacity key={meal.id} style={styles.mealOption} onPress={() => handleAddMeal(meal.id)}>
                      <Text style={styles.mealOptionText}>{meal.name}</Text>
                    </TouchableOpacity>
                  ))}
                  <Button title="Cancel" variant="ghost" onPress={() => setShowAddMealSelector(false)} />
                </View>
              )}
            </>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View>
                <View style={styles.gridHeaderRow}>
                  <Text style={[styles.gridCell, styles.gridHeaderCell, { width: 120 }]}>Item</Text>
                  <Text style={[styles.gridCell, styles.gridHeaderCell]}>Loaded</Text>
                  <Text style={[styles.gridCell, styles.gridHeaderCell]}>Added</Text>
                  <Text style={[styles.gridCell, styles.gridHeaderCell]}>Reserved</Text>
                  <Text style={[styles.gridCell, styles.gridHeaderCell]}>Fulfilled</Text>
                  <Text style={[styles.gridCell, styles.gridHeaderCell]}>Physical</Text>
                  <Text style={[styles.gridCell, styles.gridHeaderCell]}>Extra</Text>
                  <Text style={[styles.gridCell, styles.gridHeaderCell]}>Customer</Text>
                  {isActive && <Text style={[styles.gridCell, styles.gridHeaderCell]}>Actions</Text>}
                </View>
                {liveStatus?.map(ls => (
                  <View key={ls.inventory_batch_item_id} style={styles.gridRow}>
                    <Text style={[styles.gridCell, { width: 120 }]} numberOfLines={1}>{ls.item_name}</Text>
                    <Text style={styles.gridCell}>{ls.loaded_quantity}</Text>
                    <Text style={styles.gridCell}>{ls.manual_inflow}</Text>
                    <Text style={styles.gridCell}>{ls.active_reserved}</Text>
                    <Text style={styles.gridCell}>{ls.fulfilled}</Text>
                    <Text style={[styles.gridCell, { fontFamily: Typography.family.bold }]}>{ls.remaining_physical}</Text>
                    <Text style={styles.gridCell}>{ls.extra_available}</Text>
                    <Text style={styles.gridCell}>{ls.customer_available}</Text>
                    {isActive && (
                      <View style={[styles.gridCell, { justifyContent: 'center' }]}>
                        <Button 
                          title="Record" 
                          variant="outline" 
                          onPress={() => {
                            setSelectedMovementItem(ls);
                            setShowMovement(true);
                          }} 
                          style={{ paddingHorizontal: Spacing.sm, paddingVertical: 4, height: 'auto' }}
                          textStyle={{ fontSize: Typography.size.xs }}
                        />
                      </View>
                    )}
                  </View>
                ))}
              </View>
            </ScrollView>
          )}
        </Card>
      </ScrollView>

      {!isReadOnly && (
        <View style={styles.footer}>
          {isDraft && (
            <View style={styles.actionRow}>
              <Button title="Cancel Batch" variant="outline" onPress={() => setShowCancel(true)} style={[styles.flexBtn, { borderColor: Colors.error }] as any} textStyle={{ color: Colors.error }} />
              <Button title="Activate Batch" onPress={() => setShowActivation(true)} style={styles.flexBtn} disabled={hasInvalidItems} />
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
        windowStr={`${windowStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${windowEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
        dateStr={formatDisplayDate(new Date(batch.inventory_date))}
      />
      <CloseModal visible={showClose} onClose={() => setShowClose(false)} batchId={batchId} />
      <CancelModal visible={showCancel} onClose={() => setShowCancel(false)} batchId={batchId} />
      <MovementModal visible={showMovement} onClose={() => setShowMovement(false)} batchId={batchId} item={selectedMovementItem} />
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
  stepper: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  stepBtn: { width: 36, height: 36, paddingHorizontal: 0, paddingVertical: 0 },
  qtyText: { fontFamily: Typography.family.bold, fontSize: Typography.size.lg, color: Colors.textPrimary, minWidth: 24, textAlign: 'center' },
  mealSelector: { marginTop: Spacing.md, padding: Spacing.base, backgroundColor: Colors.surface, borderRadius: Radii.md, borderWidth: 1, borderColor: Colors.border },
  mealOption: { paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border },
  mealOptionText: { fontFamily: Typography.family.medium, fontSize: Typography.size.base, color: Colors.primary },
  gridHeaderRow: { flexDirection: 'row', borderBottomWidth: 2, borderBottomColor: Colors.border, paddingBottom: Spacing.xs, marginBottom: Spacing.xs },
  gridRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: Colors.border, paddingVertical: Spacing.xs, alignItems: 'center' },
  gridCell: { width: 80, fontFamily: Typography.family.regular, fontSize: Typography.size.sm, color: Colors.textPrimary, textAlign: 'center' },
  gridHeaderCell: { fontFamily: Typography.family.bold, color: Colors.textSecondary },
  footer: { padding: Spacing.base, backgroundColor: Colors.surface, borderTopWidth: 1, borderColor: Colors.border },
  actionRow: { flexDirection: 'row', gap: Spacing.sm },
  flexBtn: { flex: 1 },
  warningBox: { backgroundColor: '#fff3cd', padding: Spacing.sm, borderRadius: Radii.sm, marginBottom: Spacing.md, borderWidth: 1, borderColor: '#ffe69c' },
  warningText: { color: '#664d03', fontFamily: Typography.family.medium, fontSize: Typography.size.sm },
  invalidMealRow: { backgroundColor: '#fff5f5' },
  invalidMealText: { color: Colors.error },
  invalidMealSubText: { color: Colors.error, fontSize: Typography.size.xs, fontFamily: Typography.family.regular }
});
