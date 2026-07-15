import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { supabase } from '@/src/lib/supabase';

import { Colors, Typography, Spacing, Radii } from '@/src/constants/theme';
import { Button } from '@/src/components/ui/Button';
import { Card } from '@/src/components/ui/Card';
import { Input } from '@/src/components/ui/Input';
import { getKitchenDate, formatDisplayDate, formatDateKey } from '@/src/utils/helpers';
import { useCreateDraftBatch } from '@/src/hooks/useInventory';
import { getPrimaryStallId } from '@/src/services/menu';
import { useOperationalContext } from '@/src/hooks/useOperationalContext';
import { fetchPublishedMenuMeals, formatLocalDate } from '@/src/services/inventory';
import { enableMeal, removeMealFromMenu } from '@/src/services/menu';
import { useQueryClient } from '@tanstack/react-query';

export default function CreateBatchScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  
  const [stallId, setStallId] = useState<string>();
  const { resolvedOperationalDate, isResolving } = useOperationalContext(stallId);
  const [date, setDate] = useState<Date | null>(null);
  
  const [windowStart, setWindowStart] = useState<Date | null>(null);
  const [windowEnd, setWindowEnd] = useState<Date | null>(null);

  useEffect(() => {
    if (!isResolving && resolvedOperationalDate && !date) {
      const d = new Date(resolvedOperationalDate);
      setDate(d);
      
      const start = new Date(d);
      start.setHours(12, 0, 0, 0);
      setWindowStart(start);
      
      const end = new Date(d);
      end.setHours(14, 0, 0, 0);
      setWindowEnd(end);
    }
  }, [resolvedOperationalDate, isResolving, date]);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const [availableMeals, setAvailableMeals] = useState<any[]>([]);
  const [hasPublishedMenu, setHasPublishedMenu] = useState(true);
  const [scheduleId, setScheduleId] = useState<string | undefined>();
  const [isLoadingMeals, setIsLoadingMeals] = useState(true);
  
  // Selected items mapped by mealId -> quantity
  const [selectedItems, setSelectedItems] = useState<Record<string, number>>({});
  const queryClient = useQueryClient();

  const { mutateAsync: createDraft, isPending } = useCreateDraftBatch();

  useEffect(() => {
    getPrimaryStallId().then(id => {
      setStallId(id);
    }).catch(console.error);
  }, []);

  useEffect(() => {
    if (stallId && date) {
      fetchMeals(stallId, date);
    }
  }, [date, stallId]);

  const fetchMeals = async (sid: string, selectedDate: Date) => {
    setIsLoadingMeals(true);
    const { hasPublishedMenu: hasMenu, scheduleId: sid2, meals } = await fetchPublishedMenuMeals(sid, formatLocalDate(selectedDate));
    
    console.log('[Inventory] Published meals fetched', {
      stallId: sid,
      date: formatLocalDate(selectedDate),
      hasMenu,
      count: meals.length
    });
    
    setHasPublishedMenu(hasMenu);
    setScheduleId(sid2);
    setAvailableMeals(meals);
    setIsLoadingMeals(false);
  };

  const handleSave = async () => {
    try {
      const itemsPayload = availableMeals.map(m => {
        if (!m.is_available) return null;
        return { mealId: m.id, loadedQuantity: selectedItems[m.id] || 0 };
      }).filter(Boolean) as { mealId: string; loadedQuantity: number }[];
      
      const hasPositiveQty = itemsPayload.some(i => i.loadedQuantity > 0);

      if (!hasPositiveQty) {
        Alert.alert('Validation Error', 'Please select at least one available meal with a quantity greater than 0.');
        return;
      }

      if (!date || !windowStart || !windowEnd) return;

      if (windowEnd <= windowStart) {
        Alert.alert('Validation Error', 'Window end time must be after the start time.');
        return;
      }

      const batchId = await createDraft({
        date,
        windowStart,
        windowEnd,
        items: itemsPayload,
        stallId,
      });

      router.replace(`/(app)/(inventory)/${batchId}`);
    } catch (error: any) {
      Alert.alert('Error Creating Draft', error.message);
    }
  };

  const updateQuantity = (mealId: string, delta: number) => {
    setSelectedItems(prev => {
      const current = prev[mealId] || 0;
      const next = Math.max(0, current + delta);
      return { ...prev, [mealId]: next };
    });
  };

  const handleEnableMeal = async (mealId: string) => {
    try {
      await enableMeal(mealId);
      Alert.alert('Success', 'Meal enabled successfully.');
      queryClient.invalidateQueries({ queryKey: ['mealsPool'] });
      queryClient.invalidateQueries({ queryKey: ['menu'] });
      if (stallId && date) fetchMeals(stallId, date);
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
            if (stallId && date) fetchMeals(stallId, date);
          } catch (e: any) {
            Alert.alert('Error', e.message);
          }
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + Spacing.base, paddingBottom: insets.bottom || Spacing.base }]}>
      <View style={styles.header}>
        <Button variant="ghost" title="Back" onPress={() => router.back()} style={styles.backBtn} />
        <Text style={styles.screenTitle}>Create Draft Batch</Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 140 }]}>
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery Window</Text>
          
          <Text style={styles.label}>Date</Text>
          <Button variant="outline" title={date ? formatDisplayDate(date) : 'Loading...'} onPress={() => setShowDatePicker(true)} style={styles.pickerBtn} disabled={!date} />
          
          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: Spacing.xs }}>
              <Text style={styles.label}>Start Time</Text>
              <Button variant="outline" title={windowStart ? windowStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Loading...'} onPress={() => setShowStartPicker(true)} style={styles.pickerBtn} disabled={!windowStart} />
            </View>
            <View style={{ flex: 1, marginLeft: Spacing.xs }}>
              <Text style={styles.label}>End Time</Text>
              <Button variant="outline" title={windowEnd ? windowEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Loading...'} onPress={() => setShowEndPicker(true)} style={styles.pickerBtn} disabled={!windowEnd} />
            </View>
          </View>
        </Card>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Initial Loaded Items</Text>
          {isLoadingMeals ? (
            <ActivityIndicator color={Colors.primary} style={{ marginVertical: Spacing.xl }} />
          ) : !hasPublishedMenu ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No menu has been published for this date. Publish the menu before creating inventory.</Text>
            </View>
          ) : availableMeals.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>The published menu contains no items.</Text>
            </View>
          ) : (
            <>
              <View style={styles.summaryBox}>
                <Text style={styles.summaryText}>{availableMeals.length} published meals found.</Text>
                <Text style={styles.summaryText}>{availableMeals.filter(m => m.is_available).length} available.</Text>
                {availableMeals.filter(m => !m.is_available).length > 0 && (
                   <Text style={[styles.summaryText, {color: Colors.error}]}>
                     {availableMeals.filter(m => !m.is_available).length} unresolved: {availableMeals.filter(m => !m.is_available).map(m => m.name).join(', ')}.
                   </Text>
                )}
              </View>
              {availableMeals.filter(m => m.is_available).map(meal => {
                const qty = selectedItems[meal.id] || 0;
                return (
                  <View key={meal.id} style={styles.mealRow}>
                    <View style={styles.mealInfo}>
                      <Text style={styles.mealName}>
                        {meal.name}
                      </Text>
                      <Text style={styles.mealCategory}>{meal.category}</Text>
                    </View>
                    <View style={styles.stepper}>
                      <Button variant="outline" title="-" onPress={() => updateQuantity(meal.id, -1)} disabled={qty === 0} style={styles.stepBtn as any} />
                      <Text style={styles.qtyText}>{qty}</Text>
                      <Button variant="outline" title="+" onPress={() => updateQuantity(meal.id, 1)} style={styles.stepBtn as any} />
                    </View>
                  </View>
                );
              })}
              
              {availableMeals.filter(m => !m.is_available).length > 0 && (
                <View style={{ marginTop: Spacing.xl }}>
                  <Text style={[styles.sectionTitle, { color: Colors.error }]}>Published but unavailable</Text>
                  {availableMeals.filter(m => !m.is_available).map(meal => (
                    <View key={meal.id} style={[styles.mealRow, styles.unavailableRow]}>
                      <View style={styles.mealInfo}>
                        <Text style={[styles.mealName, {color: Colors.error}]}>
                          {meal.name}
                        </Text>
                        <Text style={styles.mealCategory}>{meal.category}</Text>
                        <View style={{ flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm }}>
                          <Button 
                            title="Enable Meal" 
                            variant="primary" 
                            onPress={() => handleEnableMeal(meal.id)} 
                            style={{ paddingHorizontal: 12, paddingVertical: 6, minHeight: 0 }}
                            textStyle={{ fontSize: 12 }}
                          />
                          <Button 
                            title="Remove from Published Menu" 
                            variant="outline" 
                            onPress={() => handleRemoveFromMenu(meal.id)}
                            style={{ paddingHorizontal: 12, paddingVertical: 6, minHeight: 0, borderColor: Colors.error }}
                            textStyle={{ fontSize: 12, color: Colors.error }}
                          />
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </>
          )}
        </Card>
      </ScrollView>

      <View style={styles.footer}>
        <Button 
          title={isPending ? "Creating..." : "Save Draft"} 
          onPress={handleSave} 
          disabled={isPending || isLoadingMeals || !hasPublishedMenu || availableMeals.length === 0}
          fullWidth
        />
      </View>

      {showDatePicker && date && (
        <DateTimePicker
          value={date} mode="date" display="default"
          onChange={(e, d) => { setShowDatePicker(false); if(d) { setDate(d); setSelectedItems({}); } }}
        />
      )}
      {showStartPicker && windowStart && (
        <DateTimePicker
          value={windowStart} mode="time" display="default"
          onChange={(e, d) => { setShowStartPicker(false); if(d) { const nd = new Date(windowStart); nd.setHours(d.getHours(), d.getMinutes()); setWindowStart(nd); } }}
        />
      )}
      {showEndPicker && windowEnd && (
        <DateTimePicker
          value={windowEnd} mode="time" display="default"
          onChange={(e, d) => { setShowEndPicker(false); if(d) { const nd = new Date(windowEnd); nd.setHours(d.getHours(), d.getMinutes()); setWindowEnd(nd); } }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.sm, marginBottom: Spacing.base },
  backBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center', marginRight: Spacing.xs },
  screenTitle: { fontFamily: Typography.family.bold, fontSize: Typography.size.xl, color: Colors.textPrimary },
  content: { paddingHorizontal: Spacing.base, paddingBottom: Spacing['4xl'] },
  section: { marginBottom: Spacing.lg, padding: Spacing.base },
  sectionTitle: { fontFamily: Typography.family.bold, fontSize: Typography.size.lg, color: Colors.textPrimary, marginBottom: Spacing.base },
  label: { fontFamily: Typography.family.medium, fontSize: Typography.size.sm, color: Colors.textSecondary, marginBottom: Spacing.xs },
  row: { flexDirection: 'row', marginTop: Spacing.base },
  pickerBtn: { justifyContent: 'flex-start' },
  mealRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border },
  mealInfo: { flex: 1 },
  mealName: { fontFamily: Typography.family.semiBold, fontSize: Typography.size.base, color: Colors.textPrimary },
  mealCategory: { fontFamily: Typography.family.regular, fontSize: Typography.size.sm, color: Colors.textTertiary, textTransform: 'capitalize' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  stepBtn: { width: 36, height: 36, paddingHorizontal: 0, paddingVertical: 0 },
  qtyText: { fontFamily: Typography.family.bold, fontSize: Typography.size.lg, color: Colors.textPrimary, minWidth: 24, textAlign: 'center' },
  footer: { padding: Spacing.base, backgroundColor: Colors.surface, borderTopWidth: 1, borderColor: Colors.border },
  emptyState: { padding: Spacing.xl, alignItems: 'center', justifyContent: 'center' },
  emptyStateText: { fontFamily: Typography.family.medium, fontSize: Typography.size.base, color: Colors.textSecondary, textAlign: 'center', fontStyle: 'italic' },
  summaryBox: { padding: Spacing.sm, backgroundColor: Colors.surface, borderRadius: Radii.sm, marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  summaryText: { fontFamily: Typography.family.medium, fontSize: Typography.size.sm, color: Colors.textPrimary },
  unavailableRow: { backgroundColor: '#fff5f5' }
});
